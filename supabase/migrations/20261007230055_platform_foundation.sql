-- Platform commerce is independent of academy/student finance.
create table private.platform_admins (
 user_id uuid primary key references auth.users(id), active boolean not null default true,
 appointed_by uuid references auth.users(id), reason text not null check(length(trim(reason))>=5),
 created_at timestamptz not null default now()
);
alter table private.platform_admins enable row level security;
revoke all on private.platform_admins from public,anon,authenticated;

create function private.platform_admin(mfa boolean default true) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from private.platform_admins where user_id=auth.uid() and active)
 and (not mfa or (auth.jwt()->>'aal'='aal2' and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified')))
$$;
create function private.require_platform_admin() returns void language plpgsql security invoker set search_path='' as $$
begin if not private.platform_admin() then raise exception 'Se requiere Superadministrador con autenticación multifactor' using errcode='42501'; end if; end$$;
revoke all on function private.platform_admin(boolean),private.require_platform_admin() from public,anon;
grant execute on function private.platform_admin(boolean),private.require_platform_admin() to authenticated;

create table public.platform_settings (
 id boolean primary key default true check(id), timezone text not null default 'UTC',
 automatic_suspension boolean not null default false, contact text not null default '',
 payment_instructions text not null default '', updated_at timestamptz not null default now()
);
insert into public.platform_settings(id) values(true);
create table public.platform_plans (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 120),
 description text not null default '', price numeric(14,2) not null check(price>=0),
 currency text not null check(currency~'^[A-Z]{3}$'), cycle text not null check(cycle in('mensual','anual')),
 trial_days int not null default 0 check(trial_days between 0 and 365),
 max_branches int not null check(max_branches between 1 and 100000),
 max_users int not null check(max_users between 1 and 100000), max_students int check(max_students>0),
 modules text[] not null default '{}', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint platform_plan_modules check(modules <@ array['sales','inventory','classes','staff','reports']::text[]
 and (not ('sales'=any(modules)) or 'inventory'=any(modules)))
);
create table public.platform_businesses (
 academy_id uuid primary key references public.academies(id), commercial_name text not null,
 responsible_name text not null, contact_email text, phone text, owner_name text not null,
 owner_email text not null check(owner_email=lower(trim(owner_email))),
 owner_user_id uuid references auth.users(id),
 invitation_status text not null default 'pendiente' check(invitation_status in('pendiente','enviando','enviada','vinculada','fallida')),
 invitation_error text, invitation_attempts int not null default 0,
 invitation_lease_until timestamptz, invitation_token uuid, invited_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Existing customers keep their service; an operator assigns commercial terms explicitly.
insert into public.platform_businesses(academy_id,commercial_name,responsible_name,owner_name,owner_email,owner_user_id,invitation_status)
select a.id,a.name,coalesce(m.name,'Por configurar'),coalesce(m.name,'Por configurar'),
 coalesce(lower(u.email),'pendiente-'||a.id::text||'@invalid.local'),u.id,
 case when u.id is null then 'pendiente' else 'vinculada' end
from public.academies a left join lateral(
 select im.* from public.internal_members im join public.member_roles mr on mr.member_id=im.id
 join public.roles r on r.id=mr.role_id where im.academy_id=a.id and im.active and r.active and '*'=any(r.permissions)
 order by im.created_at limit 1
)m on true left join auth.users u on u.id=m.user_id;

create table public.platform_contracts (
 id uuid primary key default gen_random_uuid(), academy_id uuid not null references public.platform_businesses(academy_id),
 plan_id uuid not null references public.platform_plans(id), plan_name text not null,
 price numeric(14,2) not null check(price>=0), currency text not null check(currency~'^[A-Z]{3}$'),
 cycle text not null check(cycle in('mensual','anual')), trial_days int not null check(trial_days between 0 and 365),
 max_branches int not null check(max_branches>0),max_users int not null check(max_users>0),max_students int check(max_students>0),
 modules text[] not null, reason text not null check(length(trim(reason))>=5),
 actor uuid references auth.users(id), effective_on date not null, created_at timestamptz not null default now(), unique(academy_id,id),
 constraint platform_contract_modules check(modules <@ array['sales','inventory','classes','staff','reports']::text[]
 and (not ('sales'=any(modules)) or 'inventory'=any(modules)))
);
create table public.platform_subscriptions (
 academy_id uuid primary key references public.platform_businesses(academy_id), contract_id uuid not null,
 foreign key(academy_id,contract_id) references public.platform_contracts(academy_id,id),
 status text not null default 'activa' check(status in('activa','cancelada')),
 starts_on date not null, trial_until date, next_charge_on date not null, anchor_day int not null check(anchor_day between 1 and 31),
 ends_on date, grace_days int not null default 0 check(grace_days between 0 and 90),
 automatic_suspension boolean not null default true,
 manual_block boolean not null default false, manual_reason text, internal_note text,
 customer_message text not null default 'Contacta al propietario de tu academia para revisar el servicio.',
 extension_until date, extension_reason text, cancelled_on date,
 recovery_required boolean not null default false, operational_paused_at timestamptz,
 updated_at timestamptz not null default now(),
 check(trial_until is null or trial_until>=starts_on),check(next_charge_on>=starts_on),
 check(not manual_block or length(trim(manual_reason))>=5),
 check(extension_until is null or length(trim(extension_reason))>=5)
);
create table public.platform_documents (
 id uuid primary key default gen_random_uuid(), academy_id uuid not null references public.platform_businesses(academy_id),
 kind text not null check(kind in('logo','comprobante')),title text not null,
 path text not null unique,mime_type text not null check(mime_type in('image/png','image/jpeg','application/pdf')),
 size_bytes int not null check(size_bytes between 1 and 5242880),actor uuid not null references auth.users(id),
 created_at timestamptz not null default now(),unique(academy_id,id),check(kind<>'logo' or mime_type<>'application/pdf')
);
alter table public.platform_businesses add column logo_document_id uuid;
alter table public.platform_businesses add foreign key(academy_id,logo_document_id) references public.platform_documents(academy_id,id);
create table public.platform_charges (
 id uuid primary key default gen_random_uuid(), academy_id uuid not null references public.platform_businesses(academy_id),
 contract_id uuid not null,foreign key(academy_id,contract_id) references public.platform_contracts(academy_id,id),
 description text not null,amount numeric(14,2) not null check(amount>=0),currency text not null check(currency~'^[A-Z]{3}$'),
 period_on date not null,due_on date not null,created_at timestamptz not null default now(),
 unique(academy_id,period_on),unique(academy_id,id)
);
create table public.platform_adjustments (
 id uuid primary key default gen_random_uuid(),academy_id uuid not null references public.platform_businesses(academy_id),
 charge_id uuid not null,foreign key(academy_id,charge_id) references public.platform_charges(academy_id,id),
 amount numeric(14,2) not null check(amount<>0),reason text not null check(length(trim(reason))>=5),
 actor uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.platform_payment_methods (
 id uuid primary key default gen_random_uuid(),name text not null,kind text not null check(kind in('efectivo','transferencia','otro')),
 requires_verification boolean not null default false,active boolean not null default true,
 check(kind<>'transferencia' or requires_verification)
);
create table public.platform_payments (
 id uuid primary key default gen_random_uuid(),receipt_number bigint generated by default as identity unique,
 academy_id uuid not null references public.platform_businesses(academy_id),method_id uuid not null references public.platform_payment_methods(id),
 amount numeric(14,2) not null check(amount>0),currency text not null check(currency~'^[A-Z]{3}$'),
 status text not null check(status in('pendiente','confirmado','rechazado')),
 reference text,document_id uuid,foreign key(academy_id,document_id) references public.platform_documents(academy_id,id),
 actor uuid not null references auth.users(id),confirmed_by uuid references auth.users(id),
 confirmed_at timestamptz, rejection_reason text,created_at timestamptz not null default now(),unique(academy_id,id)
);
create table public.platform_applications (
 id uuid primary key default gen_random_uuid(),academy_id uuid not null references public.platform_businesses(academy_id),
 payment_id uuid not null,foreign key(academy_id,payment_id) references public.platform_payments(academy_id,id),
 charge_id uuid not null,foreign key(academy_id,charge_id) references public.platform_charges(academy_id,id),
 amount numeric(14,2) not null check(amount>0),unique(payment_id,charge_id)
);
create table public.platform_audit (
 id uuid primary key default gen_random_uuid(),academy_id uuid references public.platform_businesses(academy_id),
 actor uuid references auth.users(id),action text not null,entity_id uuid,reason text,
 details jsonb not null default '{}',created_at timestamptz not null default now()
);
create table private.platform_operation_keys (
 key uuid primary key,actor uuid not null references auth.users(id),action text not null,payload jsonb not null,result jsonb,
 created_at timestamptz not null default now()
);
alter table private.platform_operation_keys enable row level security;
revoke all on private.platform_operation_keys from public,anon,authenticated;
create table public.platform_job_runs (
 id uuid primary key default gen_random_uuid(),started_at timestamptz not null default now(),finished_at timestamptz,
 generated int not null default 0,remaining boolean not null default false,error text
);

do $$declare t text;begin
 foreach t in array array['platform_settings','platform_plans','platform_businesses','platform_contracts','platform_subscriptions',
 'platform_documents','platform_charges','platform_adjustments','platform_payment_methods','platform_payments','platform_applications','platform_audit','platform_job_runs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy superadmin_read on public.%I for select to authenticated using((select private.platform_admin()))',t);
 end loop;
end$$;
create view public.platform_charge_balances with(security_invoker=true) as
 select c.*,c.amount+coalesce((select sum(x.amount) from public.platform_adjustments x where x.charge_id=c.id),0)
 -coalesce((select sum(x.amount) from public.platform_applications x join public.platform_payments p on p.id=x.payment_id where x.charge_id=c.id and p.status='confirmado'),0) as balance
 from public.platform_charges c;
grant select on public.platform_charge_balances to authenticated;

create index platform_contract_business_idx on public.platform_contracts(academy_id,created_at desc);
create index platform_contract_plan_idx on public.platform_contracts(plan_id);
create index platform_contract_actor_idx on public.platform_contracts(actor);
create index platform_business_owner_idx on public.platform_businesses(owner_user_id);
create index platform_business_logo_idx on public.platform_businesses(academy_id,logo_document_id);
create index platform_subscription_contract_idx on public.platform_subscriptions(academy_id,contract_id);
create index platform_subscription_due_idx on public.platform_subscriptions(next_charge_on) where status='activa';
create index platform_documents_business_idx on public.platform_documents(academy_id,id);
create index platform_documents_actor_idx on public.platform_documents(actor);
create index platform_charges_due_idx on public.platform_charges(academy_id,due_on);
create index platform_charges_contract_idx on public.platform_charges(academy_id,contract_id);
create index platform_adjustments_charge_idx on public.platform_adjustments(academy_id,charge_id);
create index platform_adjustments_actor_idx on public.platform_adjustments(actor);
create index platform_payments_business_idx on public.platform_payments(academy_id,created_at);
create index platform_payments_method_idx on public.platform_payments(method_id);
create index platform_payments_document_idx on public.platform_payments(academy_id,document_id);
create index platform_payments_actor_idx on public.platform_payments(actor);
create index platform_payments_confirmed_idx on public.platform_payments(confirmed_by);
create index platform_applications_charge_idx on public.platform_applications(academy_id,charge_id);
create index platform_applications_payment_idx on public.platform_applications(academy_id,payment_id);
create index platform_audit_business_idx on public.platform_audit(academy_id,created_at desc);
create index platform_audit_actor_idx on public.platform_audit(actor);
create index platform_admin_appointed_idx on private.platform_admins(appointed_by);
create index platform_keys_actor_idx on private.platform_operation_keys(actor);

create function private.academy_permission(a uuid,b uuid,p text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.internal_members m
 join public.member_roles mr on mr.member_id=m.id and mr.academy_id=m.academy_id
 join public.roles r on r.id=mr.role_id and r.academy_id=m.academy_id
 where m.user_id=auth.uid() and m.academy_id=a and m.active and r.active
 and (b is null or m.all_branches or b=any(m.branch_ids)) and (p=any(r.permissions) or '*'=any(r.permissions)))
$$;
revoke all on function private.academy_permission(uuid,uuid,text) from public,anon,authenticated;
create function private.platform_day() returns date language sql stable security definer set search_path='' as $$
 select (now() at time zone timezone)::date from public.platform_settings where id
$$;
create function private.platform_balance(c uuid,reserved boolean default false) returns numeric language sql stable security definer set search_path='' as $$
 select ch.amount+coalesce((select sum(x.amount) from public.platform_adjustments x where x.charge_id=c),0)
 -coalesce((select sum(x.amount) from public.platform_applications x join public.platform_payments p on p.id=x.payment_id where x.charge_id=c and (p.status='confirmado' or (reserved and p.status='pendiente'))),0)
 from public.platform_charges ch where ch.id=c
$$;
create function private.business_access(a uuid,force_auto boolean default false,on_day date default null) returns text
language plpgsql stable security definer set search_path='' as $$
declare s public.platform_subscriptions;d date:=coalesce(on_day,private.platform_day());auto boolean;begin
 select * into s from public.platform_subscriptions where academy_id=a;
 if not found then return 'sin_contrato';end if;
 if s.status='cancelada' or (s.ends_on is not null and d>s.ends_on) then return 'cancelada';end if;
 if s.manual_block then return 'suspendida_manual';end if;
 if d<s.starts_on then return 'pendiente_inicio';end if;
 if s.trial_until is not null and d<s.trial_until then return 'prueba';end if;
 select automatic_suspension into auto from public.platform_settings where id;
 if exists(select 1 from public.platform_charges c where c.academy_id=a and c.due_on+s.grace_days<d and private.platform_balance(c.id)>0) then
  if s.extension_until is not null and s.extension_until>=d then return 'extension_temporal';end if;
  if (auto or force_auto) and s.automatic_suspension then return 'suspendida_impago';end if;
  return 'deuda_sin_suspension';
 end if;
 if exists(select 1 from public.platform_charges c where c.academy_id=a and c.due_on<=d and private.platform_balance(c.id)>0) then return 'gracia';end if;
 return 'activa';
end$$;
create function private.business_operational(a uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.business_access(a) in('sin_contrato','prueba','activa','gracia','extension_temporal','deuda_sin_suspension')
$$;
create function private.business_module(a uuid,module text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select module=any(c.modules) from public.platform_subscriptions s join public.platform_contracts c on c.id=s.contract_id where s.academy_id=a),true)
$$;
revoke all on function private.platform_day(),private.platform_balance(uuid,boolean),private.business_access(uuid,boolean,date) from public,anon,authenticated;
revoke all on function private.business_operational(uuid),private.business_module(uuid,text) from public,anon;
grant execute on function private.business_operational(uuid),private.business_module(uuid,text) to authenticated;
create or replace function private.has_permission(a uuid,b uuid,p text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.business_operational(a) and private.academy_permission(a,b,p)
 and (split_part(p,'.',1) not in('sales','inventory','classes','staff','reports') or private.business_module(a,split_part(p,'.',1)))
$$;

-- Defense in depth for existing self-membership policies and views.
do $$declare t record;m text;begin
 for t in select table_name from information_schema.columns where table_schema='public' and column_name='academy_id'
 and table_name not like 'platform_%' and table_name<>'internal_members'
 and table_name in(select tablename from pg_catalog.pg_tables where schemaname='public') loop
 m:=case when t.table_name in('products','product_variants','product_categories','product_prices','stock','inventory_movements','purchases','purchase_lines','stock_transfers','equipment') then 'inventory'
 when t.table_name in('sales','sale_lines') then 'sales'
 when t.table_name in('classes','class_templates','holidays','reservations','attendance') then 'classes'
 when t.table_name in('employees','compensation_versions','staff_activities','settlements','settlement_lines') then 'staff' end;
 execute format('create policy platform_service_guard on public.%I as restrictive for all to authenticated using(private.business_operational(academy_id)) with check(private.business_operational(academy_id))',t.table_name);
 if m is not null then execute format('create policy platform_module_guard on public.%I as restrictive for all to authenticated using(private.business_module(academy_id,%L)) with check(private.business_module(academy_id,%L))',t.table_name,m,m);end if;
 end loop;
end$$;
create policy platform_service_guard on public.academies as restrictive for all to authenticated using(private.business_operational(id)) with check(private.business_operational(id));

create function private.platform_limit_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.platform_contracts;used bigint;lim int;adding boolean;begin
 if tg_table_name='students' then adding:=new.status='activo' and (tg_op='INSERT' or old.status<>'activo');
 else adding:=new.active and (tg_op='INSERT' or not old.active);end if;
 if not adding then return new;end if;
 perform 1 from public.academies where id=new.academy_id for update;
 if tg_table_name='internal_members' and tg_op='INSERT' then
  if exists(select 1 from public.internal_members where academy_id=new.academy_id and user_id=new.user_id and active) then return new;end if;
 end if;
 select pc.* into c from public.platform_contracts pc join public.platform_subscriptions s on s.contract_id=pc.id where s.academy_id=new.academy_id;
 if not found then return new;end if;
 if tg_table_name='branches' then lim:=c.max_branches;select count(*) into used from public.branches where academy_id=new.academy_id and active;
 elsif tg_table_name='internal_members' then lim:=c.max_users;select count(*) into used from public.internal_members where academy_id=new.academy_id and active;
 else lim:=c.max_students;select count(*) into used from public.students where academy_id=new.academy_id and status='activo';end if;
 if lim is not null and used>=lim then raise exception 'Se alcanzó el límite contratado de % (%). Se conservan los registros existentes.',tg_table_name,lim;end if;
 return new;
end$$;
revoke all on function private.platform_limit_guard() from public,anon,authenticated;
create trigger platform_limit before insert or update on public.branches for each row execute function private.platform_limit_guard();
create trigger platform_limit before insert or update on public.internal_members for each row execute function private.platform_limit_guard();
create trigger platform_limit before insert or update on public.students for each row execute function private.platform_limit_guard();

create function public.platform_identity() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('superadmin',private.platform_admin(false),'mfa_required',private.platform_admin(false) and not private.platform_admin())
$$;
revoke all on function public.platform_identity() from public,anon;
grant execute on function public.platform_identity() to authenticated;

create function private.service_status(a uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
#variable_conflict use_column
declare owner boolean;status text;s public.platform_subscriptions;modules text[];details jsonb;begin
 if not exists(select 1 from public.internal_members where user_id=auth.uid() and academy_id=a and active) then raise exception 'No tienes acceso a este negocio' using errcode='42501';end if;
 owner:=private.academy_permission(a,null,'owner.manage');status:=private.business_access(a);
 select * into s from public.platform_subscriptions where academy_id=a;
 select c.modules into modules from public.platform_contracts c where c.id=s.contract_id;
 details:=jsonb_build_object('academy_id',a,'access',status,'operational',private.business_operational(a),'owner',owner,
 'modules',coalesce(modules,array['sales','inventory','classes','staff','reports']),
 'message',case when owner then coalesce(s.customer_message,'') else 'Contacta al propietario de tu academia para revisar el acceso.' end,
 'recovery_required',coalesce(s.recovery_required,false));
 if owner then details:=details||jsonb_build_object('grace_days',s.grace_days,'extension_until',s.extension_until,
 'trial_until',s.trial_until,'next_charge_on',s.next_charge_on,
 'contact',(select contact from public.platform_settings where id),'instructions',(select payment_instructions from public.platform_settings where id),
 'balances',coalesce((select jsonb_agg(x) from(select c.currency,sum(private.platform_balance(c.id)) balance from public.platform_charges c where c.academy_id=a group by c.currency)x),'[]'),
 'charges',coalesce((select jsonb_agg(x order by x.due_on desc) from(select id,description,amount,currency,due_on,private.platform_balance(id) balance from public.platform_charges where academy_id=a order by due_on desc limit 100)x),'[]'),
 'payments',coalesce((select jsonb_agg(x order by x.created_at desc) from(select id,receipt_number,amount,currency,status,reference,created_at from public.platform_payments where academy_id=a order by created_at desc limit 100)x),'[]'));end if;
 return details;
end$$;
revoke all on function private.service_status(uuid) from public,anon;
grant execute on function private.service_status(uuid) to authenticated;
create function public.academy_service(p_academy uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.service_status(p_academy)$$;
revoke all on function public.academy_service(uuid) from public,anon;
grant execute on function public.academy_service(uuid) to authenticated;

-- Only the trusted operator can appoint administrators; no academy role can call this.
create function public.bootstrap_superadmin(p_user uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if length(trim(p_reason))<5 or not exists(select 1 from auth.users where id=p_user) then raise exception 'Usuario existente y motivo obligatorio';end if;
 insert into private.platform_admins(user_id,reason) values(p_user,p_reason) on conflict(user_id) do nothing;
 insert into public.platform_audit(actor,action,entity_id,reason) values(auth.uid(),'superadmin_appointment',p_user,p_reason);
end$$;
revoke all on function public.bootstrap_superadmin(uuid,text) from public,anon,authenticated;
grant execute on function public.bootstrap_superadmin(uuid,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('platform-private','platform-private',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
create policy platform_files_read on storage.objects for select to authenticated using(bucket_id='platform-private' and (select private.platform_admin()));
create policy platform_files_insert on storage.objects for insert to authenticated with check(bucket_id='platform-private' and (select private.platform_admin()) and
 split_part(name,'/',1) in(select academy_id::text from public.platform_businesses));
