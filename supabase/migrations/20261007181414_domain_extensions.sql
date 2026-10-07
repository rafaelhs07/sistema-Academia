create table public.product_prices (
 id uuid primary key default gen_random_uuid(), academy_id uuid not null references public.academies(id),
 variant_id uuid not null, effective_on date not null, price numeric(14,2) not null check(price>=0),
 created_at timestamptz not null default now(), unique(academy_id,id),unique(variant_id,effective_on),
 foreign key(academy_id,variant_id) references public.product_variants(academy_id,id)
);
alter table public.product_prices enable row level security;
grant select on public.product_prices to authenticated;
create policy product_prices_read on public.product_prices for select to authenticated using(private.has_permission(academy_id,null,'inventory.read'));
create trigger immutable_academy before update on public.product_prices for each row execute function private.immutable_academy();
create index product_prices_academy_idx on public.product_prices(academy_id);
alter table public.academies add column proration_policy text not null default 'ninguno' check(proration_policy in ('ninguno','dias_calendario'));
alter table public.academies add column pause_policy text not null default 'omitir' check(pause_policy in ('omitir','extender'));
alter table public.academies add column cancel_policy text not null default 'inmediata' check(cancel_policy in ('inmediata','fin_periodo'));
alter table public.memberships add column canceled_on date;
alter table public.membership_events alter column actor drop not null;
alter table public.expenses add constraint expenses_source_period_unique unique(academy_id,source,source_id,due_on);
create function private.master_invariants() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='accounts' then
  if (new.branch_id<>old.branch_id or new.kind<>old.kind) and exists(select 1 from public.account_movements where account_id=old.id) then raise exception 'Una cuenta con movimientos conserva su tipo y sucursal'; end if;
 elsif tg_table_name='product_variants' then
  if new.price<>old.price and exists(select 1 from public.sale_lines where variant_id=old.id) then raise exception 'Registra una nueva versión del precio en lugar de editar el precio histórico'; end if;
 end if; return new;
end $$;
create trigger account_invariants before update on public.accounts for each row execute function private.master_invariants();
create trigger product_invariants before update on public.product_variants for each row execute function private.master_invariants();
revoke all on function private.master_invariants() from public,anon,authenticated;
create view public.sales_report with(security_invoker=true) as
select s.*,coalesce((select sum(round((l.quantity-l.returned)*l.unit_price,2)-round(l.discount*(l.quantity-l.returned)/l.quantity,2)) from public.sale_lines l where l.sale_id=s.id),0) net_sales,
 coalesce((select sum(round((l.quantity-l.returned)*l.unit_cost,2)) from public.sale_lines l where l.sale_id=s.id),0) cost,
 coalesce((select sum(round((l.quantity-l.returned)*(l.unit_price-l.unit_cost),2)-round(l.discount*(l.quantity-l.returned)/l.quantity,2)) from public.sale_lines l where l.sale_id=s.id),0) margin
from public.sales s;
grant select on public.sales_report to authenticated;
create table public.expense_categories(id uuid primary key default gen_random_uuid(),academy_id uuid not null references public.academies(id),name text not null,active boolean not null default true,created_at timestamptz not null default now(),unique(academy_id,id),unique(academy_id,name));
alter table public.expense_categories enable row level security;
grant select,insert,update on public.expense_categories to authenticated;
create policy expense_categories_read on public.expense_categories for select to authenticated using(private.has_permission(academy_id,null,'expenses.read'));
create policy expense_categories_write on public.expense_categories for insert to authenticated with check(private.has_permission(academy_id,null,'expenses.write'));
create policy expense_categories_update on public.expense_categories for update to authenticated using(private.has_permission(academy_id,null,'expenses.write')) with check(private.has_permission(academy_id,null,'expenses.write'));
create trigger expense_categories_immutable before update on public.expense_categories for each row execute function private.immutable_academy();
create trigger expense_categories_audit after insert or update on public.expense_categories for each row execute function private.audit_master();
alter table public.expenses add column category_id uuid;
alter table public.expenses add foreign key(academy_id,category_id) references public.expense_categories(academy_id,id);
create view public.student_activity with(security_invoker=true) as
 select s.*, (select max(c.starts_at) from public.attendance t join public.classes c on c.id=t.class_id where t.student_id=s.id) last_attended_at,
 (now() at time zone (select timezone from public.academies where id=s.academy_id))::date-coalesce((select max((c.starts_at at time zone (select timezone from public.academies where id=s.academy_id))::date) from public.attendance t join public.classes c on c.id=t.class_id where t.student_id=s.id),s.joined_on) inactive_days from public.students s;
grant select on public.student_activity to authenticated;
create view public.debt_report with(security_invoker=true) as select cb.*, (now() at time zone (select timezone from public.academies where id=cb.academy_id))::date-cb.due_on overdue_days,
case when cb.due_on>=(now() at time zone (select timezone from public.academies where id=cb.academy_id))::date then 'Al día' when (now() at time zone (select timezone from public.academies where id=cb.academy_id))::date-cb.due_on<=30 then '1–30 días' when (now() at time zone (select timezone from public.academies where id=cb.academy_id))::date-cb.due_on<=60 then '31–60 días' when (now() at time zone (select timezone from public.academies where id=cb.academy_id))::date-cb.due_on<=90 then '61–90 días' else 'Más de 90 días' end aging_bucket from public.charge_balances cb where cb.balance>0;
grant select on public.debt_report to authenticated;
alter table public.notifications add constraint notifications_entity_key unique(academy_id,kind,entity_id);
create function private.instructor_directory(a uuid,b uuid,q text) returns table(id uuid,name text,branch_id uuid) language sql stable security definer set search_path='' as $$
 select e.id,e.name,e.branch_id from public.employees e where e.academy_id=a and (b is null or e.branch_id=b) and e.status='activo' and e.name ilike '%'||coalesce(q,'')||'%' and private.has_permission(a,e.branch_id,'classes.read') order by e.name limit 50
$$;
revoke all on function private.instructor_directory(uuid,uuid,text) from public,anon;
grant execute on function private.instructor_directory(uuid,uuid,text) to authenticated;
create function public.instructor_directory(p_academy uuid,p_branch uuid,p_search text default '') returns table(id uuid,name text,branch_id uuid) language sql stable security invoker set search_path='' as $$ select * from private.instructor_directory(p_academy,p_branch,p_search) $$;
revoke all on function public.instructor_directory(uuid,uuid,text) from public,anon;
grant execute on function public.instructor_directory(uuid,uuid,text) to authenticated;
-- Index every foreign key used by authorization and business operations.
do $$ declare fk record; begin
 for fk in select c.conrelid::regclass rel,c.conname,array_agg(a.attname order by x.ordinality) cols from pg_catalog.pg_constraint c cross join lateral unnest(c.conkey) with ordinality x(attnum,ordinality) join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=x.attnum where c.contype='f' and c.connamespace='public'::regnamespace group by c.conrelid,c.conname loop
  execute format('create index if not exists %I on %s (%s)',left(fk.conname||'_idx',63),fk.rel,(select string_agg(quote_ident(col),',') from unnest(fk.cols) col));
 end loop;
end $$;
