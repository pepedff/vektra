-- Vektra: schema inicial
-- Todas as escritas privilegiadas passam por funções SECURITY DEFINER que conferem o papel do usuário.
-- Nenhuma função usa search_path implícito (search_path = '').

-- =====================================================================
-- Tipos
-- =====================================================================
create type public.app_role as enum ('client', 'admin', 'reseller');
create type public.profile_status as enum ('ativo', 'suspenso');
create type public.order_status as enum ('pendente', 'aguardando', 'pago', 'recusado', 'reembolsado', 'expirado');
create type public.license_status as enum ('ativo', 'teste', 'revogada');
create type public.notification_type as enum ('info', 'success', 'warning', 'error');
create type public.audience as enum ('todos', 'especificos', 'plano', 'ativos', 'expirados');
create type public.log_level as enum ('info', 'warn', 'error');

-- =====================================================================
-- Tabelas
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 30),
  pix_key text check (char_length(pix_key) <= 120),
  role public.app_role not null default 'client',
  status public.profile_status not null default 'ativo',
  referral_code text not null unique,
  referred_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index profiles_referred_by_idx on public.profiles (referred_by);

create table public.plans (
  id text primary key,
  name text not null,
  description text not null,
  price_cents integer not null check (price_cents > 0),
  credits text not null,
  features text[] not null default '{}',
  max_licenses integer not null check (max_licenses > 0),
  duration_days integer not null default 30 check (duration_days > 0),
  highlight boolean not null default false,
  sort integer not null default 0,
  active boolean not null default true
);

create table public.coupons (
  code text primary key check (code ~ '^[A-Z0-9]{4,16}$'),
  percent_off integer check (percent_off between 1 and 100),
  amount_off_cents integer check (amount_off_cents > 0),
  max_uses integer not null check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off_cents is null))
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  quantity integer not null default 1 check (quantity between 1 and 100),
  unit_price_cents integer not null check (unit_price_cents > 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  amount_cents integer not null check (amount_cents > 0),
  coupon_code text references public.coupons (code) on delete set null,
  status public.order_status not null default 'pendente',
  pix_txid text not null unique check (pix_txid ~ '^[A-Za-z0-9]{1,25}$'),
  reject_reason text check (char_length(reject_reason) <= 300),
  created_at timestamptz not null default now(),
  marked_paid_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  reseller_id uuid references public.profiles (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  plan_id text not null references public.plans (id),
  status public.license_status not null default 'ativo',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index licenses_owner_idx on public.licenses (owner_id);
create index licenses_reseller_idx on public.licenses (reseller_id);
create index licenses_order_idx on public.licenses (order_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 60),
  message text not null check (char_length(message) between 5 and 180),
  type public.notification_type not null default 'info',
  audience public.audience not null default 'todos',
  audience_detail jsonb not null default '{}',
  pinned boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index notifications_created_idx on public.notifications (created_at desc);

create table public.notification_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  seen_at timestamptz not null default now(),
  dismissed_at timestamptz,
  primary key (user_id, notification_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  level public.log_level not null default 'info',
  event text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_agent text,
  ip text,
  created_at timestamptz not null default now()
);
create index login_events_created_idx on public.login_events (created_at desc);

-- =====================================================================
-- Funções auxiliares (internas)
-- =====================================================================
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'ativo'
  );
$$;

create function public.random_code(p_len integer) returns text
language sql volatile set search_path = '' as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, p_len));
$$;

create function public.gen_license_key() returns text
language sql volatile set search_path = '' as $$
  select 'VKT-' || substr(k, 1, 4) || '-' || substr(k, 5, 4) || '-' || substr(k, 9, 4)
  from (select public.random_code(12) as k) s;
$$;

create function public.log_event(p_level public.log_level, p_event text, p_meta jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (level, event, actor_id, meta)
  values (p_level, left(p_event, 300), auth.uid(), coalesce(p_meta, '{}'));
$$;

create function public.notify_user(p_user_id uuid, p_title text, p_message text, p_type public.notification_type)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (title, message, type, audience, audience_detail, created_by)
  values (left(p_title, 60), left(p_message, 180), p_type, 'especificos',
          jsonb_build_object('user_ids', jsonb_build_array(p_user_id)), auth.uid());
$$;

create function public.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- =====================================================================
-- Cadastro: cria o perfil ao registrar usuário
-- =====================================================================
create function public.handle_new_user() returns trigger
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

  -- Teste grátis: 3 dias do plano de entrada.
  insert into public.licenses (key, owner_id, plan_id, status, expires_at)
  select public.gen_license_key(), new.id, p.id, 'teste', now() + interval '3 days'
  from public.plans p where p.id = 'starter';
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Cliente: pedidos e licenças
-- =====================================================================
create function public.check_coupon(p_code text)
returns table (code text, percent_off integer, amount_off_cents integer)
language sql stable security definer set search_path = '' as $$
  select c.code, c.percent_off, c.amount_off_cents
  from public.coupons c
  where c.code = upper(trim(p_code)) and c.active and c.expires_at > now() and c.uses < c.max_uses
    and auth.uid() is not null;
$$;

create function public.create_order(p_plan_id text, p_quantity integer default 1, p_coupon text default null)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_plan public.plans;
  v_coupon public.coupons;
  v_unit integer;
  v_subtotal integer;
  v_discount integer := 0;
  v_order public.orders;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.status is distinct from 'ativo' then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  if p_quantity > 1 and v_profile.role not in ('reseller', 'admin') then
    raise exception 'quantity_requires_reseller' using errcode = '42501';
  end if;

  if (select count(*) from public.orders
      where user_id = v_uid and status = 'pendente' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_pending_orders' using errcode = '54000';
  end if;

  select * into v_plan from public.plans where id = p_plan_id and active;
  if not found then
    raise exception 'plan_not_found' using errcode = 'P0002';
  end if;

  -- Pacotes de revenda saem com 30% de desconto por unidade.
  v_unit := case when p_quantity > 1 then round(v_plan.price_cents * 0.7)::integer else v_plan.price_cents end;
  v_subtotal := v_unit * p_quantity;

  if nullif(trim(p_coupon), '') is not null then
    select * into v_coupon from public.coupons c
    where c.code = upper(trim(p_coupon)) and c.active and c.expires_at > now() and c.uses < c.max_uses;
    if not found then
      raise exception 'invalid_coupon' using errcode = '22023';
    end if;
    v_discount := coalesce(round(v_subtotal * v_coupon.percent_off / 100.0)::integer, v_coupon.amount_off_cents);
    v_discount := least(v_discount, v_subtotal - 1);
  end if;

  insert into public.orders (user_id, plan_id, quantity, unit_price_cents, discount_cents, amount_cents, coupon_code, pix_txid)
  values (v_uid, v_plan.id, p_quantity, v_unit, v_discount, v_subtotal - v_discount, v_coupon.code,
          'VKT' || public.random_code(20))
  returning * into v_order;

  perform public.log_event('info', format('Pedido criado: %s (%s)', v_plan.name, left(v_order.id::text, 8)),
    jsonb_build_object('order_id', v_order.id, 'amount_cents', v_order.amount_cents));
  return v_order;
end;
$$;

create function public.mark_order_paid(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  update public.orders
  set status = 'aguardando', marked_paid_at = now()
  where id = p_order_id and user_id = auth.uid() and status = 'pendente'
  returning * into v_order;

  if not found then
    raise exception 'order_not_payable' using errcode = '22023';
  end if;

  perform public.log_event('info', format('Cliente informou pagamento do pedido %s', left(v_order.id::text, 8)),
    jsonb_build_object('order_id', v_order.id));
  return v_order;
end;
$$;

create function public.revoke_license(p_license_id uuid) returns public.licenses
language plpgsql security definer set search_path = '' as $$
declare
  v_license public.licenses;
begin
  update public.licenses
  set status = 'revogada'
  where id = p_license_id and (owner_id = auth.uid() or public.is_admin())
  returning * into v_license;

  if not found then
    raise exception 'license_not_found' using errcode = 'P0002';
  end if;

  perform public.log_event('warn', format('Licença %s revogada', v_license.key), jsonb_build_object('license_id', v_license.id));
  return v_license;
end;
$$;

create function public.transfer_license(p_license_id uuid, p_email text) returns public.licenses
language plpgsql security definer set search_path = '' as $$
declare
  v_target uuid;
  v_license public.licenses;
begin
  select id into v_target from public.profiles where lower(email) = lower(trim(p_email));
  if v_target is null then
    raise exception 'recipient_not_found' using errcode = 'P0002';
  end if;
  if v_target = auth.uid() then
    raise exception 'cannot_transfer_to_self' using errcode = '22023';
  end if;

  update public.licenses
  set owner_id = v_target
  where id = p_license_id and owner_id = auth.uid() and reseller_id = auth.uid() and status = 'ativo'
  returning * into v_license;

  if not found then
    raise exception 'license_not_transferable' using errcode = '22023';
  end if;

  perform public.notify_user(v_target, 'Nova licença recebida', format('Você recebeu a licença %s.', v_license.key), 'success');
  perform public.log_event('info', format('Licença %s transferida', v_license.key),
    jsonb_build_object('license_id', v_license.id, 'to', v_target));
  return v_license;
end;
$$;

create function public.record_login(p_user_agent text, p_ip text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  insert into public.login_events (user_id, user_agent, ip)
  values (auth.uid(), left(p_user_agent, 300), left(p_ip, 64));
end;
$$;

create function public.request_payout() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if coalesce(v_profile.pix_key, '') = '' then
    raise exception 'pix_key_required' using errcode = '22023';
  end if;
  perform public.log_event('warn', format('Saque de comissão solicitado por %s', v_profile.email),
    jsonb_build_object('pix_key', v_profile.pix_key));
end;
$$;

create function public.my_affiliate_summary() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'referral_code', p.referral_code,
    'referrals', (select count(*) from public.profiles r where r.referred_by = p.id),
    'paid_orders', (select count(*) from public.orders o join public.profiles r on r.id = o.user_id
                    where r.referred_by = p.id and o.status = 'pago'),
    'commission_cents', coalesce((select round(sum(o.amount_cents) * 0.2) from public.orders o
                    join public.profiles r on r.id = o.user_id where r.referred_by = p.id and o.status = 'pago'), 0)
  )
  from public.profiles p where p.id = auth.uid();
$$;

create function public.my_referrals()
returns table (id uuid, full_name text, created_at timestamptz, plan_id text, commission_cents bigint, has_paid boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.full_name, r.created_at,
    (select o.plan_id from public.orders o where o.user_id = r.id and o.status = 'pago' order by o.confirmed_at desc limit 1),
    coalesce((select round(sum(o.amount_cents) * 0.2)::bigint from public.orders o where o.user_id = r.id and o.status = 'pago'), 0),
    exists (select 1 from public.orders o where o.user_id = r.id and o.status = 'pago')
  from public.profiles r
  where r.referred_by = auth.uid()
  order by r.created_at desc;
$$;

-- =====================================================================
-- Admin
-- =====================================================================
create function public.confirm_order(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_plan public.plans;
begin
  perform public.require_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status = 'pago' then
    return v_order;
  end if;
  if v_order.status not in ('pendente', 'aguardando') then
    raise exception 'order_not_confirmable' using errcode = '22023';
  end if;

  select * into v_plan from public.plans where id = v_order.plan_id;

  update public.orders
  set status = 'pago', confirmed_at = now(), confirmed_by = auth.uid()
  where id = p_order_id
  returning * into v_order;

  insert into public.licenses (key, owner_id, reseller_id, order_id, plan_id, expires_at)
  select public.gen_license_key(), v_order.user_id,
         case when v_order.quantity > 1 then v_order.user_id end,
         v_order.id, v_plan.id, now() + make_interval(days => v_plan.duration_days)
  from generate_series(1, v_order.quantity);

  if v_order.coupon_code is not null then
    update public.coupons set uses = uses + 1 where code = v_order.coupon_code;
  end if;

  perform public.notify_user(
    v_order.user_id,
    'Pagamento confirmado',
    case when v_order.quantity > 1
      then format('%s licenças %s foram adicionadas ao seu estoque.', v_order.quantity, v_plan.name)
      else format('Sua licença %s foi ativada. Bom trabalho!', v_plan.name) end,
    'success'
  );
  perform public.log_event('info', format('Pagamento do pedido %s confirmado', left(v_order.id::text, 8)),
    jsonb_build_object('order_id', v_order.id, 'amount_cents', v_order.amount_cents));
  return v_order;
end;
$$;

create function public.reject_order(p_order_id uuid, p_reason text default null) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  perform public.require_admin();

  update public.orders
  set status = 'recusado', reject_reason = left(nullif(trim(p_reason), ''), 300)
  where id = p_order_id and status in ('pendente', 'aguardando')
  returning * into v_order;

  if not found then
    raise exception 'order_not_rejectable' using errcode = '22023';
  end if;

  perform public.notify_user(v_order.user_id, 'Pagamento não identificado',
    coalesce(v_order.reject_reason, 'Não localizamos o PIX deste pedido. Fale com o suporte se já pagou.'), 'error');
  perform public.log_event('warn', format('Pedido %s recusado', left(v_order.id::text, 8)),
    jsonb_build_object('order_id', v_order.id, 'reason', v_order.reject_reason));
  return v_order;
end;
$$;

create function public.refund_order(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  perform public.require_admin();

  update public.orders set status = 'reembolsado'
  where id = p_order_id and status = 'pago'
  returning * into v_order;

  if not found then
    raise exception 'order_not_refundable' using errcode = '22023';
  end if;

  update public.licenses set status = 'revogada' where order_id = v_order.id;

  perform public.notify_user(v_order.user_id, 'Reembolso processado',
    'O valor será devolvido para a conta de origem do PIX em até 2 dias úteis.', 'info');
  perform public.log_event('warn', format('Pedido %s reembolsado', left(v_order.id::text, 8)),
    jsonb_build_object('order_id', v_order.id, 'amount_cents', v_order.amount_cents));
  return v_order;
end;
$$;

create function public.issue_license(p_user_id uuid, p_plan_id text, p_days integer, p_quantity integer default 1)
returns setof public.licenses
language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.plans;
begin
  perform public.require_admin();

  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 50 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;
  select * into v_plan from public.plans where id = p_plan_id;
  if not found then
    raise exception 'plan_not_found' using errcode = 'P0002';
  end if;

  return query
  insert into public.licenses (key, owner_id, plan_id, expires_at)
  select public.gen_license_key(), p_user_id, v_plan.id, now() + make_interval(days => p_days)
  from generate_series(1, p_quantity)
  returning *;

  perform public.notify_user(p_user_id,
    case when p_quantity > 1 then format('%s novas licenças', p_quantity) else 'Nova licença liberada' end,
    format('A equipe liberou acesso %s por %s dias.', v_plan.name, p_days), 'success');
  perform public.log_event('info', format('%s licença(s) %s emitida(s) manualmente', p_quantity, v_plan.name),
    jsonb_build_object('user_id', p_user_id, 'days', p_days));
end;
$$;

create function public.extend_license(p_license_id uuid, p_days integer) returns public.licenses
language plpgsql security definer set search_path = '' as $$
declare
  v_license public.licenses;
begin
  perform public.require_admin();
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'invalid_days' using errcode = '22023';
  end if;

  update public.licenses
  set expires_at = greatest(expires_at, now()) + make_interval(days => p_days), status = 'ativo'
  where id = p_license_id
  returning * into v_license;

  if not found then
    raise exception 'license_not_found' using errcode = 'P0002';
  end if;

  perform public.log_event('info', format('Licença %s renovada por %s dias', v_license.key, p_days),
    jsonb_build_object('license_id', v_license.id));
  return v_license;
end;
$$;

create function public.set_customer_status(p_user_id uuid, p_status public.profile_status) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  perform public.require_admin();
  if p_user_id = auth.uid() then
    raise exception 'cannot_change_self' using errcode = '22023';
  end if;

  update public.profiles set status = p_status where id = p_user_id returning * into v_profile;
  if not found then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;

  perform public.log_event(case when p_status = 'suspenso' then 'warn' else 'info' end::public.log_level,
    format('Cliente %s: status alterado para %s', v_profile.email, p_status),
    jsonb_build_object('user_id', p_user_id));
  return v_profile;
end;
$$;

create function public.admin_update_profile(p_user_id uuid, p_full_name text, p_role public.app_role)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  perform public.require_admin();
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot_demote_self' using errcode = '22023';
  end if;

  update public.profiles
  set full_name = left(trim(p_full_name), 120), role = p_role
  where id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;

  perform public.log_event('info', format('Perfil de %s atualizado (papel: %s)', v_profile.email, p_role),
    jsonb_build_object('user_id', p_user_id));
  return v_profile;
end;
$$;

create function public.delete_customer(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  perform public.require_admin();
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;
  if p_user_id = auth.uid() or v_profile.role = 'admin' then
    raise exception 'cannot_delete_admin' using errcode = '22023';
  end if;

  perform public.log_event('error', format('Cliente %s excluído', v_profile.email), jsonb_build_object('user_id', p_user_id));
  delete from auth.users where id = p_user_id;
end;
$$;

create function public.can_see_notification(p_audience public.audience, p_detail jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and case p_audience
    when 'todos' then true
    when 'especificos' then coalesce((p_detail -> 'user_ids') ? auth.uid()::text, false)
    when 'plano' then exists (
      select 1 from public.licenses l
      where l.owner_id = auth.uid() and l.plan_id = p_detail ->> 'plan_id'
        and l.status <> 'revogada' and l.expires_at > now())
    when 'ativos' then exists (
      select 1 from public.licenses l
      where l.owner_id = auth.uid() and l.status <> 'revogada' and l.expires_at > now())
    when 'expirados' then exists (
      select 1 from public.licenses l where l.owner_id = auth.uid() and l.expires_at <= now())
      and not exists (
      select 1 from public.licenses l
      where l.owner_id = auth.uid() and l.status <> 'revogada' and l.expires_at > now())
    else false
  end;
$$;

create function public.my_notifications(p_limit integer default 30)
returns table (id uuid, title text, message text, type public.notification_type, pinned boolean,
               created_at timestamptz, seen boolean, dismissed boolean)
language sql stable security definer set search_path = '' as $$
  select n.id, n.title, n.message, n.type, n.pinned, n.created_at,
         r.user_id is not null, r.dismissed_at is not null
  from public.notifications n
  left join public.notification_reads r on r.notification_id = n.id and r.user_id = auth.uid()
  where public.can_see_notification(n.audience, n.audience_detail)
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

create function public.notification_reach(p_audience public.audience, p_detail jsonb) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform public.require_admin();
  select count(*) into v_count from public.profiles p
  where p.role <> 'admin' and case p_audience
    when 'todos' then true
    when 'especificos' then coalesce((p_detail -> 'user_ids') ? p.id::text, false)
    when 'plano' then exists (select 1 from public.licenses l where l.owner_id = p.id
      and l.plan_id = p_detail ->> 'plan_id' and l.status <> 'revogada' and l.expires_at > now())
    when 'ativos' then exists (select 1 from public.licenses l where l.owner_id = p.id
      and l.status <> 'revogada' and l.expires_at > now())
    when 'expirados' then exists (select 1 from public.licenses l where l.owner_id = p.id and l.expires_at <= now())
      and not exists (select 1 from public.licenses l where l.owner_id = p.id
      and l.status <> 'revogada' and l.expires_at > now())
    else false
  end;
  return v_count;
end;
$$;

create function public.send_notification(
  p_title text, p_message text, p_type public.notification_type,
  p_audience public.audience, p_detail jsonb default '{}', p_pinned boolean default false
) returns public.notifications
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.notifications;
  v_reach integer;
begin
  perform public.require_admin();
  if p_audience = 'especificos' and jsonb_array_length(coalesce(p_detail -> 'user_ids', '[]')) = 0 then
    raise exception 'recipients_required' using errcode = '22023';
  end if;
  if p_audience = 'plano' and not exists (select 1 from public.plans where id = p_detail ->> 'plan_id') then
    raise exception 'plan_not_found' using errcode = 'P0002';
  end if;

  insert into public.notifications (title, message, type, audience, audience_detail, pinned, created_by)
  values (trim(p_title), trim(p_message), p_type, p_audience, coalesce(p_detail, '{}'), p_pinned, auth.uid())
  returning * into v_row;

  v_reach := public.notification_reach(p_audience, p_detail);
  perform public.log_event('info', format('Notificação "%s" enviada para %s clientes', v_row.title, v_reach),
    jsonb_build_object('notification_id', v_row.id, 'reach', v_reach));
  return v_row;
end;
$$;

create function public.admin_metrics() returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  v_result json;
begin
  perform public.require_admin();
  select json_build_object(
    'revenue_total_cents', coalesce((select sum(amount_cents) from public.orders where status = 'pago'), 0),
    'revenue_today_cents', coalesce((select sum(amount_cents) from public.orders where status = 'pago' and confirmed_at >= v_today), 0),
    'revenue_prev_30d_cents', coalesce((select sum(amount_cents) from public.orders where status = 'pago'
                               and confirmed_at >= now() - interval '60 days' and confirmed_at < now() - interval '30 days'), 0),
    'revenue_30d_cents', coalesce((select sum(amount_cents) from public.orders where status = 'pago'
                               and confirmed_at >= now() - interval '30 days'), 0),
    'customers', (select count(*) from public.profiles where role <> 'admin'),
    'new_customers_30d', (select count(*) from public.profiles where role <> 'admin' and created_at >= now() - interval '30 days'),
    'active_licenses', (select count(*) from public.licenses where status <> 'revogada' and expires_at > now()),
    'orders_30d', (select count(*) from public.orders where created_at >= now() - interval '30 days'),
    'paid_orders_30d', (select count(*) from public.orders where status = 'pago' and created_at >= now() - interval '30 days'),
    'awaiting_orders', (select count(*) from public.orders where status = 'aguardando')
  ) into v_result;
  return v_result;
end;
$$;

create function public.revenue_series(p_range text)
returns table (bucket timestamp, value_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_now timestamp := now() at time zone 'America/Sao_Paulo';
  v_start timestamp;
  v_step interval;
  v_count integer;
begin
  perform public.require_admin();
  case p_range
    when 'hoje' then v_start := date_trunc('day', v_now); v_step := interval '2 hours'; v_count := 12;
    when '7d' then v_start := date_trunc('day', v_now) - interval '6 days'; v_step := interval '1 day'; v_count := 7;
    when '30d' then v_start := date_trunc('day', v_now) - interval '29 days'; v_step := interval '1 day'; v_count := 30;
    when 'ano' then v_start := date_trunc('year', v_now); v_step := interval '1 month'; v_count := 12;
    else raise exception 'invalid_range' using errcode = '22023';
  end case;

  return query
  select g.b, coalesce(sum(o.amount_cents), 0)::bigint
  from generate_series(v_start, v_start + v_step * (v_count - 1), v_step) as g (b)
  left join public.orders o
    on o.status = 'pago'
   and (o.confirmed_at at time zone v_tz) >= g.b
   and (o.confirmed_at at time zone v_tz) < g.b + v_step
  group by g.b
  order by g.b;
end;
$$;

create function public.top_plans()
returns table (plan_id text, name text, orders bigint, revenue_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select p.id, p.name, count(o.id), coalesce(sum(o.amount_cents), 0)::bigint
  from public.plans p
  left join public.orders o on o.plan_id = p.id and o.status = 'pago' and o.confirmed_at >= now() - interval '30 days'
  group by p.id, p.name, p.sort
  order by coalesce(sum(o.amount_cents), 0) desc, p.sort;
end;
$$;

create function public.admin_partners(p_kind text)
returns table (id uuid, full_name text, email text, referral_code text, role public.app_role,
               referrals bigint, sales bigint, revenue_cents bigint, commission_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_kind = 'afiliados' then
    return query
    select p.id, p.full_name, p.email, p.referral_code, p.role,
      (select count(*) from public.profiles r where r.referred_by = p.id),
      count(o.id),
      coalesce(sum(o.amount_cents), 0)::bigint,
      coalesce(round(sum(o.amount_cents) * 0.2), 0)::bigint
    from public.profiles p
    left join public.profiles r2 on r2.referred_by = p.id
    left join public.orders o on o.user_id = r2.id and o.status = 'pago'
    group by p.id
    having (select count(*) from public.profiles r where r.referred_by = p.id) > 0
    order by 8 desc;
  elsif p_kind = 'revendedores' then
    return query
    select p.id, p.full_name, p.email, p.referral_code, p.role,
      (select count(*) from public.licenses l where l.reseller_id = p.id and l.owner_id <> p.id),
      coalesce(sum(o.quantity), 0)::bigint,
      coalesce(sum(o.amount_cents), 0)::bigint,
      0::bigint
    from public.profiles p
    left join public.orders o on o.user_id = p.id and o.status = 'pago' and o.quantity > 1
    where p.role = 'reseller'
    group by p.id
    order by 8 desc;
  else
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
end;
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.licenses enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.audit_logs enable row level security;
alter table public.login_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy plans_select_anon on public.plans for select to anon
  using (active);
create policy plans_select on public.plans for select to authenticated
  using (active or public.is_admin());
create policy plans_admin_write on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy coupons_admin on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy orders_select on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy licenses_select on public.licenses for select to authenticated
  using (owner_id = auth.uid() or reseller_id = auth.uid() or public.is_admin());

create policy notifications_select on public.notifications for select to authenticated
  using (public.is_admin() or public.can_see_notification(audience, audience_detail));
create policy notifications_admin_delete on public.notifications for delete to authenticated
  using (public.is_admin());

create policy reads_own on public.notification_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_admin on public.audit_logs for select to authenticated
  using (public.is_admin());

create policy login_events_select on public.login_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Colunas editáveis pelo próprio usuário (papel e status só via funções de admin).
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, phone, pix_key) on public.profiles to authenticated;
revoke insert, update, delete on public.orders, public.licenses, public.audit_logs, public.login_events from authenticated;
revoke insert, update on public.notifications from authenticated;
revoke all on all tables in schema public from anon;
grant select on public.plans to anon;

-- =====================================================================
-- Permissões de execução
-- =====================================================================
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_admin(),
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
  public.admin_partners(text)
to authenticated;

-- =====================================================================
-- Realtime
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications, public.orders;
  end if;
end;
$$;

-- =====================================================================
-- Seed
-- =====================================================================
insert into public.plans (id, name, description, price_cents, credits, features, max_licenses, duration_days, highlight, sort) values
  ('starter', 'Starter', 'Para quem está tirando os primeiros projetos do papel.', 4990, '500 créditos/mês',
    array['1 licença ativa', 'Ativação após confirmação', 'Suporte por e-mail', 'Painel do cliente'], 1, 30, false, 1),
  ('pro', 'Pro', 'Para quem cria todos os dias e não pode parar no meio.', 11990, 'Créditos ilimitados',
    array['3 licenças ativas', 'Confirmação prioritária', 'Suporte prioritário', 'Programa de afiliados', 'Histórico completo'], 3, 30, true, 2),
  ('scale', 'Scale', 'Para agências e revendedores que operam em volume.', 24990, 'Ilimitado + revenda',
    array['10 licenças ativas', 'Painel de revenda', 'Pacotes com 30% off', 'Gerente de conta', 'Transferência de licenças'], 10, 30, false, 3);
