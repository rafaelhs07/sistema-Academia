import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
export async function database() {
 const db = new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated;`);
 for (const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
  try { await db.exec(await readFile(`supabase/migrations/${file}`,'utf8')); }
  catch(error) { throw new Error(`Migración ${file}: ${String(error)}`,{cause:error}); }
 }
 return db;
}
export async function identity(db:PGlite,user:string) {
 await db.exec(`reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`);
}
export async function rpc(db:PGlite,a:string,b:string|null,action:string,data:Record<string,unknown>,key=crypto.randomUUID()):Promise<Record<string,unknown>> {
 const result=await db.query<{result:Record<string,unknown>}>('select public.operate($1,$2,$3,$4::jsonb,$5) as result',[a,b,action,JSON.stringify(data),key]);
 return result.rows[0].result;
}
