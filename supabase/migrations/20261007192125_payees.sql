-- Shared supplier/beneficiary directory for inventory and accounting.
alter policy suppliers_read on public.suppliers using(private.has_permission(academy_id,null,'inventory.read') or private.has_permission(academy_id,null,'expenses.read'));
alter policy suppliers_insert on public.suppliers with check(private.has_permission(academy_id,null,'inventory.write') or private.has_permission(academy_id,null,'expenses.write'));
alter policy suppliers_update on public.suppliers using(private.has_permission(academy_id,null,'inventory.write') or private.has_permission(academy_id,null,'expenses.write')) with check(private.has_permission(academy_id,null,'inventory.write') or private.has_permission(academy_id,null,'expenses.write'));
