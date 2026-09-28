import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

/** Replica o mínimo do ambiente Supabase: papéis, schemas auth/storage e privilégios padrão. */
const SUPABASE_SHIM = `
create role anon nologin;
create role authenticated nologin;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  raw_user_meta_data jsonb not null default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;
create schema storage;
grant usage on schema storage to anon, authenticated;
create table storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select on storage.buckets to anon, authenticated;
grant all on storage.objects to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations/", import.meta.url));
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(`${MIGRATIONS_DIR}${f}`, "utf8"));

export type Db = PGlite;

export async function createDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const sql of MIGRATIONS) await db.exec(sql);
  return db;
}

export async function createUser(
  db: Db,
  email: string,
  meta: Record<string, string> = {},
): Promise<string> {
  const res = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return res.rows[0].id;
}

export async function promote(db: Db, userId: string, role: "admin" | "reseller"): Promise<void> {
  await db.query("update public.profiles set role = $1 where id = $2", [role, userId]);
}

/** Executa `fn` como o usuário informado (ou anônimo), com RLS ativo. */
export async function asUser<T>(db: Db, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(userId ? "set role authenticated" : "set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

/** Atalho: roda uma query como `userId` e devolve as linhas. */
export function queryAs<T>(db: Db, userId: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, userId, async () => (await db.query<T>(sql, params)).rows);
}
