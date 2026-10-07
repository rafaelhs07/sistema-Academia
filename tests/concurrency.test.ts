import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { Client } from 'pg';
import { readFile,readdir } from 'node:fs/promises';
const url=process.env.TEST_DATABASE_URL;
// Explicit isolated localhost database only. Never use the application URL.
if(url){const parsed=new URL(url);if(!['127.0.0.1','localhost'].includes(parsed.hostname)||!parsed.pathname.startsWith('/academia_test'))throw Error('TEST_DATABASE_URL debe apuntar a una base local academia_test.');}
const describeNative=url?describe:describe.skip;
describeNative('concurrencia con conexiones PostgreSQL independientes',()=>{
 let root:Client,c1:Client,c2:Client;let a:string,b:string,variant:string;
 const owner=crypto.randomUUID();
 beforeAll(async()=>{
  root=new Client({connectionString:url});await root.connect();
  await root.query(`do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;end$$;
  create schema auth; create schema storage; create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await root.query(await readFile(`supabase/migrations/${file}`,'utf8'));
  await root.query('insert into auth.users(id,email) values($1,$2)',[owner,'concurrency@test.invalid']);
  a=(await root.query("select public.bootstrap_academy($1,'Concurrencia','Prueba','USD','UTC') a",[owner])).rows[0].a;
  b=(await root.query("insert into public.branches(academy_id,name) values($1,'Prueba') returning id",[a])).rows[0].id;
  const product=(await root.query("insert into public.products(academy_id,name) values($1,'Última unidad') returning id",[a])).rows[0].id;
  variant=(await root.query("insert into public.product_variants(academy_id,product_id,name,code,price) values($1,$2,'Única','LAST',10) returning id",[a,product])).rows[0].id;
  await root.query('insert into public.stock(academy_id,branch_id,variant_id,quantity,average_cost) values($1,$2,$3,1,5)',[a,b,variant]);
  c1=new Client({connectionString:url});c2=new Client({connectionString:url});await Promise.all([c1.connect(),c2.connect()]);
  for(const c of [c1,c2]){await c.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await c.query('set role authenticated');}
 });
 afterAll(async()=>{await Promise.all([root?.end(),c1?.end(),c2?.end()]);});
 it('solo una transacción puede vender la última unidad',async()=>{
  const data=JSON.stringify({due_on:'2026-10-07',lines:[{variant_id:variant,quantity:1}],payments:[]});
  const action=(c:Client)=>c.query("select public.operate($1,$2,'sale',$3::jsonb,$4)",[a,b,data,crypto.randomUUID()]);
  const results=await Promise.allSettled([action(c1),action(c2)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  expect(Number((await root.query('select quantity from public.stock where variant_id=$1',[variant])).rows[0].quantity)).toBe(0);expect((await root.query('select id from public.sales')).rowCount).toBe(1);
 });
 it('el mismo identificador simultáneo devuelve una sola venta',async()=>{
  await root.query('update public.stock set quantity=2 where variant_id=$1',[variant]);const key=crypto.randomUUID();const data=JSON.stringify({due_on:'2026-10-07',lines:[{variant_id:variant,quantity:1}],payments:[]});
  const action=(c:Client)=>c.query("select public.operate($1,$2,'sale',$3::jsonb,$4) r",[a,b,data,key]);const results=await Promise.all([action(c1),action(c2)]);expect(results[0].rows[0].r.id).toBe(results[1].rows[0].r.id);expect(Number((await root.query('select quantity from public.stock where variant_id=$1',[variant])).rows[0].quantity)).toBe(1);
 });
});
