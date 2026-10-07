create function public.dashboard(p_academy uuid,p_branch uuid,p_from date,p_to date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; begin
 perform private.require_permission(p_academy,p_branch,'dashboard.read');
 if p_to<p_from then raise exception 'Período inválido'; end if;
 select jsonb_build_object(
 'received',coalesce((select sum(amount) from public.payments where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status='confirmado' and (created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0),
 'pending',coalesce((select sum(greatest(balance,0)) from public.charge_balances where academy_id=p_academy and (p_branch is null or branch_id=p_branch)),0),
 'overdue',coalesce((select sum(greatest(balance,0)) from public.charge_balances where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and due_on<(now() at time zone (select timezone from public.academies where id=p_academy))::date),0),
 'expenses_paid',coalesce((select sum(amount) from public.expense_payments where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and (created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0),
 'balance',coalesce((select sum(balance) from public.account_balances where academy_id=p_academy and (p_branch is null or branch_id=p_branch)),0),
 'sales',coalesce((select sum(net_sales) from public.sales_report where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and (created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0),
 'margin',coalesce((select sum(margin) from public.sales_report where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and (created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0),
 'charged',coalesce((select sum(c.amount) from public.charges c where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status='emitido' and (created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0),
 'operating_result',
  coalesce((select sum(c.amount) from public.charges c where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status='emitido' and source<>'venta' and (created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0)
  +coalesce((select sum(ca.amount) from public.charge_adjustments ca join public.charges c on c.id=ca.charge_id where ca.academy_id=p_academy and (p_branch is null or ca.branch_id=p_branch) and c.source<>'venta' and (ca.created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0)
  +coalesce((select sum(margin) from public.sales_report where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and (created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0)
  -coalesce((select sum(e.amount) from public.expenses e where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status<>'anulado' and source in ('operativo','recurrente','personal') and incurred_on between p_from and p_to),0)
  +coalesce((select sum(m.amount) from public.account_movements m where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and kind='comision' and (created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to),0),
 'active_students',(select count(*) from public.students where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status='activo'),
 'new_students',(select count(*) from public.students where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and joined_on between p_from and p_to),
 'paused_students',(select count(*) from public.students where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status='pausado'),
 'retired_students',(select count(*) from public.students where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status='retirado'),
 'expiring',(select count(*) from public.memberships where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status='activa' and ends_on between (now() at time zone (select timezone from public.academies where id=p_academy))::date and (now() at time zone (select timezone from public.academies where id=p_academy))::date+7),
 'classes_today',(select count(*) from public.classes where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and (starts_at at time zone (select timezone from public.academies where id=p_academy))::date=(now() at time zone (select timezone from public.academies where id=p_academy))::date and status<>'cancelada'),
 'low_stock',(select count(*) from public.stock s join public.product_variants v on v.id=s.variant_id where s.academy_id=p_academy and (p_branch is null or s.branch_id=p_branch) and s.quantity<=v.min_stock),
 'approvals',(select count(*) from public.expenses where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and status='pendiente'),
 'differences',(select count(*) from public.cash_sessions where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and closed_at is not null and difference<>0 and approved_by is null),
 'daily',coalesce((select jsonb_agg(t) from (select (m.created_at at time zone (select timezone from public.academies where id=p_academy))::date as day, sum(case when m.kind='cobro' then m.amount else 0 end) received, -sum(case when m.kind in ('egreso','comision','reembolso') then m.amount else 0 end) spent from public.account_movements m where academy_id=p_academy and (p_branch is null or branch_id=p_branch) and (m.created_at at time zone (select timezone from public.academies where id=p_academy))::date between p_from and p_to group by 1 order by 1) t),'[]'::jsonb)
 ) into r; return r;
end $$;
revoke all on function public.dashboard(uuid,uuid,date,date) from public,anon;
grant execute on function public.dashboard(uuid,uuid,date,date) to authenticated;
grant execute on function private.require_permission(uuid,uuid,text) to authenticated;
