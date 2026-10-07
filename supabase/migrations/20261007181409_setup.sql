create function public.bootstrap_academy(p_owner uuid,p_name text,p_country text,p_currency text,p_timezone text) returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid:=gen_random_uuid(); r uuid; m uuid;
begin
 if not exists(select 1 from auth.users where id=p_owner) or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Usuario o zona horaria no válidos'; end if;
 insert into public.academies(id,name,country,currency,timezone) values(a,p_name,p_country,p_currency,p_timezone);
 insert into public.roles(academy_id,name,permissions) values(a,'Propietario',array['*']) returning id into r;
 insert into public.internal_members(academy_id,user_id,name,all_branches) values(a,p_owner,'Propietario',true) returning id into m;
 insert into public.member_roles(academy_id,member_id,role_id) values(a,m,r);
 insert into public.roles(academy_id,name,permissions) values
 (a,'Administrador',array['dashboard.read','students.read','students.write','notes.read','notes.write','documents.read','documents.write','billing.read','billing.write','billing.collect','billing.discount','billing.verify','billing.generate','treasury.read','treasury.write','treasury.approve','sales.read','sales.write','sales.discount','sales.credit','inventory.read','inventory.write','inventory.approve','expenses.read','expenses.write','expenses.approve','expenses.pay','classes.read','classes.write','classes.override','staff.read','staff.write','reports.read','settings.read','settings.write','users.manage','audit.read']),
 (a,'Recepción/cajero',array['dashboard.read','students.read','students.write','documents.read','documents.write','billing.read','billing.collect','treasury.read','treasury.write','sales.read','sales.write','inventory.read','classes.read','classes.write','settings.read']),
 (a,'Instructor',array['dashboard.read','students.read','classes.read','classes.write','settings.read']),
 (a,'Inventario',array['dashboard.read','inventory.read','inventory.write','inventory.approve','settings.read']),
 (a,'Contabilidad',array['dashboard.read','billing.read','billing.verify','billing.refund','treasury.read','treasury.approve','expenses.read','expenses.write','expenses.approve','expenses.pay','staff.read','staff.approve','reports.read','audit.read','settings.read']);
 insert into public.audit_log(academy_id,actor,entity,entity_id,action) values(a,p_owner,'academies',a,'Creación por operador autorizado');
 return a;
end $$;
revoke all on function public.bootstrap_academy(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.bootstrap_academy(uuid,text,text,text,text) to service_role;
create function public.scheduled_billing(p_limit int default 100) returns jsonb language plpgsql security definer set search_path='' as $$
declare a record; results jsonb:='[]'; r jsonb; begin
 if p_limit not between 1 and 200 then raise exception 'Lote inválido'; end if;
 for a in select ac.id,ac.timezone from public.academies ac order by (select max(jr.started_at) from public.job_runs jr where jr.academy_id=ac.id) nulls first,ac.id limit 50 loop
  r:=private.generate_billing(a.id,(now() at time zone a.timezone)::date,p_limit);
  r:=r||jsonb_build_object('expenses',private.generate_expenses(a.id,(now() at time zone a.timezone)::date,p_limit));
  results:=results||jsonb_build_array(jsonb_build_object('academy',a.id,'result',r));
 end loop; return results;
end $$;
revoke all on function public.scheduled_billing(int) from public,anon,authenticated;
grant execute on function public.scheduled_billing(int) to service_role;
