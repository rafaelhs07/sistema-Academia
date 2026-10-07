-- Forward-only additions after the six initial migrations.
alter policy internal_members_read on public.internal_members using ((user_id=(select auth.uid()) and active) or private.has_permission(academy_id,null,'users.manage'));
alter policy member_roles_read on public.member_roles using (private.has_permission(academy_id,null,'users.manage') or member_id in(select id from public.internal_members where user_id=(select auth.uid()) and active));
alter table public.academies add column locale text not null default 'es' check(locale in('es','es-NI','es-MX','es-GT','es-CR','es-ES'));
alter table public.academies add column logo_document_id uuid;
alter table public.academies add foreign key(id,logo_document_id) references public.documents(academy_id,id);
alter table public.academies add column reservation_hours int not null default 0 check(reservation_hours between 0 and 168);
alter table public.academies add column max_discount_percent numeric(5,2) not null default 100 check(max_discount_percent between 0 and 100);
alter table public.classes add column level text;
alter table public.classes add column age_group text;
alter table public.purchase_lines add column returned numeric(14,3) not null default 0 check(returned>=0 and returned<=received);
alter table public.payments add column receipt_prefix text not null default '';
alter table public.charges drop constraint charges_amount_check;
alter table public.charges add constraint charges_amount_check check(amount>=0);
alter table public.document_counters add column prefix text not null default '' check(length(prefix)<=30);
alter table public.students add constraint student_status_reason check(status='activo' or nullif(trim(status_reason),'') is not null);
create table public.expense_adjustments(id uuid primary key default gen_random_uuid(),academy_id uuid not null references public.academies(id),branch_id uuid not null,expense_id uuid not null,amount numeric(14,2) not null check(amount<>0),reason text not null,actor uuid not null,created_at timestamptz not null default now(),unique(academy_id,id),foreign key(academy_id,branch_id) references public.branches(academy_id,id),foreign key(academy_id,expense_id) references public.expenses(academy_id,id));
alter table public.expense_adjustments enable row level security;
grant select on public.expense_adjustments to authenticated;
create policy expense_adjustments_read on public.expense_adjustments for select to authenticated using(private.has_permission(academy_id,branch_id,'expenses.read'));
create index expense_adjustments_expense_idx on public.expense_adjustments(academy_id,expense_id);
create index expense_adjustments_branch_idx on public.expense_adjustments(academy_id,branch_id);
create table public.expense_refunds(id uuid primary key default gen_random_uuid(),academy_id uuid not null references public.academies(id),branch_id uuid not null,expense_id uuid not null,account_id uuid not null,amount numeric(14,2) not null check(amount>0),reference text not null,actor uuid not null,created_at timestamptz not null default now(),unique(academy_id,id),foreign key(academy_id,branch_id) references public.branches(academy_id,id),foreign key(academy_id,expense_id) references public.expenses(academy_id,id),foreign key(academy_id,account_id) references public.accounts(academy_id,id));
alter table public.expense_refunds enable row level security;
grant select on public.expense_refunds to authenticated;
create policy expense_refunds_read on public.expense_refunds for select to authenticated using(private.has_permission(academy_id,branch_id,'expenses.read'));
create index expense_refunds_expense_idx on public.expense_refunds(academy_id,expense_id);
create index expense_refunds_branch_idx on public.expense_refunds(academy_id,branch_id);
create index expense_refunds_account_idx on public.expense_refunds(academy_id,account_id);
alter table public.account_movements drop constraint account_movements_kind_check;
alter table public.account_movements add constraint account_movements_kind_check check(kind in('cobro','egreso','transferencia','aporte','retiro','apertura','ajuste','reembolso','comision','devolucion_proveedor'));
drop view public.expense_balances;
create view public.expense_balances with(security_invoker=true) as select e.*,e.amount+coalesce((select sum(x.amount) from public.expense_adjustments x where x.expense_id=e.id),0)-coalesce((select sum(p.amount) from public.expense_payments p where p.expense_id=e.id),0)+coalesce((select sum(r.amount) from public.expense_refunds r where r.expense_id=e.id),0) as balance,
case when e.status='anulado' then 'anulado' when e.amount+coalesce((select sum(x.amount) from public.expense_adjustments x where x.expense_id=e.id),0)=coalesce((select sum(p.amount) from public.expense_payments p where p.expense_id=e.id),0)-coalesce((select sum(r.amount) from public.expense_refunds r where r.expense_id=e.id),0) then 'pagado' when exists(select 1 from public.expense_payments p where p.expense_id=e.id) then 'parcial' else 'pendiente' end payment_status from public.expenses e;
grant select on public.expense_balances to authenticated;
create function private.logo_path(a uuid) returns text language sql stable security definer set search_path='' as $$
 select d.path from public.academies ac join public.documents d on d.id=ac.logo_document_id where ac.id=a and private.has_permission(a,null,'dashboard.read')
$$;
revoke all on function private.logo_path(uuid) from public,anon;
grant execute on function private.logo_path(uuid) to authenticated;
create function public.logo_path(p_academy uuid) returns text language sql stable security invoker set search_path='' as $$select private.logo_path(p_academy)$$;
revoke all on function public.logo_path(uuid) from public,anon;
grant execute on function public.logo_path(uuid) to authenticated;
create function private.logo_access(path text) returns boolean language plpgsql stable security invoker set search_path='' as $$
begin return path=private.logo_path(split_part(path,'/',1)::uuid);exception when invalid_text_representation then return false;end$$;
revoke all on function private.logo_access(text) from public,anon;
grant execute on function private.logo_access(text) to authenticated;
alter policy academy_files_read on storage.objects using(bucket_id='academy-private' and (private.storage_access(name,'documents.read') or private.logo_access(name)));
create function public.collection_breakdown(p_academy uuid,p_branch uuid,p_from date,p_to date) returns table(concept text,amount numeric) language plpgsql security invoker set search_path='' as $$
begin
 perform private.require_permission(p_academy,p_branch,'billing.read');
 return query with paid as(select p.* from public.payments p where p.academy_id=p_academy and (p_branch is null or p.branch_id=p_branch) and p.status='confirmado' and (p.created_at at time zone(select timezone from public.academies where id=p_academy))::date between p_from and p_to),
 categorized as(select case c.source when 'membresia' then 'Membresías' when 'venta' then 'Productos y servicios' else 'Otros cargos' end label,pa.amount value from paid p join public.payment_applications pa on pa.payment_id=p.id join public.charges c on c.id=pa.charge_id
 union all select 'Anticipos sin aplicar',p.amount-coalesce((select sum(pa.amount) from public.payment_applications pa where pa.payment_id=p.id),0) from paid p)
 select label,sum(value) from categorized group by label having sum(value)>0 order by label;
end$$;
revoke all on function public.collection_breakdown(uuid,uuid,date,date) from public,anon;
grant execute on function public.collection_breakdown(uuid,uuid,date,date) to authenticated;



create or replace function private.payment(a uuid,b uuid,d jsonb) returns uuid language plpgsql set search_path='' as $$
<<payment_op>>
declare id uuid:=gen_random_uuid(); amount numeric:=private.number(d,'amount'); tendered numeric:=coalesce((d->>'tendered')::numeric,amount);
 method public.payment_methods; s uuid; n bigint; item jsonb; c public.charges; remaining numeric; applied numeric:=0; fee numeric; sale record;
begin
 perform private.require_permission(a,b,'billing.collect');
 if amount<=0 or tendered<amount or tendered<>round(tendered,2) then raise exception 'Importe o efectivo entregado inválido'; end if;
 select * into method from public.payment_methods where academy_id=a and payment_methods.id=(d->>'method_id')::uuid and active;
 if not found then raise exception 'Medio de pago no válido'; end if;
 if method.kind<>'efectivo' and tendered<>amount then raise exception 'Solo el efectivo admite cambio'; end if;
 if method.requires_verification and nullif(d->>'reference','') is null then raise exception 'Escribe la referencia de la transferencia'; end if;
 s:=private.session_for(a,b,(d->>'account_id')::uuid);
 -- Deterministic row locks: two cashiers cannot overpay the same charge.
 perform 1 from public.charges where academy_id=a and charges.id in(select (value->>'charge_id')::uuid from jsonb_array_elements(coalesce(d->'applications','[]'))) order by charges.id for update;
 for item in select value from jsonb_array_elements(coalesce(d->'applications','[]')) loop
  select * into c from public.charges where academy_id=a and charges.id=(item->>'charge_id')::uuid and status='emitido';
  if not found then raise exception 'Cargo inválido'; end if;
  perform private.require_permission(a,c.branch_id,'billing.collect');
  -- Pending transfers reserve their allocation but never settle the debt.
  select c.amount+coalesce((select sum(ca.amount) from public.charge_adjustments ca where ca.charge_id=c.id),0)-coalesce(sum(pa.amount),0)+coalesce((select sum(ra.amount) from public.refund_applications ra join public.payment_applications ap on ap.id=ra.application_id where ap.charge_id=c.id),0) into remaining from public.payment_applications pa where pa.charge_id=c.id;
  if private.number(item,'amount')<=0 or private.number(item,'amount')>remaining then raise exception 'La aplicación supera el saldo disponible del cargo'; end if;
  applied:=applied+private.number(item,'amount');
 end loop;
 if applied>amount then raise exception 'Las aplicaciones superan el pago'; end if;
 insert into public.document_counters(academy_id,kind) values(a,'recibo') on conflict(academy_id,kind) do nothing;
 update public.document_counters set next_number=next_number+1 where academy_id=a and kind='recibo' returning next_number-1 into n;
 fee:=round(amount*method.fee_percent/100+method.fee_fixed,2);
 if fee>=amount then raise exception 'La comisión debe ser menor que el pago'; end if;
 insert into public.payments(id,academy_id,branch_id,student_id,payer_id,account_id,method_id,session_id,amount,tendered,fee,status,reference,receipt_number,actor,receipt_prefix)
 values(id,a,b,nullif(d->>'student_id','')::uuid,nullif(d->>'payer_id','')::uuid,(d->>'account_id')::uuid,method.id,s,amount,tendered,fee,case when method.requires_verification then 'pendiente' else 'confirmado' end,d->>'reference',n,auth.uid(),(select prefix from public.document_counters where academy_id=a and kind='recibo'));
 for item in select value from jsonb_array_elements(coalesce(d->'applications','[]')) loop
 insert into public.payment_applications(academy_id,payment_id,charge_id,amount,confirmed) values(a,id,(item->>'charge_id')::uuid,private.number(item,'amount'),not method.requires_verification); end loop;
 if not method.requires_verification then
 perform private.move(a,b,(d->>'account_id')::uuid,amount,'cobro',id,'Recibo '||n);
 if fee>0 then perform private.move(a,b,(d->>'account_id')::uuid,-fee,'comision',id,'Comisión del medio de pago'); end if;
 for sale in select sl.id,sl.branch_id,pa.amount from public.sales sl join public.payment_applications pa on pa.charge_id=sl.charge_id where pa.payment_id=payment_op.id loop perform private.commission(a,sale.branch_id,sale.id,sale.amount,payment_op.id,'cobro'); end loop;
 end if;
 return id;
end $$;

create or replace function private.operate(a uuid,b uuid,action text,d jsonb,key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
<<mutation>>
declare result jsonb; id uuid:=gen_random_uuid(); actor uuid:=auth.uid(); amount numeric; total numeric; cost numeric; quantity numeric; applied numeric;
 oldpayload jsonb; oldaction text; reason text:=nullif(trim(d->>'reason'),''); item jsonb; rowdata record; branch2 uuid;
 session public.cash_sessions; payment public.payments; version public.plan_versions; member public.memberships; variant public.product_variants; employee public.employees; compensation public.compensation_versions; refundable numeric; refundpart numeric; allocation record; sale_commission record; sale_total numeric; debt_total numeric; debt_left numeric; sale_left numeric; allocations jsonb; line_index int; line_discount numeric; discounts_used numeric;
begin
 if actor is null or key is null then raise exception 'Se requiere sesión e identificador de operación' using errcode='42501'; end if;
 perform private.require_permission(a,b,'dashboard.read');
 if b is not null and not exists(select 1 from public.branches where academy_id=a and branches.id=b and active) then raise exception 'Sucursal inválida'; end if;
 insert into public.operation_keys(academy_id,key,action,payload) values(a,key,action,d) on conflict on constraint operation_keys_academy_id_key_key do nothing;
 select op.result,op.payload,op.action into result,oldpayload,oldaction from public.operation_keys op where op.academy_id=a and op.key=operate.key for update;
 if oldpayload<>d or oldaction<>action then raise exception 'La clave de reintento pertenece a otra operación'; end if;
 if result is not null then return result; end if;
 case action
 when 'exchange_sale' then
  if jsonb_array_length(d->'return')<>1 or jsonb_array_length(d->'sale')<>1 then raise exception 'Agrega exactamente una devolución y una nueva venta'; end if;
  result:=jsonb_build_object('return',private.operate(a,b,'return_sale',d->'return'->0,gen_random_uuid()),'sale',private.operate(a,b,'sale',d->'sale'->0,gen_random_uuid()),'id',id);
 when 'academy_logo' then
  perform private.require_permission(a,null,'settings.write');
  if not exists(select 1 from public.documents where academy_id=a and documents.id=(d->>'document_id')::uuid and mime_type in('image/png','image/jpeg')) then raise exception 'Selecciona una imagen de esta academia'; end if;
  update public.academies set logo_document_id=(d->>'document_id')::uuid where academies.id=a;id:=a;
 when 'numbering' then
  perform private.require_permission(a,null,'settings.write');
  if d->>'kind'<>'recibo' or (d->>'next_number')::bigint<=coalesce((select max(receipt_number) from public.payments where academy_id=a),0) then raise exception 'La siguiente numeración debe superar todos los recibos emitidos'; end if;
  insert into public.document_counters(academy_id,kind,next_number,prefix) values(a,'recibo',(d->>'next_number')::bigint,coalesce(d->>'prefix','')) on conflict(academy_id,kind) do update set next_number=excluded.next_number,prefix=excluded.prefix returning document_counters.id into id;
 when 'edit_role' then
  perform private.require_permission(a,null,'owner.manage');
  select * into rowdata from public.roles where academy_id=a and roles.id=(d->>'role_id')::uuid for update;
  if not found or '*'=any(rowdata.permissions) then raise exception 'El rol propietario conserva sus permisos'; end if;
  if exists(select 1 from public.member_roles mr join public.internal_members m on m.id=mr.member_id where mr.role_id=rowdata.id and m.user_id=actor) then raise exception 'No puedes editar un rol que te otorga acceso'; end if;
  update public.roles set name=d->>'name',active=(d->>'active')::boolean,permissions=array(select value from jsonb_array_elements_text(d->'permissions')) where roles.id=rowdata.id;id:=rowdata.id;
 when 'cancel_expense' then
  perform private.require_permission(a,b,'expenses.approve');
  select * into rowdata from public.expenses where academy_id=a and expenses.id=(d->>'expense_id')::uuid and branch_id=b for update;
  if not found or rowdata.source in('compra','personal') or exists(select 1 from public.expense_payments where expense_id=rowdata.id) or reason is null then raise exception 'Solo se anulan gastos operativos sin pagos y con motivo'; end if;
  update public.expenses set status='anulado' where expenses.id=rowdata.id;id:=rowdata.id;
 when 'expense_document' then
  perform private.require_permission(a,b,'expenses.write');
  if not exists(select 1 from public.documents where academy_id=a and documents.id=(d->>'document_id')::uuid and branch_id=b) then raise exception 'Documento de otra sucursal'; end if;
  update public.expenses set document_path=(select path from public.documents where documents.id=(d->>'document_id')::uuid) where academy_id=a and expenses.id=(d->>'expense_id')::uuid and branch_id=b returning expenses.id into id;
  if id is null then raise exception 'Gasto no encontrado'; end if;
 when 'return_purchase' then
  perform private.require_permission(a,b,'inventory.approve');perform private.require_permission(a,b,'expenses.approve');
  quantity:=(d->>'quantity')::numeric;
  select l.* into rowdata from public.purchase_lines l join public.purchases p on p.id=l.purchase_id where l.academy_id=a and l.id=(d->>'line_id')::uuid and p.branch_id=b for update of l;
  if not found or quantity<=0 or quantity>rowdata.received-rowdata.returned or reason is null then raise exception 'Devolución superior a las unidades recibidas o sin motivo'; end if;
  amount:=round(quantity*rowdata.unit_cost,2);
  perform 1 from public.expenses where expenses.id=rowdata.purchase_id for update;
  total:=greatest(0,amount-(select balance from public.expense_balances where expense_balances.id=rowdata.purchase_id));
  if total>0 then
   perform private.require_permission(a,b,'expenses.pay');perform private.require_permission(a,b,'treasury.write');
   if not coalesce((d->>'supplier_refund_confirmed')::boolean,false) or nullif(trim(d->>'reference'),'') is null or nullif(d->>'refund_account_id','') is null then raise exception 'Confirma la recepción real del dinero e indica cuenta y referencia del proveedor'; end if;
   perform private.move(a,b,(d->>'refund_account_id')::uuid,total,'devolucion_proveedor',id,'Devolución del proveedor: '||(d->>'reference'));
   insert into public.expense_refunds(academy_id,branch_id,expense_id,account_id,amount,reference,actor) values(a,b,rowdata.purchase_id,(d->>'refund_account_id')::uuid,total,d->>'reference',actor);
  end if;
  perform private.stock_move(a,b,rowdata.variant_id,-quantity,rowdata.unit_cost,'devolucion_proveedor',id,reason);
  update public.purchase_lines set returned=returned+quantity where purchase_lines.id=rowdata.id;
  if amount>0 then insert into public.expense_adjustments(academy_id,branch_id,expense_id,amount,reason,actor) values(a,b,rowdata.purchase_id,-amount,reason,actor);end if;

 when 'product_price' then
  perform private.require_permission(a,null,'inventory.write');
  insert into public.product_prices(id,academy_id,variant_id,effective_on,price) values(id,a,(d->>'variant_id')::uuid,(d->>'effective_on')::date,private.number(d,'price'));
 when 'plan_version' then
  perform private.require_permission(a,null,'billing.write');
  insert into public.plan_versions(id,academy_id,plan_id,price,months,valid_days,weekly_limit,class_count,effective_on,renewable)
  values(id,a,(d->>'plan_id')::uuid,private.number(d,'price'),(d->>'months')::int,(d->>'valid_days')::int,nullif(d->>'weekly_limit','')::int,nullif(d->>'class_count','')::int,(d->>'effective_on')::date,coalesce((d->>'renewable')::boolean,true));
 when 'membership' then
  perform private.require_permission(a,b,'billing.write');
  select * into version from public.plan_versions where academy_id=a and plan_versions.id=(d->>'plan_version_id')::uuid and effective_on<=(d->>'starts_on')::date;
  if not found then raise exception 'Tarifa no vigente'; end if;
  if not exists(select 1 from public.students where academy_id=a and students.id=(d->>'student_id')::uuid and branch_id=b and status='activo') then raise exception 'Estudiante no activo en la sucursal'; end if;
  amount:=coalesce((d->>'discount')::numeric,0);
  if amount>0 then perform private.require_permission(a,b,'billing.discount'); end if;
  if amount<0 or amount>version.price then raise exception 'Descuento inválido'; end if;
  if d->>'billing_mode'='fijo' then
   if nullif(d->>'anchor_day','') is null then raise exception 'Indica el día de cobro fijo'; end if;
   branch2:=null; -- not reused as a date; compute the initial billing boundary below
  end if;
  insert into public.memberships(id,academy_id,branch_id,student_id,plan_version_id,starts_on,ends_on,next_charge_on,anchor_day,billing_mode,remaining_classes,discount)
  values(id,a,b,(d->>'student_id')::uuid,version.id,(d->>'starts_on')::date,
   case when version.renewable then private.next_date((d->>'starts_on')::date,version.months,extract(day from (d->>'starts_on')::date)::int)-1 else (d->>'starts_on')::date+version.valid_days-1 end,
   private.next_date((d->>'starts_on')::date,version.months,coalesce(nullif(d->>'anchor_day','')::int,extract(day from (d->>'starts_on')::date)::int)),
   coalesce(nullif(d->>'anchor_day','')::int,extract(day from (d->>'starts_on')::date)::int),coalesce(d->>'billing_mode','aniversario'),version.class_count,amount);
  if d->>'billing_mode'='fijo' then
   update public.memberships set next_charge_on=case when private.next_date((d->>'starts_on')::date,0,(d->>'anchor_day')::int)>(d->>'starts_on')::date then private.next_date((d->>'starts_on')::date,0,(d->>'anchor_day')::int) else private.next_date((d->>'starts_on')::date,version.months,(d->>'anchor_day')::int) end where memberships.id=id;
   update public.memberships set ends_on=next_charge_on-1 where memberships.id=id;
  end if;
  total:=version.price-amount;
  if d->>'billing_mode'='fijo' and (select proration_policy from public.academies where academies.id=a)='dias_calendario' then
   total:=round(total*least(1,((select next_charge_on from public.memberships where memberships.id=id)-(d->>'starts_on')::date)::numeric/(private.next_date((d->>'starts_on')::date,version.months,extract(day from (d->>'starts_on')::date)::int)-(d->>'starts_on')::date)),2);
  end if;
  insert into public.charges(academy_id,branch_id,student_id,membership_id,description,amount,due_on,period_on,source)
  values(a,b,(d->>'student_id')::uuid,id,'Inicio de membresía',total,(d->>'starts_on')::date,(d->>'starts_on')::date,'membresia');
 when 'membership_state' then
  perform private.require_permission(a,b,'billing.write');
  if reason is null then raise exception 'Escribe el motivo'; end if;
  select * into member from public.memberships where academy_id=a and memberships.id=(d->>'membership_id')::uuid and branch_id=b for update;
  if not found then raise exception 'Membresía no encontrada'; end if;
  if d->>'status'='activa' and member.status='congelada' then
   if (select pause_policy from public.academies where academies.id=a)='extender' then
    quantity:=(d->>'effective_on')::date-coalesce((select me.effective_on from public.membership_events me where me.membership_id=member.id and me.action='congelada' order by me.created_at desc limit 1),(d->>'effective_on')::date);
    update public.memberships set next_charge_on=next_charge_on+greatest(0,quantity::int),ends_on=ends_on+greatest(0,quantity::int) where memberships.id=member.id;
   else update public.memberships set next_charge_on=greatest(next_charge_on,(d->>'effective_on')::date), ends_on=greatest(ends_on,(d->>'effective_on')::date) where memberships.id=member.id; end if;
  end if;
  if d->>'status'='cancelada' and (select cancel_policy from public.academies where academies.id=a)='fin_periodo' then
   update public.memberships set canceled_on=member.ends_on where memberships.id=member.id;
  else
  update public.memberships set status=d->>'status',frozen_until=nullif(d->>'frozen_until','')::date where memberships.id=member.id;
  end if;
  insert into public.membership_events(academy_id,membership_id,action,reason,actor,effective_on) values(a,member.id,d->>'status',reason,actor,(d->>'effective_on')::date); id:=member.id;
 when 'charge' then
  perform private.require_permission(a,b,'billing.write');
  if nullif(d->>'student_id','') is not null and not exists(select 1 from public.students where academy_id=a and students.id=(d->>'student_id')::uuid and branch_id=b) then raise exception 'Estudiante de otra sucursal'; end if;
  insert into public.charges(id,academy_id,branch_id,student_id,description,amount,due_on) values(id,a,b,nullif(d->>'student_id','')::uuid,d->>'description',private.number(d,'amount'),(d->>'due_on')::date);
 when 'payment' then id:=private.payment(a,b,d);
 when 'apply_credit' then
  perform private.require_permission(a,b,'billing.collect');
  select * into payment from public.payments where academy_id=a and payments.id=(d->>'payment_id')::uuid and branch_id=b and status='confirmado' for update;
  if not found then raise exception 'Pago confirmado no disponible'; end if;
  total:=payment.amount-coalesce((select sum(pa.amount) from public.payment_applications pa where pa.payment_id=payment.id),0)-coalesce((select sum(r.amount) from public.refunds r where r.payment_id=payment.id),0)+coalesce((select sum(ra.amount) from public.refund_applications ra join public.refunds r on r.id=ra.refund_id where r.payment_id=payment.id),0);
  applied:=0;
  perform 1 from public.charges where academy_id=a and charges.id in(select (value->>'charge_id')::uuid from jsonb_array_elements(d->'applications')) order by charges.id for update;
  for item in select value from jsonb_array_elements(d->'applications') loop
   select c.branch_id,c.amount+coalesce((select sum(ca.amount) from public.charge_adjustments ca where ca.charge_id=c.id),0)-coalesce((select sum(pa.amount) from public.payment_applications pa where pa.charge_id=c.id),0)+coalesce((select sum(ra.amount) from public.refund_applications ra join public.payment_applications pa on pa.id=ra.application_id where pa.charge_id=c.id),0) remaining into rowdata from public.charges c where c.academy_id=a and c.id=(item->>'charge_id')::uuid and c.status='emitido';
   if not found then raise exception 'Cargo no disponible'; end if;
   perform private.require_permission(a,rowdata.branch_id,'billing.collect');amount:=private.number(item,'amount');
   if amount<=0 or amount>rowdata.remaining then raise exception 'Aplicación superior al saldo del cargo'; end if;applied:=applied+amount;
   if applied>total then raise exception 'Aplicaciones superiores al saldo a favor'; end if;
   insert into public.payment_applications(academy_id,payment_id,charge_id,amount,confirmed) values(a,payment.id,(item->>'charge_id')::uuid,amount,true) on conflict(payment_id,charge_id) do update set amount=payment_applications.amount+excluded.amount;
   for sale_commission in select sl.id,sl.branch_id from public.sales sl where sl.charge_id=(item->>'charge_id')::uuid loop perform private.commission(a,sale_commission.branch_id,sale_commission.id,amount,id,'cobro'); end loop;
  end loop;id:=payment.id;
 when 'charge_adjustment' then
  perform private.require_permission(a,b,'billing.refund');amount:=private.number(d,'amount');
  if reason is null or amount=0 then raise exception 'Indica importe y motivo del ajuste'; end if;
  perform 1 from public.charges where charges.id=(d->>'charge_id')::uuid and academy_id=a for update;
  select * into rowdata from public.charge_balances cb where cb.academy_id=a and cb.id=(d->>'charge_id')::uuid and cb.branch_id=b;
  if rowdata.id is null or rowdata.balance+amount<0 then raise exception 'El ajuste no puede exceder la deuda pendiente'; end if;
  insert into public.charge_adjustments(id,academy_id,branch_id,charge_id,amount,reason,actor) values(id,a,b,rowdata.id,amount,reason,actor);
 when 'change_plan' then
  perform private.require_permission(a,b,'billing.write');if reason is null then raise exception 'Indica el motivo'; end if;
  select * into member from public.memberships where academy_id=a and memberships.id=(d->>'membership_id')::uuid and branch_id=b for update;
  if not found then raise exception 'Membresía no encontrada'; end if;
  update public.memberships set status='cancelada' where memberships.id=member.id;
  result:=private.operate(a,b,'membership',jsonb_build_object('student_id',member.student_id,'plan_version_id',d->>'plan_version_id','starts_on',d->>'effective_on','billing_mode',member.billing_mode,'anchor_day',member.anchor_day,'discount',coalesce(d->>'discount','0')),gen_random_uuid());
  insert into public.membership_events(academy_id,membership_id,action,reason,actor,effective_on) values(a,member.id,'cambio_plan',reason,actor,(d->>'effective_on')::date);
 when 'confirm_payment' then
  perform private.require_permission(a,b,'billing.verify');
  select * into payment from public.payments where academy_id=a and payments.id=(d->>'payment_id')::uuid and branch_id=b for update;
  if not found then raise exception 'Pago no encontrado'; end if;
  if payment.status='pendiente' then
   perform private.move(a,b,payment.account_id,payment.amount,'cobro',payment.id,'Transferencia verificada');
   if payment.fee>0 then perform private.move(a,b,payment.account_id,-payment.fee,'comision',payment.id,'Comisión del medio de pago'); end if;
   update public.payments set status='confirmado',session_id=private.session_for(a,b,payment.account_id) where payments.id=payment.id;
   update public.payment_applications set confirmed=true where payment_id=payment.id;
   for sale_commission in select sl.id,sl.branch_id,pa.amount from public.sales sl join public.payment_applications pa on pa.charge_id=sl.charge_id where pa.payment_id=payment.id loop perform private.commission(a,sale_commission.branch_id,sale_commission.id,sale_commission.amount,payment.id,'cobro'); end loop;
  end if; id:=payment.id;
 when 'refund' then
  perform private.require_permission(a,b,'billing.refund');
  amount:=private.number(d,'amount');
  if reason is null or amount<=0 then raise exception 'Indica importe y motivo'; end if;
  select * into payment from public.payments where academy_id=a and payments.id=(d->>'payment_id')::uuid and branch_id=b and status='confirmado' for update;
  if not found then raise exception 'Pago confirmado no encontrado'; end if;
  if amount>payment.amount-coalesce((select sum(r.amount) from public.refunds r where r.payment_id=payment.id),0) then raise exception 'Reembolso superior a lo cobrado'; end if;
  insert into public.refunds(id,academy_id,branch_id,payment_id,amount,reason,actor) values(id,a,b,payment.id,amount,reason,actor);
  perform private.move(a,b,payment.account_id,-amount,'reembolso',id,reason);
  -- Release allocations from the latest applications; remaining unapplied credit first.
  applied:=case when d->>'charge_id' is not null then amount else greatest(0,amount-(payment.amount-coalesce((select sum(pa.amount) from public.payment_applications pa where pa.payment_id=payment.id),0)-coalesce((select sum(r.amount) from public.refunds r where r.payment_id=payment.id and r.id<>id),0)+coalesce((select sum(ra.amount) from public.refund_applications ra join public.refunds r on r.id=ra.refund_id where r.payment_id=payment.id),0))) end;
  for rowdata in select pa.id,pa.amount-coalesce((select sum(ra.amount) from public.refund_applications ra where ra.application_id=pa.id),0) remaining from public.payment_applications pa where pa.payment_id=payment.id and (d->>'charge_id' is null or pa.charge_id=(d->>'charge_id')::uuid) order by pa.created_at desc,pa.id loop
   exit when applied<=0;
   total:=least(applied,rowdata.remaining);
   if total>0 then insert into public.refund_applications(academy_id,refund_id,application_id,amount) values(a,id,rowdata.id,total); applied:=applied-total; end if;
  end loop;
  if applied>0 then raise exception 'No se puede liberar la aplicación del reembolso'; end if;
  for sale_commission in select sl.id,sl.branch_id,ra.amount from public.sales sl join public.payment_applications pa on pa.charge_id=sl.charge_id join public.refund_applications ra on ra.application_id=pa.id where ra.refund_id=id loop perform private.commission(a,sale_commission.branch_id,sale_commission.id,-sale_commission.amount,id,'reembolso'); end loop;
 when 'open_cash' then
  perform private.require_permission(a,b,'treasury.write'); amount:=private.number(d,'opening_amount');
  if amount<0 then raise exception 'Fondo inicial inválido'; end if;
  perform 1 from public.accounts where academy_id=a and accounts.id=(d->>'account_id')::uuid and branch_id=b and kind<>'banco' and active for update;
  if not found then raise exception 'Caja no disponible'; end if;
  total:=coalesce((select sum(m.amount) from public.account_movements m where m.account_id=(d->>'account_id')::uuid),0);
  if exists(select 1 from public.cash_sessions where account_id=(d->>'account_id')::uuid) and total<>amount then raise exception 'El fondo contado debe coincidir con el saldo; registra antes un ajuste autorizado'; end if;
  if total<>0 and total<>amount then raise exception 'El fondo no coincide con los movimientos'; end if;
  insert into public.cash_sessions(id,academy_id,branch_id,account_id,cashier,opening_amount) values(id,a,b,(d->>'account_id')::uuid,actor,amount);
  if total=0 and amount>0 and not exists(select 1 from public.account_movements where account_id=(d->>'account_id')::uuid) then perform private.move(a,b,(d->>'account_id')::uuid,amount,'apertura',id,'Fondo inicial explícito'); end if;
 when 'close_cash' then
  perform private.require_permission(a,b,'treasury.write');
  select * into session from public.cash_sessions where academy_id=a and cash_sessions.id=(d->>'session_id')::uuid and branch_id=b and closed_at is null and cashier=actor for update;
  if not found then raise exception 'Sesión abierta no encontrada'; end if;
  total:=coalesce((select sum(m.amount) from public.account_movements m where m.account_id=session.account_id),0); amount:=private.number(d,'counted');
  if amount<0 or (amount<>total and reason is null) then raise exception 'Justifica la diferencia de caja'; end if;
  update public.cash_sessions set closed_at=now(),expected=total,counted=amount,difference=amount-total,reason=reason where cash_sessions.id=session.id; id:=session.id;
 when 'approve_difference' then
  perform private.require_permission(a,b,'treasury.approve');
  select * into session from public.cash_sessions where academy_id=a and cash_sessions.id=(d->>'session_id')::uuid and branch_id=b and closed_at is not null and approved_by is null for update;
  if not found or reason is null then raise exception 'Cierre no disponible o motivo vacío'; end if;
  -- A separate adjustment is visible; the closed session remains immutable.
  if session.difference<>0 then
   insert into public.account_movements(academy_id,branch_id,account_id,amount,kind,source_id,description,actor) values(a,b,session.account_id,session.difference,'ajuste',session.id,reason,actor);
  end if;
  update public.cash_sessions set approved_by=actor where cash_sessions.id=session.id; id:=session.id;
 when 'transfer' then
  perform private.require_permission(a,b,'treasury.write'); amount:=private.number(d,'amount');
  select branch_id into branch2 from public.accounts where academy_id=a and accounts.id=(d->>'to_account_id')::uuid;
  perform private.require_permission(a,branch2,'treasury.write');
  if reason is null or amount<=0 or d->>'from_account_id'=d->>'to_account_id' then raise exception 'Transferencia inválida'; end if;
  perform 1 from public.accounts where academy_id=a and accounts.id in((d->>'from_account_id')::uuid,(d->>'to_account_id')::uuid) order by accounts.id for update;
  insert into public.transfers(id,academy_id,branch_id,from_account_id,to_account_id,amount,reason) values(id,a,b,(d->>'from_account_id')::uuid,(d->>'to_account_id')::uuid,amount,reason);
  perform private.move(a,b,(d->>'from_account_id')::uuid,-amount,'transferencia',id,reason);
  perform private.move(a,branch2,(d->>'to_account_id')::uuid,amount,'transferencia',id,reason);
 when 'account_adjustment' then
  perform private.require_permission(a,b,'treasury.approve');
  if reason is null or d->>'kind' not in ('aporte','retiro','ajuste','apertura') then raise exception 'Movimiento o motivo inválido'; end if;
  amount:=private.number(d,'amount');
  perform private.move(a,b,(d->>'account_id')::uuid,amount,d->>'kind',id,reason);
 when 'reconcile' then
  perform private.require_permission(a,b,'treasury.approve');
  update public.account_movements set reconciled_on=(d->>'reconciled_on')::date where academy_id=a and account_movements.id=(d->>'movement_id')::uuid and branch_id=b returning account_movements.id into id;
  if id is null then raise exception 'Movimiento no encontrado'; end if;
 when 'expense' then
  perform private.require_permission(a,b,'expenses.write'); amount:=private.number(d,'amount');
  insert into public.expenses(id,academy_id,branch_id,supplier_id,description,category,category_id,amount,due_on,incurred_on,status,approved_by)
  values(id,a,b,nullif(d->>'supplier_id','')::uuid,d->>'description',coalesce((select name from public.expense_categories where academy_id=a and expense_categories.id=nullif(d->>'category_id','')::uuid and active),d->>'category'),nullif(d->>'category_id','')::uuid,amount,(d->>'due_on')::date,(d->>'incurred_on')::date,
   case when amount<=(select expense_approval_limit from public.academies where academies.id=a) then 'aprobado' else 'pendiente' end,
   case when amount<=(select expense_approval_limit from public.academies where academies.id=a) then actor else null end);
 when 'approve_expense' then
  perform private.require_permission(a,b,'expenses.approve');
  update public.expenses set status='aprobado',approved_by=actor where academy_id=a and expenses.id=(d->>'expense_id')::uuid and branch_id=b and status='pendiente' returning expenses.id into id;
  if id is null then raise exception 'Obligación no disponible'; end if;
 when 'pay_expense' then
  perform private.require_permission(a,b,'expenses.pay'); amount:=private.number(d,'amount');
  select * into rowdata from public.expenses where academy_id=a and expenses.id=(d->>'expense_id')::uuid and branch_id=b and status='aprobado' for update;
  if not found then raise exception 'Obligación pendiente de aprobación'; end if;
  if amount<=0 or amount>(select balance from public.expense_balances where expense_balances.id=rowdata.id) then raise exception 'Pago superior al saldo pendiente'; end if;
  perform private.move(a,b,(d->>'account_id')::uuid,-amount,'egreso',id,rowdata.description);
  insert into public.expense_payments(id,academy_id,branch_id,expense_id,account_id,session_id,amount,actor) values(id,a,b,rowdata.id,(d->>'account_id')::uuid,private.session_for(a,b,(d->>'account_id')::uuid),amount,actor);
  update public.settlements set status='pagada' where expense_id=rowdata.id and rowdata.amount=(select sum(p.amount) from public.expense_payments p where p.expense_id=rowdata.id);
 when 'inventory_adjustment' then
  perform private.require_permission(a,b,'inventory.approve');
  if reason is null then raise exception 'Indica el motivo del ajuste'; end if;
  perform private.stock_move(a,b,(d->>'variant_id')::uuid,(d->>'quantity')::numeric,private.number(d,'unit_cost'),'ajuste',id,reason);
 when 'purchase' then
  perform private.require_permission(a,b,'inventory.write'); total:=0;
  for item in select value from jsonb_array_elements(d->'lines') loop
   if (item->>'quantity')::numeric<=0 then raise exception 'Cantidad inválida'; end if;
   total:=total+round((item->>'quantity')::numeric*private.number(item,'unit_cost'),2);
  end loop;
  if total<=0 then raise exception 'Agrega líneas a la compra'; end if;
  insert into public.expenses(id,academy_id,branch_id,supplier_id,description,category,amount,due_on,incurred_on,source,source_id)
  values(id,a,b,(d->>'supplier_id')::uuid,'Compra de inventario','Inventario',total,(d->>'due_on')::date,(d->>'ordered_on')::date,'compra',id);
  insert into public.purchases(id,academy_id,branch_id,supplier_id,expense_id,ordered_on,reference) values(id,a,b,(d->>'supplier_id')::uuid,id,(d->>'ordered_on')::date,d->>'reference');
  for item in select value from jsonb_array_elements(d->'lines') loop
   insert into public.purchase_lines(academy_id,purchase_id,variant_id,quantity,unit_cost) values(a,id,(item->>'variant_id')::uuid,(item->>'quantity')::numeric,private.number(item,'unit_cost'));
  end loop;
 when 'receive_purchase' then
  perform private.require_permission(a,b,'inventory.write');
  select * into rowdata from public.purchase_lines l where l.academy_id=a and l.id=(d->>'line_id')::uuid for update;
  if not found or not exists(select 1 from public.purchases p where p.id=rowdata.purchase_id and p.branch_id=b and p.status<>'anulado') then raise exception 'Línea no disponible'; end if;
  quantity:=(d->>'quantity')::numeric;
  if quantity<=0 or quantity>rowdata.quantity-rowdata.received then raise exception 'Cantidad superior a lo pendiente de recibir'; end if;
  perform private.stock_move(a,b,rowdata.variant_id,quantity,rowdata.unit_cost,'compra',id,'Recepción de compra');
  update public.purchase_lines set received=received+quantity where purchase_lines.id=rowdata.id;
  update public.purchases set status=case when exists(select 1 from public.purchase_lines l where l.purchase_id=rowdata.purchase_id and l.received<l.quantity) then 'parcial' else 'recibido' end where purchases.id=rowdata.purchase_id;
 when 'send_stock' then
  perform private.require_permission(a,b,'inventory.write'); perform private.require_permission(a,(d->>'to_branch_id')::uuid,'inventory.write');
  if reason is null or (d->>'to_branch_id')::uuid=b or (d->>'quantity')::numeric<=0 then raise exception 'Transferencia de inventario inválida'; end if;
  select average_cost into cost from public.stock where academy_id=a and branch_id=b and variant_id=(d->>'variant_id')::uuid for update;
  if not found then raise exception 'Sin existencias'; end if;
  perform private.stock_move(a,b,(d->>'variant_id')::uuid,-(d->>'quantity')::numeric,cost,'envio',id,reason);
  insert into public.stock_transfers(id,academy_id,branch_id,to_branch_id,variant_id,quantity,unit_cost,reason) values(id,a,b,(d->>'to_branch_id')::uuid,(d->>'variant_id')::uuid,(d->>'quantity')::numeric,cost,reason);
 when 'receive_stock' then
  perform private.require_permission(a,b,'inventory.write');
  select * into rowdata from public.stock_transfers where academy_id=a and stock_transfers.id=(d->>'transfer_id')::uuid and to_branch_id=b and status='enviado' for update;
  if not found then raise exception 'Envío no disponible'; end if;
  perform private.stock_move(a,b,rowdata.variant_id,rowdata.quantity,rowdata.unit_cost,'recepcion',rowdata.id,rowdata.reason);
  update public.stock_transfers set status='recibido' where stock_transfers.id=rowdata.id; id:=rowdata.id;
 when 'sale' then
  perform private.require_permission(a,b,'sales.write');
  total:=0; amount:=coalesce((d->>'discount')::numeric,0);
  if amount<>0 then perform private.require_permission(a,b,'sales.discount'); end if;
  if nullif(d->>'student_id','') is not null and not exists(select 1 from public.students where academy_id=a and students.id=(d->>'student_id')::uuid and branch_id=b) then raise exception 'Estudiante de otra sucursal'; end if;
  -- Serialize variant prices and stock in stable order before computing totals.
  perform 1 from public.product_variants where academy_id=a and product_variants.id in(select (value->>'variant_id')::uuid from jsonb_array_elements(d->'lines')) order by product_variants.id for update;
  for item in select value from jsonb_array_elements(d->'lines') loop
   select * into variant from public.product_variants where academy_id=a and product_variants.id=(item->>'variant_id')::uuid and active;
   if not found or (item->>'quantity')::numeric<=0 then raise exception 'Producto o cantidad inválidos'; end if;
   variant.price:=private.variant_price(a,variant.id);
   total:=total+round(variant.price*(item->>'quantity')::numeric,2);
  end loop;
  if total<=0 or amount<0 or amount>=total or amount<>round(amount,2) then raise exception 'Carrito o descuento inválidos'; end if;
  if amount>(select max_discount_percent from public.academies where academies.id=a)*total/100 then raise exception 'El descuento supera el límite de la academia'; end if;
  total:=total-amount;
  sale_total:=total;debt_total:=0;discounts_used:=0;line_index:=0;
  perform 1 from public.charges where academy_id=a and charges.id in(select (value->>'charge_id')::uuid from jsonb_array_elements(coalesce(d->'existing_charges','[]'))) order by charges.id for update;
  for item in select value from jsonb_array_elements(coalesce(d->'existing_charges','[]')) loop
   select cb.balance into debt_left from public.charge_balances cb where cb.academy_id=a and cb.branch_id=b and cb.id=(item->>'charge_id')::uuid;
   if debt_left is null or private.number(item,'amount')<=0 or private.number(item,'amount')>debt_left then raise exception 'Cargo existente o importe no disponible'; end if;
   debt_total:=debt_total+private.number(item,'amount');
  end loop;
  insert into public.charges(id,academy_id,branch_id,student_id,description,amount,due_on,source) values(id,a,b,nullif(d->>'student_id','')::uuid,'Venta de productos y servicios',total,(d->>'due_on')::date,'venta');
  insert into public.sales(id,academy_id,branch_id,student_id,customer_name,charge_id,total,discount,seller) values(id,a,b,nullif(d->>'student_id','')::uuid,d->>'customer_name',id,total,amount,actor);
  for item in select value from jsonb_array_elements(d->'lines') loop
   select * into variant from public.product_variants where academy_id=a and product_variants.id=(item->>'variant_id')::uuid;
   variant.price:=private.variant_price(a,variant.id);
   select average_cost into cost from public.stock where academy_id=a and branch_id=b and variant_id=variant.id;
   cost:=coalesce(cost,0); quantity:=(item->>'quantity')::numeric;
   if (select kind from public.products where products.id=variant.product_id)<>'servicio' then perform private.stock_move(a,b,variant.id,-quantity,cost,'venta',id,'Venta confirmada'); end if;
   line_index:=line_index+1;
   line_discount:=case when line_index=jsonb_array_length(d->'lines') then amount-discounts_used else round(amount*round(variant.price*quantity,2)/(total+amount),2) end;
   discounts_used:=discounts_used+line_discount;
   insert into public.sale_lines(academy_id,sale_id,variant_id,quantity,unit_price,unit_cost,discount) values(a,id,variant.id,quantity,variant.price,cost,line_discount);
  end loop;
  applied:=0;sale_left:=sale_total;
  allocations:=coalesce(d->'existing_charges','[]');
  for item in select value from jsonb_array_elements(coalesce(d->'payments','[]')) loop
   amount:=private.number(item,'amount');applied:=applied+amount;
   if applied>sale_total+debt_total then raise exception 'Pagos mayores al total de venta y cargos existentes'; end if;
   declare payment_allocations jsonb:='[]'; debt_item jsonb; new_debts jsonb:='[]'; part numeric; begin
    part:=least(amount,sale_left);if part>0 then payment_allocations:=jsonb_build_array(jsonb_build_object('charge_id',id,'amount',part));sale_left:=sale_left-part;amount:=amount-part;end if;
    for debt_item in select value from jsonb_array_elements(allocations) loop
     debt_left:=private.number(debt_item,'amount');part:=least(amount,debt_left);
     if part>0 then payment_allocations:=payment_allocations||jsonb_build_array(jsonb_build_object('charge_id',debt_item->>'charge_id','amount',part));amount:=amount-part;end if;
     if debt_left>part then new_debts:=new_debts||jsonb_build_array(debt_item||jsonb_build_object('amount',debt_left-part));end if;
    end loop;allocations:=new_debts;
    perform private.payment(a,b,item||jsonb_build_object('student_id',d->>'student_id','applications',payment_allocations));
   end;
  end loop;
  if sale_left>0 then perform private.require_permission(a,b,'sales.credit'); end if;
  if jsonb_array_length(allocations)>0 then raise exception 'Los cargos seleccionados deben cobrarse completos por el importe indicado'; end if;
  perform private.commission(a,b,id,total,id,'venta');
 when 'return_sale' then
  perform private.require_permission(a,b,'sales.refund');
  if reason is null then raise exception 'Escribe el motivo de devolución'; end if;
  select * into rowdata from public.sale_lines l where academy_id=a and l.id=(d->>'line_id')::uuid for update;
  if not found or not exists(select 1 from public.sales s where s.id=rowdata.sale_id and s.branch_id=b) then raise exception 'Línea no disponible'; end if;
  quantity:=(d->>'quantity')::numeric;
  if quantity<=0 or quantity>rowdata.quantity-rowdata.returned then raise exception 'Cantidad superior a lo vendido'; end if;
  amount:=round((rowdata.unit_price-rowdata.discount/rowdata.quantity)*quantity,2);
  if (select p.kind from public.products p join public.product_variants v on v.product_id=p.id where v.id=rowdata.variant_id)<>'servicio' then perform private.stock_move(a,b,rowdata.variant_id,quantity,rowdata.unit_cost,'devolucion',id,reason); end if;
  update public.sale_lines set returned=returned+quantity where sale_lines.id=rowdata.id;
  select greatest(0,amount-greatest(0,cb.balance)) into refundable from public.charge_balances cb where cb.id=rowdata.sale_id;
  insert into public.charge_adjustments(academy_id,branch_id,charge_id,amount,reason,actor) values(a,b,rowdata.sale_id,-amount,reason,actor);
  for allocation in select pa.payment_id,pa.amount-coalesce((select sum(ra.amount) from public.refund_applications ra where ra.application_id=pa.id),0) available from public.payment_applications pa join public.payments p on p.id=pa.payment_id where pa.charge_id=rowdata.sale_id and p.status='confirmado' order by p.created_at desc loop
   exit when refundable<=0; refundpart:=least(refundable,allocation.available);
   if refundpart>0 then perform private.operate(a,b,'refund',jsonb_build_object('payment_id',allocation.payment_id,'charge_id',rowdata.sale_id,'amount',refundpart,'reason',reason),gen_random_uuid()); refundable:=refundable-refundpart; end if;
  end loop;
  if refundable>0 then raise exception 'No se puede conciliar el reembolso de la devolución'; end if;
  perform private.commission(a,b,rowdata.sale_id,-amount,id,'devolucion');
  update public.sales set status=case when not exists(select 1 from public.sale_lines l where l.sale_id=rowdata.sale_id and l.returned<l.quantity) then 'devuelta' else status end where sales.id=rowdata.sale_id;
  result:=jsonb_build_object('id',id,'returned_amount',amount,'sale_id',rowdata.sale_id);
 when 'generate_classes' then
  perform private.require_permission(a,b,'classes.write');
  if (d->>'to_on')::date<(d->>'from_on')::date or (d->>'to_on')::date-(d->>'from_on')::date>31 then raise exception 'Genera hasta 31 días por lote'; end if;
  perform 1 from public.branches where branches.id=b for update;
  total:=0;
  for rowdata in select ct.*,gs.day::date scheduled_day,(gs.day::date+ct.starts_time) at time zone ac.timezone scheduled_start from public.class_templates ct join public.academies ac on ac.id=ct.academy_id cross join lateral generate_series((d->>'from_on')::date,(d->>'to_on')::date,interval '1 day') gs(day) where ct.academy_id=a and ct.branch_id=b and ct.active and extract(dow from gs.day)=ct.weekday loop
   if not exists(select 1 from public.classes c where c.template_id=rowdata.id and c.starts_at=rowdata.scheduled_start) and not exists(select 1 from public.holidays h where h.branch_id=b and h.day=rowdata.scheduled_day) then
    result:=private.operate(a,b,'class',jsonb_build_object('name',rowdata.name,'discipline_id',rowdata.discipline_id,'room_id',rowdata.room_id,'instructor_id',rowdata.instructor_id,'starts_at',rowdata.scheduled_start,'ends_at',rowdata.scheduled_start+make_interval(mins=>rowdata.duration_minutes),'capacity',rowdata.capacity,'kind','regular'),gen_random_uuid());
    update public.classes set template_id=rowdata.id,level=rowdata.level,age_group=rowdata.age_group where classes.id=(result->>'id')::uuid;total:=total+1;
   end if;
  end loop;
  result:=jsonb_build_object('id',id,'generated',total);
 when 'class' then
  perform private.require_permission(a,b,'classes.write');
  -- Branch lock serializes overlap and capacity checks without extra extensions.
  perform 1 from public.branches where branches.id=b for update;
  if not exists(select 1 from public.rooms r where r.academy_id=a and r.id=(d->>'room_id')::uuid and r.branch_id=b and r.active and r.capacity>=(d->>'capacity')::int) or not exists(select 1 from public.employees e where e.academy_id=a and e.id=(d->>'instructor_id')::uuid and e.branch_id=b and e.status='activo') then raise exception 'Espacio, instructor o capacidad inválidos'; end if;
  if exists(select 1 from public.classes c where c.academy_id=a and c.status<>'cancelada' and (c.room_id=(d->>'room_id')::uuid or coalesce(c.substitute_id,c.instructor_id)=(d->>'instructor_id')::uuid) and c.starts_at<(d->>'ends_at')::timestamptz and c.ends_at>(d->>'starts_at')::timestamptz) then raise exception 'Conflicto de espacio o instructor'; end if;
  if exists(select 1 from public.holidays h where h.branch_id=b and h.day=((d->>'starts_at')::timestamptz at time zone (select timezone from public.academies where academies.id=a))::date) then raise exception 'La sucursal tiene un feriado'; end if;
  insert into public.classes(id,academy_id,branch_id,name,discipline_id,room_id,instructor_id,starts_at,ends_at,capacity,kind,level,age_group) values(id,a,b,d->>'name',(d->>'discipline_id')::uuid,(d->>'room_id')::uuid,(d->>'instructor_id')::uuid,(d->>'starts_at')::timestamptz,(d->>'ends_at')::timestamptz,(d->>'capacity')::int,coalesce(d->>'kind','regular'),d->>'level',d->>'age_group');
 when 'reschedule_class' then
  perform private.require_permission(a,b,'classes.write');if reason is null then raise exception 'Indica el motivo'; end if;
  perform 1 from public.branches where branches.id=b for update;
  select * into rowdata from public.classes where academy_id=a and classes.id=(d->>'class_id')::uuid and branch_id=b and status='programada' for update;
  if not found or exists(select 1 from public.attendance where class_id=rowdata.id) then raise exception 'Solo puedes cambiar clases pendientes sin asistencia'; end if;
  if not exists(select 1 from public.rooms where academy_id=a and rooms.id=(d->>'room_id')::uuid and branch_id=b and active and capacity>=rowdata.capacity) or not exists(select 1 from public.employees where academy_id=a and employees.id=(d->>'instructor_id')::uuid and branch_id=b and status='activo') then raise exception 'Espacio o instructor no disponibles'; end if;
  if exists(select 1 from public.classes c where c.academy_id=a and c.id<>rowdata.id and c.status<>'cancelada' and (c.room_id=(d->>'room_id')::uuid or coalesce(c.substitute_id,c.instructor_id)=(d->>'instructor_id')::uuid) and c.starts_at<(d->>'ends_at')::timestamptz and c.ends_at>(d->>'starts_at')::timestamptz) then raise exception 'Conflicto de espacio o instructor'; end if;
  update public.classes set room_id=(d->>'room_id')::uuid,substitute_id=(d->>'instructor_id')::uuid,starts_at=(d->>'starts_at')::timestamptz,ends_at=(d->>'ends_at')::timestamptz,reason=reason where classes.id=rowdata.id;id:=rowdata.id;
 when 'class_state' then
  perform private.require_permission(a,b,'classes.write');
  if reason is null then raise exception 'Indica el motivo'; end if;
  update public.classes set status=d->>'status',reason=reason where academy_id=a and classes.id=(d->>'class_id')::uuid and branch_id=b returning classes.id into id;
  if id is null then raise exception 'Clase no encontrada'; end if;
  if d->>'status'='impartida' then
   select e.* into employee from public.employees e join public.classes c on coalesce(c.substitute_id,c.instructor_id)=e.id where c.id=id;
   select cv.* into compensation from public.compensation_versions cv where cv.employee_id=employee.id and cv.effective_on<=(select (c.starts_at at time zone (select timezone from public.academies where academies.id=a))::date from public.classes c where c.id=id) order by cv.effective_on desc limit 1;
   if compensation.id is not null and compensation.class_rate>0 then
    insert into public.staff_activities(academy_id,branch_id,employee_id,compensation_version_id,kind,units,earned,activity_on,source_id) values(a,b,employee.id,compensation.id,'clase',1,compensation.class_rate,(select (c.starts_at at time zone (select timezone from public.academies where academies.id=a))::date from public.classes c where c.id=id),id) on conflict(employee_id,kind,source_id) do nothing;
   end if;
  end if;
 when 'reservation_state' then
  perform private.require_permission(a,b,'classes.write');
  if d->>'status' not in ('cancelada','ausente') then raise exception 'Estado de reserva inválido'; end if;
  select * into rowdata from public.reservations where academy_id=a and reservations.id=(d->>'reservation_id')::uuid and branch_id=b for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  perform 1 from public.classes where classes.id=rowdata.class_id for update;
  update public.reservations set status=d->>'status' where reservations.id=rowdata.id;
  if d->>'status'='cancelada' then
   update public.reservations set status='reservada' where reservations.id=(select rr.id from public.reservations rr where rr.class_id=rowdata.class_id and rr.status='espera' order by rr.created_at limit 1) and (select count(*) from public.reservations rr where rr.class_id=rowdata.class_id and rr.status='reservada')<(select capacity from public.classes where classes.id=rowdata.class_id);
  end if;id:=rowdata.id;
 when 'reservation' then
  perform private.require_permission(a,b,'classes.write');
  perform 1 from public.classes c where c.academy_id=a and c.id=(d->>'class_id')::uuid and c.branch_id=b and c.status='programada' for update;
  if not found then raise exception 'Clase no disponible'; end if;
  if not exists(select 1 from public.students s where s.academy_id=a and s.id=(d->>'student_id')::uuid and s.branch_id=b and s.status='activo') then raise exception 'Estudiante no disponible'; end if;
  if (select reservation_hours from public.academies where academies.id=a)>0 and now()>(select starts_at-make_interval(hours=>(select reservation_hours from public.academies where academies.id=a)) from public.classes where classes.id=(d->>'class_id')::uuid) then raise exception 'La reserva está fuera del plazo configurado'; end if;
  insert into public.reservations(id,academy_id,branch_id,class_id,student_id,status) values(id,a,b,(d->>'class_id')::uuid,(d->>'student_id')::uuid,
  case when (select count(*) from public.reservations r where r.class_id=(d->>'class_id')::uuid and r.status='reservada')<(select capacity from public.classes c where c.id=(d->>'class_id')::uuid) then 'reservada' else 'espera' end)
  on conflict(class_id,student_id) do update set status=case when reservations.status='cancelada' then excluded.status else reservations.status end returning reservations.id into id;
 when 'attendance' then
  perform private.require_permission(a,b,'classes.write');
  perform 1 from public.classes c where c.academy_id=a and c.id=(d->>'class_id')::uuid and c.branch_id=b and c.status<>'cancelada' for update;
  if not found then raise exception 'Clase no disponible'; end if;
  if not exists(select 1 from public.students where academy_id=a and students.id=(d->>'student_id')::uuid and branch_id=b and status='activo') then raise exception 'El estudiante no está activo en esta sucursal'; end if;
  if exists(select 1 from public.attendance t where t.class_id=(d->>'class_id')::uuid and t.student_id=(d->>'student_id')::uuid) then select t.id into id from public.attendance t where t.class_id=(d->>'class_id')::uuid and t.student_id=(d->>'student_id')::uuid;
  else
   if (select count(*) from public.attendance t where t.class_id=(d->>'class_id')::uuid)>=(select capacity from public.classes c where c.id=(d->>'class_id')::uuid) then raise exception 'La clase está llena'; end if;
   select m.* into member from public.memberships m join public.students s on s.id=m.student_id join public.plan_versions pv on pv.id=m.plan_version_id join public.plans pl on pl.id=pv.plan_id join public.classes c on c.id=(d->>'class_id')::uuid where m.academy_id=a and m.branch_id=b and m.student_id=(d->>'student_id')::uuid and s.status='activo' and m.status='activa' and m.starts_on<=(c.starts_at at time zone (select timezone from public.academies where academies.id=a))::date and m.ends_on>=(c.starts_at at time zone (select timezone from public.academies where academies.id=a))::date and (pl.discipline_id is null or pl.discipline_id=c.discipline_id) and (pl.branch_id is null or pl.branch_id=b) order by m.ends_on desc limit 1 for update of m;
   if member.id is null or exists(select 1 from public.charge_balances cb where cb.student_id=(d->>'student_id')::uuid and cb.balance>0 and cb.due_on+(select grace_days from public.academies where academies.id=a)<(now() at time zone (select timezone from public.academies where academies.id=a))::date) then
    perform private.require_permission(a,b,'classes.override'); if reason is null then raise exception 'Escribe el motivo de la excepción'; end if;
   end if;
   if member.id is not null then
    select * into version from public.plan_versions where plan_versions.id=member.plan_version_id;
    if version.weekly_limit is not null and (select count(*) from public.attendance t join public.classes c on c.id=t.class_id where t.membership_id=member.id and date_trunc('week',c.starts_at at time zone (select timezone from public.academies where academies.id=a))=date_trunc('week',(select starts_at from public.classes where classes.id=(d->>'class_id')::uuid) at time zone (select timezone from public.academies where academies.id=a)))>=version.weekly_limit then raise exception 'Límite semanal alcanzado'; end if;
    if member.remaining_classes is not null then
     if member.remaining_classes<=0 then raise exception 'Paquete sin clases disponibles'; end if;
     update public.memberships set remaining_classes=remaining_classes-1 where memberships.id=member.id;
    end if;
   end if;
   insert into public.attendance(id,academy_id,branch_id,class_id,student_id,membership_id,exception_reason,actor) values(id,a,b,(d->>'class_id')::uuid,(d->>'student_id')::uuid,member.id,reason,actor);
  end if;
 when 'compensation' then
  perform private.require_permission(a,b,'staff.approve');
  if not exists(select 1 from public.employees where academy_id=a and employees.id=(d->>'employee_id')::uuid and branch_id=b) then raise exception 'Empleado de otra sucursal'; end if;
  insert into public.compensation_versions(id,academy_id,employee_id,effective_on,fixed_amount,hourly_rate,class_rate,sale_percent,private_percent,accrual) values(id,a,(d->>'employee_id')::uuid,(d->>'effective_on')::date,private.number(d,'fixed_amount'),private.number(d,'hourly_rate'),private.number(d,'class_rate'),(d->>'sale_percent')::numeric,(d->>'private_percent')::numeric,coalesce(d->>'accrual','cobro'));
 when 'staff_activity' then
  perform private.require_permission(a,b,'staff.write');
  select * into compensation from public.compensation_versions cv where cv.academy_id=a and cv.employee_id=(d->>'employee_id')::uuid and cv.effective_on<=(d->>'activity_on')::date order by cv.effective_on desc limit 1;
  if not found or not exists(select 1 from public.employees e where e.id=compensation.employee_id and e.branch_id=b) then raise exception 'Sin condiciones vigentes en la sucursal'; end if;
  quantity:=(d->>'units')::numeric; total:=coalesce((d->>'base_amount')::numeric,0);
  amount:=case d->>'kind' when 'hora' then quantity*compensation.hourly_rate when 'clase' then quantity*compensation.class_rate when 'venta' then total*compensation.sale_percent/100 when 'privada' then total*compensation.private_percent/100 when 'ajuste' then total when 'anticipo' then -abs(total) end;
  if amount is null or quantity<=0 then raise exception 'Actividad inválida'; end if;
  insert into public.staff_activities(id,academy_id,branch_id,employee_id,compensation_version_id,kind,units,base_amount,earned,activity_on,source_id) values(id,a,b,compensation.employee_id,compensation.id,d->>'kind',quantity,total,round(amount,2),(d->>'activity_on')::date,nullif(d->>'source_id','')::uuid);
 when 'approve_activity' then
  perform private.require_permission(a,b,'staff.approve');
  update public.staff_activities set approved=true where academy_id=a and staff_activities.id=(d->>'activity_id')::uuid and branch_id=b returning staff_activities.id into id;
 when 'settlement' then
  perform private.require_permission(a,b,'staff.write');
  select * into employee from public.employees where academy_id=a and employees.id=(d->>'employee_id')::uuid and branch_id=b for update;
  if not found then raise exception 'Empleado no disponible'; end if;
  if (d->>'to_on')::date<(d->>'from_on')::date or exists(select 1 from public.settlements s where s.employee_id=employee.id and s.from_on<=(d->>'to_on')::date and s.to_on>=(d->>'from_on')::date) then raise exception 'Período inválido o solapado con otra liquidación'; end if;
  select * into compensation from public.compensation_versions cv where cv.employee_id=employee.id and cv.effective_on<=(d->>'from_on')::date order by cv.effective_on desc limit 1;
  if not found then raise exception 'Sin condiciones de remuneración'; end if;
  total:=compensation.fixed_amount+coalesce((select sum(sa.earned) from public.staff_activities sa where sa.employee_id=employee.id and sa.approved and sa.activity_on between (d->>'from_on')::date and (d->>'to_on')::date and not exists(select 1 from public.settlement_lines sl where sl.activity_id=sa.id)),0);
  if total<=0 then raise exception 'No hay remuneración positiva a liquidar'; end if;
  insert into public.expenses(id,academy_id,branch_id,description,category,amount,due_on,incurred_on,source,source_id) values(id,a,b,'Remuneración: '||employee.name,'Personal',total,(d->>'to_on')::date,(d->>'to_on')::date,'personal',id);
  insert into public.settlements(id,academy_id,branch_id,employee_id,expense_id,from_on,to_on,total) values(id,a,b,employee.id,id,(d->>'from_on')::date,(d->>'to_on')::date,total);
  insert into public.settlement_lines(academy_id,settlement_id,activity_id,amount) select a,id,sa.id,sa.earned from public.staff_activities sa where sa.employee_id=employee.id and sa.approved and sa.activity_on between (d->>'from_on')::date and (d->>'to_on')::date and not exists(select 1 from public.settlement_lines sl where sl.activity_id=sa.id);
 when 'approve_settlement' then
  perform private.require_permission(a,b,'staff.approve');
  update public.settlements set status='aprobada' where academy_id=a and settlements.id=(d->>'settlement_id')::uuid and branch_id=b and status='revision' returning settlements.id into id;
  if id is null then raise exception 'Liquidación no disponible'; end if;
  update public.expenses set status='aprobado',approved_by=actor where expenses.id=id;
 when 'import_students' then
  perform private.require_permission(a,b,'students.write');
  if jsonb_array_length(d->'rows') not between 1 and 500 then raise exception 'Lote de importación inválido'; end if;
  perform 1 from public.branches where branches.id=b for update;
  for item in select value from jsonb_array_elements(d->'rows') loop
   if not coalesce((d->>'allow_duplicates')::boolean,false) and exists(select 1 from public.students s where s.academy_id=a and (lower(trim(s.name))=lower(trim(item->>'name')) or (nullif(item->>'email','') is not null and lower(s.email)=lower(item->>'email')))) then raise exception 'Apareció un duplicado después de validar. Revisa el archivo otra vez.'; end if;
   insert into public.students(academy_id,branch_id,name,email,phone,birth_date,joined_on,status,status_reason) values(a,b,item->>'name',nullif(item->>'email',''),nullif(item->>'phone',''),nullif(item->>'birth_date','')::date,(item->>'joined_on')::date,item->>'status',case when item->>'status'<>'activo' then 'Importación administrativa' else null end);
  end loop;
  result:=jsonb_build_object('id',id,'imported',jsonb_array_length(d->'rows'));
 when 'convert_prospect' then
  perform private.require_permission(a,b,'students.write');
  select * into rowdata from public.prospects where academy_id=a and prospects.id=(d->>'prospect_id')::uuid and branch_id=b and status<>'convertido' for update;
  if not found then raise exception 'Interesado ya convertido o no disponible'; end if;
  insert into public.students(id,academy_id,branch_id,name,email,phone,joined_on) values(id,a,b,rowdata.name,rowdata.email,rowdata.phone,(d->>'joined_on')::date);
  update public.prospects set status='convertido',student_id=id where prospects.id=rowdata.id;
 when 'expense_run' then
  perform private.require_permission(a,null,'expenses.approve');
  if not exists(select 1 from public.internal_members m where m.user_id=actor and m.academy_id=a and m.all_branches and m.active) then raise exception 'La generación requiere todas las sucursales'; end if;
  result:=jsonb_build_object('id',id,'generated',private.generate_expenses(a,(d->>'cutoff')::date,100));
 when 'billing_run' then
  perform private.require_permission(a,null,'billing.generate');
  if not exists(select 1 from public.internal_members m where m.user_id=actor and m.academy_id=a and m.all_branches and m.active) then raise exception 'La generación requiere acceso a todas las sucursales'; end if;
  result:=private.generate_billing(a,(d->>'cutoff')::date,100);
 when 'academy_settings' then
  perform private.require_permission(a,null,'settings.write');
  if (d->>'currency')<>(select currency from public.academies where academies.id=a) and (exists(select 1 from public.account_movements where academy_id=a) or exists(select 1 from public.charges where academy_id=a)) then raise exception 'La moneda no puede cambiar después de registrar operaciones'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=d->>'timezone') then raise exception 'Zona horaria inválida'; end if;
  update public.academies set locale=coalesce(d->>'locale',locale),reservation_hours=coalesce((d->>'reservation_hours')::int,reservation_hours),max_discount_percent=coalesce((d->>'max_discount_percent')::numeric,max_discount_percent),name=d->>'name',country=d->>'country',currency=d->>'currency',timezone=d->>'timezone',primary_color=d->>'primary_color',contact=d->>'contact',receipt_footer=d->>'receipt_footer',grace_days=(d->>'grace_days')::int,expense_approval_limit=private.number(d,'expense_approval_limit'),collection_template=d->>'collection_template',proration_policy=coalesce(d->>'proration_policy',proration_policy),pause_policy=coalesce(d->>'pause_policy',pause_policy),cancel_policy=coalesce(d->>'cancel_policy',cancel_policy) where academies.id=a; id:=a;
 when 'user_access' then
  perform private.require_permission(a,null,'users.manage');
  if (d->>'user_id')::uuid=actor then raise exception 'No puedes editar tus propios permisos'; end if;
  if exists(select 1 from public.internal_members m join public.member_roles mr on mr.member_id=m.id join public.roles r on r.id=mr.role_id where m.academy_id=a and m.user_id=(d->>'user_id')::uuid and '*'=any(r.permissions)) and not private.has_permission(a,null,'owner.manage') then raise exception 'Solo el propietario puede editar otro propietario'; end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(d->'branch_ids','[]')) x where not exists(select 1 from public.branches br where br.id=x.value::uuid and br.academy_id=a)) then raise exception 'Sucursal de otra academia'; end if;
  insert into public.internal_members(academy_id,user_id,name,active,all_branches,branch_ids) values(a,(d->>'user_id')::uuid,d->>'name',(d->>'active')::boolean,(d->>'all_branches')::boolean,array(select value::uuid from jsonb_array_elements_text(coalesce(d->'branch_ids','[]'))))
  on conflict(academy_id,user_id) do update set name=excluded.name,active=excluded.active,all_branches=excluded.all_branches,branch_ids=excluded.branch_ids returning internal_members.id into id;
  delete from public.member_roles where member_id=id;
  for item in select value from jsonb_array_elements(d->'role_ids') loop
   if exists(select 1 from public.roles r where r.id=(item#>>'{}')::uuid and r.academy_id=a and ('*'=any(r.permissions) or 'owner.manage'=any(r.permissions))) then perform private.require_permission(a,null,'owner.manage'); end if;
   insert into public.member_roles(academy_id,member_id,role_id) values(a,id,(item#>>'{}')::uuid);
  end loop;
 when 'refresh_alerts' then
  perform private.require_permission(a,b,'reports.read');
  if private.has_permission(a,b,'billing.read') then
   insert into public.notifications(academy_id,branch_id,kind,title,entity_id) select a,cb.branch_id,'deuda','Cargo vencido: '||cb.description,cb.id from public.charge_balances cb where cb.academy_id=a and (b is null or cb.branch_id=b) and cb.balance>0 and cb.due_on<(now() at time zone (select timezone from public.academies where academies.id=a))::date on conflict(academy_id,kind,entity_id) do nothing;
   insert into public.notifications(academy_id,branch_id,kind,title,entity_id) select a,m.branch_id,'vencimiento','Membresía próxima a vencer',m.id from public.memberships m where m.academy_id=a and (b is null or m.branch_id=b) and m.status='activa' and m.ends_on between (now() at time zone (select timezone from public.academies where academies.id=a))::date and (now() at time zone (select timezone from public.academies where academies.id=a))::date+7 on conflict(academy_id,kind,entity_id) do nothing;
  end if;
  if private.has_permission(a,b,'inventory.read') then
   insert into public.notifications(academy_id,branch_id,kind,title,entity_id) select a,s.branch_id,'existencia','Existencia baja: '||v.name,s.id from public.stock s join public.product_variants v on v.id=s.variant_id where s.academy_id=a and (b is null or s.branch_id=b) and s.quantity<=v.min_stock on conflict(academy_id,kind,entity_id) do nothing;
  end if;
  if private.has_permission(a,b,'expenses.read') then
   insert into public.notifications(academy_id,branch_id,kind,title,entity_id) select a,e.branch_id,'aprobacion','Obligación por aprobar: '||e.description,e.id from public.expenses e where e.academy_id=a and (b is null or e.branch_id=b) and e.status='pendiente' on conflict(academy_id,kind,entity_id) do nothing;
  end if;
 when 'read_alert' then
  perform private.require_permission(a,b,'reports.read');
  update public.notifications set read_at=now() where academy_id=a and notifications.id=(d->>'notification_id')::uuid and (b is null or branch_id=b) returning notifications.id into id;
  if id is null then raise exception 'Aviso no disponible'; end if;
 when 'student_photo' then
  perform private.require_permission(a,b,'students.write');perform private.require_permission(a,b,'documents.read');
  select * into rowdata from public.documents where academy_id=a and documents.id=(d->>'document_id')::uuid and branch_id=b and student_id=(d->>'student_id')::uuid and mime_type in ('image/jpeg','image/png');
  if not found then raise exception 'Foto no disponible en el expediente'; end if;
  update public.students set photo_path=rowdata.path where academy_id=a and students.id=(d->>'student_id')::uuid and branch_id=b returning students.id into id;
 when 'role' then
  perform private.require_permission(a,null,'owner.manage');
  insert into public.roles(id,academy_id,name,permissions) values(id,a,d->>'name',array(select value from jsonb_array_elements_text(d->'permissions')));
 else raise exception 'Operación desconocida';
 end case;
 result:=coalesce(result,jsonb_build_object('id',id));
 insert into public.audit_log(academy_id,branch_id,actor,entity,entity_id,action,reason) values(a,b,actor,action,id,action,reason);
 update public.operation_keys set result=mutation.result where academy_id=a and operation_keys.key=operate.key;
 return result;
end $$;
