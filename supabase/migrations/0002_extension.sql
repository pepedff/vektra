-- Extensão (produto único), dispositivos, versões e revenda por aprovação.

alter table public.licenses
  add column reserved_email text check (reserved_email is null or reserved_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$');
create unique index licenses_reserved_email_uidx
  on public.licenses (reserved_email)
  where reserved_email is not null and status <> 'revogada';

create type public.version_status as enum ('rascunho', 'publicada', 'arquivada');
create type public.request_status as enum ('pendente', 'aprovada', 'recusada');

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  license_id uuid references public.licenses (id) on delete set null,
  fingerprint text not null check (char_length(fingerprint) between 8 and 128),
  name text check (char_length(name) <= 80),
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);
create index devices_user_idx on public.devices (user_id, last_seen_at desc);

create table public.extension_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  name text not null check (char_length(name) between 2 and 80),
  changelog text not null check (char_length(changelog) between 4 and 2000),
  status public.version_status not null default 'rascunho',
  mandatory boolean not null default false,
  storage_path text,
  file_name text,
  file_size bigint check (file_size is null or file_size > 0),
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.download_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  version_id uuid not null references public.extension_versions (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index download_events_created_idx on public.download_events (created_at desc);

create table public.extension_settings (
  id text primary key default 'global' check (id = 'global'),
  branding jsonb not null default '{}',
  ai jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.extension_settings (id) values ('global');

create table public.reseller_permissions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  create_customers boolean not null default true,
  create_licenses boolean not null default true,
  renew_licenses boolean not null default false,
  suspend_licenses boolean not null default false,
  view_sales boolean not null default true,
  own_brand boolean not null default false,
  customize boolean not null default false,
  create_coupons boolean not null default false,
  branding_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.reseller_branding (
  reseller_id uuid primary key references public.profiles (id) on delete cascade,
  branding jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.reseller_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 10 and 500),
  status public.request_status not null default 'pendente',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index reseller_requests_pending_uidx
  on public.reseller_requests (user_id) where status = 'pendente';

-- =====================================================================
create function public.has_active_license(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.licenses
    where owner_id = p_user and status <> 'revogada' and expires_at > now()
  );
$$;

create function public.is_reseller() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'reseller' and status = 'ativo'
  );
$$;

create function public.require_reseller_perm(p_flag text) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ok boolean := false;
begin
  if public.is_admin() then return; end if;
  if not public.is_reseller() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select case p_flag
    when 'create_customers' then create_customers
    when 'create_licenses' then create_licenses
    when 'renew_licenses' then renew_licenses
    when 'suspend_licenses' then suspend_licenses
    when 'view_sales' then view_sales
    when 'own_brand' then own_brand
    when 'customize' then customize
    when 'create_coupons' then create_coupons
    else false
  end into v_ok
  from public.reseller_permissions where user_id = auth.uid();
  if not coalesce(v_ok, false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ref uuid;
begin
  select id into v_ref from public.profiles
  where referral_code = upper(nullif(trim(new.raw_user_meta_data ->> 'ref'), ''));

  insert into public.profiles (id, email, full_name, referral_code, referred_by)
  values (
    new.id,
    new.email,
    coalesce(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''),
    public.random_code(8),
    v_ref
  );

  insert into public.licenses (key, owner_id, plan_id, status, expires_at)
  select public.gen_license_key(), new.id, p.id, 'teste', now() + interval '3 days'
  from public.plans p where p.id = 'starter';

  update public.licenses
  set owner_id = new.id, reserved_email = null
  where reserved_email = lower(new.email) and status <> 'revogada';

  return new;
end;
$$;

create function public.request_reseller(p_message text) returns public.reseller_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_row public.reseller_requests;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.role in ('reseller', 'admin') then
    raise exception 'already_reseller' using errcode = '22023';
  end if;
  if exists (select 1 from public.reseller_requests where user_id = v_uid and status = 'pendente') then
    raise exception 'already_pending' using errcode = '22023';
  end if;
  insert into public.reseller_requests (user_id, message)
  values (v_uid, left(trim(p_message), 500))
  returning * into v_row;
  perform public.log_event('info', 'Pedido de revenda enviado', jsonb_build_object('request_id', v_row.id));
  return v_row;
end;
$$;

create function public.review_reseller_request(p_id uuid, p_approve boolean, p_perms jsonb)
returns public.reseller_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.reseller_requests;
begin
  perform public.require_admin();
  select * into v_row from public.reseller_requests where id = p_id for update;
  if not found or v_row.status <> 'pendente' then
    raise exception 'request_not_reviewable' using errcode = '22023';
  end if;

  if p_approve then
    update public.profiles set role = 'reseller' where id = v_row.user_id and role = 'client';
    insert into public.reseller_permissions as rp (
      user_id, create_customers, create_licenses, renew_licenses, suspend_licenses,
      view_sales, own_brand, customize, create_coupons, branding_fields
    ) values (
      v_row.user_id,
      coalesce((p_perms ->> 'create_customers')::boolean, true),
      coalesce((p_perms ->> 'create_licenses')::boolean, true),
      coalesce((p_perms ->> 'renew_licenses')::boolean, false),
      coalesce((p_perms ->> 'suspend_licenses')::boolean, false),
      coalesce((p_perms ->> 'view_sales')::boolean, true),
      coalesce((p_perms ->> 'own_brand')::boolean, false),
      coalesce((p_perms ->> 'customize')::boolean, false),
      coalesce((p_perms ->> 'create_coupons')::boolean, false),
      coalesce(array(select jsonb_array_elements_text(p_perms -> 'branding_fields')), '{}')
    )
    on conflict (user_id) do update set
      create_customers = excluded.create_customers,
      create_licenses = excluded.create_licenses,
      renew_licenses = excluded.renew_licenses,
      suspend_licenses = excluded.suspend_licenses,
      view_sales = excluded.view_sales,
      own_brand = excluded.own_brand,
      customize = excluded.customize,
      create_coupons = excluded.create_coupons,
      branding_fields = excluded.branding_fields;
    update public.reseller_requests
    set status = 'aprovada', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id returning * into v_row;
    perform public.notify_user(v_row.user_id, 'Revenda liberada', 'Sua conta agora pode revender a extensão.', 'success');
  else
    update public.reseller_requests
    set status = 'recusada', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id returning * into v_row;
  end if;
  perform public.log_event('info', format('Pedido de revenda %s', v_row.status), jsonb_build_object('request_id', p_id));
  return v_row;
end;
$$;

create function public.set_reseller_permissions(p_user_id uuid, p_perms jsonb)
returns public.reseller_permissions
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.reseller_permissions;
begin
  perform public.require_admin();
  update public.reseller_permissions
  set
    create_customers = coalesce((p_perms ->> 'create_customers')::boolean, create_customers),
    create_licenses = coalesce((p_perms ->> 'create_licenses')::boolean, create_licenses),
    renew_licenses = coalesce((p_perms ->> 'renew_licenses')::boolean, renew_licenses),
    suspend_licenses = coalesce((p_perms ->> 'suspend_licenses')::boolean, suspend_licenses),
    view_sales = coalesce((p_perms ->> 'view_sales')::boolean, view_sales),
    own_brand = coalesce((p_perms ->> 'own_brand')::boolean, own_brand),
    customize = coalesce((p_perms ->> 'customize')::boolean, customize),
    create_coupons = coalesce((p_perms ->> 'create_coupons')::boolean, create_coupons),
    branding_fields = coalesce(array(select jsonb_array_elements_text(p_perms -> 'branding_fields')), branding_fields)
  where user_id = p_user_id
  returning * into v_row;
  if not found then raise exception 'customer_not_found' using errcode = 'P0002'; end if;
  return v_row;
end;
$$;

create function public.create_reserved_license(p_email text, p_plan_id text, p_days integer)
returns public.licenses
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_plan public.plans;
  v_row public.licenses;
begin
  perform public.require_reseller_perm('create_licenses');
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  if v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  select * into v_plan from public.plans where id = p_plan_id and active;
  if not found then raise exception 'plan_not_found' using errcode = 'P0002'; end if;

  insert into public.licenses (key, owner_id, reseller_id, plan_id, status, expires_at, reserved_email)
  values (
    public.gen_license_key(),
    auth.uid(),
    case when public.is_reseller() then auth.uid() else null end,
    v_plan.id,
    'ativo',
    now() + make_interval(days => p_days),
    v_email
  ) returning * into v_row;
  perform public.log_event('info', 'Licença reservada por e-mail', jsonb_build_object('email', v_email, 'license_id', v_row.id));
  return v_row;
end;
$$;

create function public.save_extension_version(
  p_id uuid, p_version text, p_name text, p_changelog text, p_mandatory boolean,
  p_storage_path text, p_file_name text
) returns public.extension_versions
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.extension_versions;
begin
  perform public.require_admin();
  if p_id is null then
    insert into public.extension_versions (version, name, changelog, mandatory, storage_path, file_name, created_by)
    values (p_version, p_name, p_changelog, coalesce(p_mandatory, false), nullif(p_storage_path, ''), nullif(p_file_name, ''), auth.uid())
    returning * into v_row;
  else
    update public.extension_versions
    set version = p_version, name = p_name, changelog = p_changelog, mandatory = coalesce(p_mandatory, mandatory),
        storage_path = coalesce(nullif(p_storage_path, ''), storage_path),
        file_name = coalesce(nullif(p_file_name, ''), file_name)
    where id = p_id and status = 'rascunho'
    returning * into v_row;
    if not found then raise exception 'version_not_editable' using errcode = '22023'; end if;
  end if;
  return v_row;
end;
$$;

create function public.publish_extension_version(p_id uuid) returns public.extension_versions
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.extension_versions;
begin
  perform public.require_admin();
  select * into v_row from public.extension_versions where id = p_id for update;
  if not found then raise exception 'version_not_found' using errcode = 'P0002'; end if;
  if coalesce(v_row.storage_path, '') = '' then
    raise exception 'version_file_required' using errcode = '22023';
  end if;
  update public.extension_versions set status = 'arquivada' where status = 'publicada' and id <> p_id;
  update public.extension_versions
  set status = 'publicada', published_at = now()
  where id = p_id
  returning * into v_row;
  perform public.log_event('info', format('Versão %s publicada', v_row.version), jsonb_build_object('version_id', p_id));
  return v_row;
end;
$$;

create function public.latest_published_version()
returns setof public.extension_versions
language sql stable security definer set search_path = '' as $$
  select * from public.extension_versions
  where status = 'publicada'
  order by published_at desc
  limit 1;
$$;

create function public.request_extension_download() returns public.extension_versions
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_row public.extension_versions;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.has_active_license(v_uid) then
    raise exception 'license_required' using errcode = '42501';
  end if;
  select * into v_row from public.latest_published_version();
  if not found then raise exception 'extension_unavailable' using errcode = 'P0002'; end if;
  insert into public.download_events (user_id, version_id) values (v_uid, v_row.id);
  return v_row;
end;
$$;

create function public.save_extension_settings(p_branding jsonb, p_ai jsonb)
returns public.extension_settings
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.extension_settings;
begin
  perform public.require_admin();
  update public.extension_settings
  set branding = coalesce(p_branding, branding), ai = coalesce(p_ai, ai), updated_at = now()
  where id = 'global'
  returning * into v_row;
  return v_row;
end;
$$;

create function public.save_reseller_branding(p_branding jsonb)
returns public.reseller_branding
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.reseller_branding;
begin
  perform public.require_reseller_perm('own_brand');
  insert into public.reseller_branding (reseller_id, branding)
  values (auth.uid(), coalesce(p_branding, '{}'))
  on conflict (reseller_id) do update set branding = excluded.branding, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

create function public.register_device(p_fingerprint text, p_name text, p_license_id uuid, p_user_agent text)
returns public.devices
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_row public.devices;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.has_active_license(v_uid) then
    raise exception 'license_required' using errcode = '42501';
  end if;
  insert into public.devices (user_id, license_id, fingerprint, name, user_agent)
  values (v_uid, p_license_id, left(trim(p_fingerprint), 128), nullif(left(trim(p_name), 80), ''), left(coalesce(p_user_agent, ''), 300))
  on conflict (user_id, fingerprint) do update
    set last_seen_at = now(),
        name = coalesce(excluded.name, public.devices.name),
        license_id = coalesce(excluded.license_id, public.devices.license_id),
        user_agent = coalesce(nullif(excluded.user_agent, ''), public.devices.user_agent)
  returning * into v_row;
  return v_row;
end;
$$;

-- =====================================================================
alter table public.devices enable row level security;
alter table public.extension_versions enable row level security;
alter table public.download_events enable row level security;
alter table public.extension_settings enable row level security;
alter table public.reseller_permissions enable row level security;
alter table public.reseller_branding enable row level security;
alter table public.reseller_requests enable row level security;

create policy devices_select on public.devices for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy versions_select on public.extension_versions for select to authenticated
  using (status <> 'rascunho' or public.is_admin());
create policy downloads_select on public.download_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy settings_select on public.extension_settings for select to authenticated using (true);
create policy perms_select on public.reseller_permissions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy rbrand_select on public.reseller_branding for select to authenticated
  using (reseller_id = auth.uid() or public.is_admin());
create policy rreq_select on public.reseller_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.devices, public.extension_versions, public.download_events,
  public.extension_settings, public.reseller_permissions, public.reseller_branding, public.reseller_requests
  from authenticated;
revoke all on all tables in schema public from anon;
grant select on public.plans to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('extension-releases', 'extension-releases', false, 52428800, array['application/zip', 'application/x-zip-compressed'])
on conflict (id) do nothing;

drop policy if exists ext_read on storage.objects;
drop policy if exists ext_write on storage.objects;
drop policy if exists ext_update on storage.objects;
drop policy if exists ext_delete on storage.objects;
create policy ext_read on storage.objects for select to authenticated
  using (bucket_id = 'extension-releases' and (public.is_admin() or public.has_active_license(auth.uid())));
create policy ext_write on storage.objects for insert to authenticated
  with check (bucket_id = 'extension-releases' and public.is_admin());
create policy ext_update on storage.objects for update to authenticated
  using (bucket_id = 'extension-releases' and public.is_admin());
create policy ext_delete on storage.objects for delete to authenticated
  using (bucket_id = 'extension-releases' and public.is_admin());

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_admin(),
  public.is_reseller(),
  public.has_active_license(uuid),
  public.can_see_notification(public.audience, jsonb),
  public.my_notifications(integer),
  public.check_coupon(text),
  public.create_order(text, integer, text),
  public.mark_order_paid(uuid),
  public.revoke_license(uuid),
  public.transfer_license(uuid, text),
  public.record_login(text, text),
  public.request_payout(),
  public.my_affiliate_summary(),
  public.my_referrals(),
  public.confirm_order(uuid),
  public.reject_order(uuid, text),
  public.refund_order(uuid),
  public.issue_license(uuid, text, integer, integer),
  public.extend_license(uuid, integer),
  public.set_customer_status(uuid, public.profile_status),
  public.admin_update_profile(uuid, text, public.app_role),
  public.delete_customer(uuid),
  public.notification_reach(public.audience, jsonb),
  public.send_notification(text, text, public.notification_type, public.audience, jsonb, boolean),
  public.admin_metrics(),
  public.revenue_series(text),
  public.top_plans(),
  public.admin_partners(text),
  public.request_reseller(text),
  public.review_reseller_request(uuid, boolean, jsonb),
  public.set_reseller_permissions(uuid, jsonb),
  public.create_reserved_license(text, text, integer),
  public.save_extension_version(uuid, text, text, text, boolean, text, text),
  public.publish_extension_version(uuid),
  public.latest_published_version(),
  public.request_extension_download(),
  public.save_extension_settings(jsonb, jsonb),
  public.save_reseller_branding(jsonb),
  public.register_device(text, text, uuid, text)
to authenticated;
