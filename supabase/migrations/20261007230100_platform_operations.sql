create function private.seed_academy_roles(a uuid) returns void language plpgsql set search_path='' as $$
begin
 insert into public.roles(academy_id,name,permissions) values
 (a,'Propietario',array['*']),
 (a,'Administrador',array['dashboard.read','students.read','students.write','notes.read','notes.write','documents.read','documents.write','billing.read','billing.write','billing.collect','billing.discount','billing.verify','billing.generate','treasury.read','treasury.write','treasury.approve','sales.read','sales.write','sales.discount','sales.credit','inventory.read','inventory.write','inventory.approve','expenses.read','expenses.write','expenses.approve','expenses.pay','classes.read','classes.write','classes.override','staff.read','staff.write','reports.read','settings.read','settings.write','users.manage','audit.read']),
 (a,'Recepción/cajero',array['dashboard.read','students.read','students.write','documents.read','documents.write','billing.read','billing.collect','treasury.read','treasury.write','sales.read','sales.write','inventory.read','classes.read','classes.write','settings.read']),
 (a,'Instructor',array['dashboard.read','students.read','classes.read','classes.write','settings.read']),
 (a,'Inventario',array['dashboard.read','inventory.read','inventory.write','inventory.approve','settings.read']),
 (a,'Contabilidad',array['dashboard.read','billing.read','billing.verify','billing.refund','treasury.read','treasury.approve','expenses.read','expenses.write','expenses.approve','expenses.pay','staff.read','staff.approve','reports.read','audit.read','settings.read']);
end$$;
revoke all on function private.seed_academy_roles(uuid) from public,anon,authenticated;

create or replace function public.bootstrap_academy(p_owner uuid,p_name text,p_country text,p_currency text,p_timezone text) returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid:=gen_random_uuid();r uuid;m uuid;email text;begin
 select lower(u.email) into email from auth.users u where u.id=p_owner;
 if email is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Usuario o zona horaria no válidos';end if;
 insert into public.academies(id,name,country,currency,timezone) values(a,p_name,p_country,p_currency,p_timezone);
 insert into public.platform_businesses(academy_id,commercial_name,responsible_name,owner_name,owner_email,owner_user_id,invitation_status)
 values(a,p_name,'Propietario','Propietario',email,p_owner,'vinculada');
 perform private.seed_academy_roles(a);
 select id into r from public.roles where academy_id=a and name='Propietario';
 insert into public.internal_members(academy_id,user_id,name,all_branches) values(a,p_owner,'Propietario',true) returning id into m;
 insert into public.member_roles(academy_id,member_id,role_id) values(a,m,r);
 insert into public.audit_log(academy_id,actor,entity,entity_id,action) values(a,p_owner,'academies',a,'Creación por operador autorizado');return a;
end$$;

create function private.platform_terms(a uuid,plan uuid,d jsonb,reason text) returns uuid language plpgsql set search_path='' as $$
declare p public.platform_plans;id uuid;begin
 select * into p from public.platform_plans where platform_plans.id=plan and active for share;
 if not found then raise exception 'Plan comercial no disponible';end if;
 insert into public.platform_contracts(academy_id,plan_id,plan_name,price,currency,cycle,trial_days,max_branches,max_users,max_students,modules,reason,actor,effective_on)
 values(a,p.id,p.name,case when d?'price' then private.number(d,'price') else p.price end,p.currency,p.cycle,
 coalesce((d->>'trial_days')::int,p.trial_days),coalesce((d->>'max_branches')::int,p.max_branches),coalesce((d->>'max_users')::int,p.max_users),
 case when d?'max_students' then (d->>'max_students')::int else p.max_students end,
 case when d?'modules' then array(select jsonb_array_elements_text(d->'modules')) else p.modules end,reason,auth.uid(),
 case when exists(select 1 from public.platform_subscriptions where academy_id=a) then private.platform_day() else coalesce((d->>'starts_on')::date,private.platform_day()) end) returning platform_contracts.id into id;
 return id;
end$$;
revoke all on function private.platform_terms(uuid,uuid,jsonb,text) from public,anon,authenticated;

create function private.platform_generate(a uuid,cutoff date,lim int) returns jsonb language plpgsql set search_path='' as $$
declare s public.platform_subscriptions;c public.platform_contracts;generated int:=0;remaining boolean:=false;begin
 if lim not between 1 and 200 then raise exception 'Lote inválido';end if;
 perform 1 from public.academies where id=a for update;
 select * into s from public.platform_subscriptions where academy_id=a for update;
 if not found or s.status='cancelada' then return jsonb_build_object('generated',0,'remaining',false);end if;
 select * into c from public.platform_contracts where id=s.contract_id;
 while s.next_charge_on<=cutoff and (s.ends_on is null or s.next_charge_on<=s.ends_on) loop
  if generated>=lim then remaining:=true;exit;end if;
  select * into c from public.platform_contracts where academy_id=a and effective_on<=s.next_charge_on order by effective_on desc,created_at desc,id desc limit 1;
  if not found then select * into c from public.platform_contracts where academy_id=a order by effective_on,created_at,id limit 1;end if;
  insert into public.platform_charges(academy_id,contract_id,description,amount,currency,period_on,due_on)
  values(a,c.id,'Suscripción · '||c.plan_name,c.price,c.currency,s.next_charge_on,s.next_charge_on)
  on conflict(academy_id,period_on) do nothing;
  if found then generated:=generated+1;end if;
  s.next_charge_on:=private.next_date(s.next_charge_on,case c.cycle when 'anual' then 12 else 1 end,s.anchor_day);
 end loop;
 update public.platform_subscriptions set next_charge_on=s.next_charge_on,updated_at=now() where academy_id=a;
 return jsonb_build_object('generated',generated,'remaining',remaining);
end$$;
revoke all on function private.platform_generate(uuid,date,int) from public,anon,authenticated;

create function private.suspension_preview() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('businesses',coalesce(jsonb_agg(x order by x.academy_id),'[]'),
 'token',md5(coalesce(string_agg(x::text,'|' order by x.academy_id),'')))
 from(select b.academy_id,b.commercial_name,
 (select jsonb_agg(v order by v.currency) from(select c.currency,sum(private.platform_balance(c.id)) balance from public.platform_charges c where c.academy_id=b.academy_id group by c.currency)v) balances
 from public.platform_businesses b where private.business_access(b.academy_id,true)='suspendida_impago')x
$$;
revoke all on function private.suspension_preview() from public,anon,authenticated;

create function private.platform_operate(action text,d jsonb,key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid();a uuid:=(d->>'academy_id')::uuid;id uuid:=coalesce((d->>'id')::uuid,gen_random_uuid());
 result jsonb;old private.platform_operation_keys;p public.platform_plans;s public.platform_subscriptions;c public.platform_contracts;
 payment public.platform_payments;method public.platform_payment_methods;charge public.platform_charges;
 amount numeric;allocated numeric:=0;item jsonb;reason text:=nullif(trim(d->>'reason'),'');term uuid;day date;trial int;
 previous_access text;preview jsonb;lease uuid;business public.platform_businesses;doc public.platform_documents;
begin
 perform private.require_platform_admin();
 if key is null then raise exception 'Falta la clave de reintento';end if;
 insert into private.platform_operation_keys(key,actor,action,payload) values(key,actor,action,d) on conflict do nothing;
 select * into old from private.platform_operation_keys where platform_operation_keys.key=key for update;
 if old.actor<>actor or old.action<>action or old.payload<>d then raise exception 'La clave de reintento pertenece a otra operación';end if;
 if old.result is not null then return old.result;end if;
 if action not in('plan','payment_method','settings','automation','create_business','generate_all') then
  if a is null or not exists(select 1 from public.platform_businesses where academy_id=a) then raise exception 'Negocio no disponible';end if;
  perform 1 from public.academies where academies.id=a for update;
  previous_access:=private.business_access(a);
 end if;
 if action in('assign_plan','trial','extend','grace','suspend','reactivate','cancel','adjustment','reject_payment','edit_business','automation','invite_claim')
 and (reason is null or length(reason)<5) then raise exception 'Escribe un motivo de al menos 5 caracteres';end if;
 case action
 when 'plan' then
  insert into public.platform_plans(id,name,description,price,currency,cycle,trial_days,max_branches,max_users,max_students,modules,active)
  values(id,d->>'name',coalesce(d->>'description',''),private.number(d,'price'),upper(d->>'currency'),d->>'cycle',(d->>'trial_days')::int,
  (d->>'max_branches')::int,(d->>'max_users')::int,(d->>'max_students')::int,array(select jsonb_array_elements_text(d->'modules')),coalesce((d->>'active')::boolean,true))
  on conflict on constraint platform_plans_pkey do update set name=excluded.name,description=excluded.description,price=excluded.price,currency=excluded.currency,
  cycle=excluded.cycle,trial_days=excluded.trial_days,max_branches=excluded.max_branches,max_users=excluded.max_users,max_students=excluded.max_students,
  modules=excluded.modules,active=excluded.active,updated_at=now();
 when 'payment_method' then
  insert into public.platform_payment_methods(id,name,kind,requires_verification,active)
  values(id,d->>'name',d->>'kind',(d->>'requires_verification')::boolean,(d->>'active')::boolean)
  on conflict on constraint platform_payment_methods_pkey do update set name=excluded.name,kind=excluded.kind,requires_verification=excluded.requires_verification,active=excluded.active;
 when 'settings' then
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=d->>'timezone') then raise exception 'Zona horaria inválida';end if;
  update public.platform_settings set timezone=d->>'timezone',contact=d->>'contact',payment_instructions=d->>'payment_instructions',updated_at=now() where platform_settings.id;
 when 'automation' then
  preview:=private.suspension_preview();
  if (d->>'enabled')::boolean and d->>'preview_token' is distinct from preview->>'token' then raise exception 'La vista previa cambió. Revísala y confirma nuevamente.';end if;
  if (d->>'enabled')::boolean then
   update public.platform_subscriptions set recovery_required=true,operational_paused_at=coalesce(operational_paused_at,now())
   where academy_id in(select (value->>'academy_id')::uuid from jsonb_array_elements(preview->'businesses'));
  end if;
  update public.platform_settings set automatic_suspension=(d->>'enabled')::boolean,updated_at=now() where platform_settings.id;
  result:=jsonb_build_object('enabled',(d->>'enabled')::boolean,'affected',jsonb_array_length(preview->'businesses'));
 when 'create_business' then
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=d->>'timezone') or lower(trim(d->>'owner_email'))!~'^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Correo o zona horaria inválidos';end if;
  a:=id;day:=(d->>'starts_on')::date;
  if day is null then raise exception 'Fecha de inicio obligatoria';end if;
  insert into public.academies(id,name,country,currency,timezone,contact)
  values(a,d->>'name',d->>'country',upper(d->>'currency'),d->>'timezone',d->>'contact');
  insert into public.platform_businesses(academy_id,commercial_name,responsible_name,contact_email,phone,owner_name,owner_email)
  values(a,d->>'name',d->>'responsible_name',d->>'contact_email',d->>'phone',d->>'owner_name',lower(trim(d->>'owner_email')));
  perform private.seed_academy_roles(a);
  term:=private.platform_terms(a,(d->>'plan_id')::uuid,d,'Alta inicial del negocio');
  select * into c from public.platform_contracts where platform_contracts.id=term;
  trial:=coalesce((d->>'trial_days')::int,c.trial_days);
  if trial not between 0 and 365 then raise exception 'Prueba fuera de rango';end if;
  insert into public.platform_subscriptions(academy_id,contract_id,starts_on,trial_until,next_charge_on,anchor_day)
  values(a,term,day,case when trial>0 then day+trial end,day+trial,extract(day from day+trial)::int);
  insert into public.branches(academy_id,name,address) values(a,d->>'branch_name',d->>'branch_address');
  if day+trial<=private.platform_day() then perform private.platform_generate(a,private.platform_day(),100);end if;
  id:=a;result:=jsonb_build_object('id',a,'invitation_status','pendiente');
 when 'edit_business' then
  update public.platform_businesses set commercial_name=d->>'name',responsible_name=d->>'responsible_name',contact_email=d->>'contact_email',phone=d->>'phone',updated_at=now() where academy_id=a;
  id:=a;
 when 'assign_plan' then
  term:=private.platform_terms(a,(d->>'plan_id')::uuid,d,reason);
  select * into s from public.platform_subscriptions where academy_id=a for update;
  if found then update public.platform_subscriptions set contract_id=term,updated_at=now() where academy_id=a;
  else day:=(d->>'starts_on')::date;if day is null then raise exception 'Indica la fecha inicial';end if;
   insert into public.platform_subscriptions(academy_id,contract_id,starts_on,next_charge_on,anchor_day) values(a,term,day,day,extract(day from day)::int);
  end if;
  id:=term;
 when 'trial' then
  day:=(d->>'trial_until')::date;
  select * into s from public.platform_subscriptions where academy_id=a for update;
  if not found or day<s.starts_on or day>private.platform_day()+365 then raise exception 'Fecha de prueba inválida';end if;
  if exists(select 1 from public.platform_charges where academy_id=a) then
   update public.platform_subscriptions set trial_until=day,recovery_required=true,updated_at=now() where academy_id=a;
  else update public.platform_subscriptions set trial_until=day,next_charge_on=day,anchor_day=extract(day from day)::int,updated_at=now() where academy_id=a;end if;
  id:=a;
 when 'extend' then
  day:=(d->>'extension_until')::date;
  if day<private.platform_day() or day>private.platform_day()+365 then raise exception 'Extensión fuera de rango';end if;
  update public.platform_subscriptions set extension_until=day,extension_reason=reason,recovery_required=true,updated_at=now() where academy_id=a;
  if not found then raise exception 'Asigna primero una suscripción';end if;id:=a;
 when 'grace' then
  update public.platform_subscriptions set grace_days=(d->>'grace_days')::int,automatic_suspension=coalesce((d->>'automatic_suspension')::boolean,automatic_suspension),recovery_required=true,updated_at=now() where academy_id=a;
  if not found then raise exception 'Asigna primero una suscripción';end if;id:=a;
 when 'suspend' then
  update public.platform_subscriptions set manual_block=true,manual_reason=reason,internal_note=d->>'internal_note',customer_message=coalesce(nullif(trim(d->>'customer_message'),''),'Contacta al propietario de tu academia para revisar el servicio.'),recovery_required=true,operational_paused_at=coalesce(operational_paused_at,now()),updated_at=now() where academy_id=a;
  if not found then raise exception 'Asigna primero una suscripción';end if;id:=a;
 when 'reactivate' then
  if d?'extension_until' and ((d->>'extension_until')::date<private.platform_day() or (d->>'extension_until')::date>private.platform_day()+365) then raise exception 'Extensión fuera de rango';end if;
  update public.platform_subscriptions set manual_block=false,manual_reason=null,status='activa',cancelled_on=null,ends_on=null,recovery_required=true,
  extension_until=case when d?'extension_until' then (d->>'extension_until')::date else extension_until end,
  extension_reason=case when d?'extension_until' then reason else extension_reason end,updated_at=now() where academy_id=a;
  if not found then raise exception 'Asigna primero una suscripción';end if;
  result:=jsonb_build_object('id',a,'access',private.business_access(a),'recovery_required',true);id:=a;
 when 'cancel' then
  update public.platform_subscriptions set status='cancelada',cancelled_on=private.platform_day(),recovery_required=true,operational_paused_at=coalesce(operational_paused_at,now()),customer_message=coalesce(nullif(trim(d->>'customer_message'),''),'El servicio está cancelado. Contacta a la plataforma.'),updated_at=now() where academy_id=a;
  if not found then raise exception 'Asigna primero una suscripción';end if;id:=a;
 when 'generate' then
  result:=private.platform_generate(a,coalesce((d->>'cutoff')::date,private.platform_day()),100);id:=a;
 when 'generate_all' then
  result:='[]';for business in select b.* from public.platform_businesses b join public.platform_subscriptions s on s.academy_id=b.academy_id where s.status='activa' and s.next_charge_on<=private.platform_day() and (s.ends_on is null or s.next_charge_on<=s.ends_on) order by s.next_charge_on,b.academy_id limit 100 loop
   result:=result||jsonb_build_array(jsonb_build_object('academy_id',business.academy_id,'result',private.platform_generate(business.academy_id,private.platform_day(),100)));
  end loop;
 when 'adjustment' then
  select * into charge from public.platform_charges where academy_id=a and platform_charges.id=(d->>'charge_id')::uuid for update;
  if not found then raise exception 'Cargo no disponible';end if;amount:=private.number(d,'amount');
  if amount=0 or private.platform_balance(charge.id,true)+amount<0 then raise exception 'El ajuste no puede dejar saldo negativo ni desconocer aplicaciones pendientes';end if;
  insert into public.platform_adjustments(id,academy_id,charge_id,amount,reason,actor) values(id,a,charge.id,amount,reason,actor);
 when 'payment' then
  amount:=private.number(d,'amount');
  select * into method from public.platform_payment_methods where platform_payment_methods.id=(d->>'method_id')::uuid and active for share;
  if not found or amount<=0 then raise exception 'Medio de pago o importe no válido';end if;
  if method.kind='transferencia' and nullif(trim(d->>'reference'),'') is null then raise exception 'La transferencia necesita referencia';end if;
  if (d->>'document_id')::uuid is not null and not exists(select 1 from public.platform_documents where academy_id=a and platform_documents.id=(d->>'document_id')::uuid and kind='comprobante') then raise exception 'Comprobante de otro negocio';end if;
  insert into public.platform_payments(id,academy_id,method_id,amount,currency,status,reference,document_id,actor,confirmed_by,confirmed_at)
  values(id,a,method.id,amount,upper(d->>'currency'),case when method.requires_verification then 'pendiente' else 'confirmado' end,d->>'reference',(d->>'document_id')::uuid,actor,case when not method.requires_verification then actor end,case when not method.requires_verification then now() end);
  if jsonb_array_length(coalesce(d->'applications','[]'))=0 then raise exception 'Aplica el pago al menos a un cargo';end if;
  for item in select value from jsonb_array_elements(d->'applications') order by value->>'charge_id' loop
   select * into charge from public.platform_charges where academy_id=a and platform_charges.id=(item->>'charge_id')::uuid for update;
   if not found or charge.currency<>upper(d->>'currency') then raise exception 'Cargo de otro negocio o moneda';end if;
   if private.number(item,'amount')<=0 or private.number(item,'amount')>private.platform_balance(charge.id,true) then raise exception 'Aplicación superior al saldo disponible';end if;
   allocated:=allocated+private.number(item,'amount');if allocated>amount then raise exception 'Las aplicaciones exceden el pago';end if;
   insert into public.platform_applications(academy_id,payment_id,charge_id,amount) values(a,id,charge.id,private.number(item,'amount'));
  end loop;
  if allocated<>amount then raise exception 'Distribuye el importe completo entre cargos; no se generan anticipos implícitos';end if;
 when 'confirm_payment' then
  select * into payment from public.platform_payments where academy_id=a and platform_payments.id=(d->>'payment_id')::uuid for update;
  if not found or payment.status='rechazado' then raise exception 'Pago no disponible para confirmar';end if;
  update public.platform_payments set status='confirmado',confirmed_by=actor,confirmed_at=coalesce(confirmed_at,now()) where platform_payments.id=payment.id;
  id:=payment.id;
 when 'reject_payment' then
  update public.platform_payments set status='rechazado',rejection_reason=reason where academy_id=a and platform_payments.id=(d->>'payment_id')::uuid and status='pendiente' returning platform_payments.id into id;
  if not found then raise exception 'Solo puedes rechazar un pago pendiente';end if;
 when 'document' then
  if split_part(d->>'path','/',1)<>a::text or (d->>'path')!~'^[a-f0-9-]+/(logo|comprobante)/[a-f0-9-]+[.](png|jpg|pdf)$' then raise exception 'Ruta de archivo no válida';end if;
  insert into public.platform_documents(id,academy_id,kind,title,path,mime_type,size_bytes,actor)
  values(id,a,d->>'kind',d->>'title',d->>'path',d->>'mime_type',(d->>'size_bytes')::int,actor);
  if d->>'kind'='logo' then update public.platform_businesses set logo_document_id=id,updated_at=now() where academy_id=a;end if;
 when 'invite_claim' then
  select * into business from public.platform_businesses where academy_id=a for update;
  if exists(select 1 from public.platform_subscriptions ss join public.platform_contracts cc on cc.id=ss.contract_id where ss.academy_id=a and
   (select count(*) from public.internal_members where academy_id=a and active)>=cc.max_users)
   and not exists(select 1 from public.internal_members m join auth.users u on u.id=m.user_id where m.academy_id=a and m.active and lower(u.email)=business.owner_email)
  then raise exception 'Se alcanzó el límite de usuarios. Revisa el contrato antes de invitar al propietario.';end if;
  if business.invitation_status in('enviada','vinculada') and not coalesce((d->>'resend')::boolean,false) then result:=jsonb_build_object('id',a,'done',true,'status',business.invitation_status);
  elsif business.invitation_lease_until>now() then raise exception 'Ya hay una invitación en curso. Espera antes de reintentar.';
  else lease:=gen_random_uuid();
   update public.platform_businesses set invitation_status='enviando',invitation_lease_until=now()+interval '2 minutes',invitation_token=lease,invitation_attempts=invitation_attempts+1,invitation_error=null where academy_id=a;
   result:=jsonb_build_object('id',a,'email',business.owner_email,'name',business.owner_name,'token',lease,'done',false);
  end if;id:=a;
 else raise exception 'Operación de plataforma no reconocida';end case;
 if a is not null and previous_access='suspendida_impago' and private.business_operational(a) then
  update public.platform_subscriptions set recovery_required=true,operational_paused_at=coalesce(operational_paused_at,now()) where academy_id=a;
 end if;
 result:=coalesce(result,jsonb_build_object('id',id));
 insert into public.platform_audit(academy_id,actor,action,entity_id,reason,details)
 values(a,actor,action,id,reason,jsonb_build_object('operation_key',key));
 update private.platform_operation_keys set result=result where platform_operation_keys.key=key;
 return result;
end$$;
revoke all on function private.platform_operate(text,jsonb,uuid) from public,anon;
grant execute on function private.platform_operate(text,jsonb,uuid) to authenticated;
create function public.platform_operate(p_action text,p_data jsonb,p_key uuid) returns jsonb language sql security invoker set search_path='' as $$select private.platform_operate(p_action,p_data,p_key)$$;
revoke all on function public.platform_operate(text,jsonb,uuid) from public,anon;
grant execute on function public.platform_operate(text,jsonb,uuid) to authenticated;

-- Admin Auth is confined to invitations; this worker cannot be invoked by academy accounts.
create function public.platform_finish_invitation(p_academy uuid,p_token uuid,p_user uuid,p_status text,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
declare b public.platform_businesses;m uuid;r uuid;actor uuid;begin
 perform 1 from public.academies where id=p_academy for update;
 select * into b from public.platform_businesses where academy_id=p_academy for update;
 if not found or b.invitation_token is distinct from p_token or b.invitation_status<>'enviando' then raise exception 'Solicitud de invitación vencida o ya resuelta';end if;
 if p_status not in('enviada','vinculada','fallida') then raise exception 'Estado de invitación inválido';end if;
 if p_status<>'fallida' then
  if not exists(select 1 from auth.users where id=p_user and lower(email)=b.owner_email) then raise exception 'El usuario no coincide con el destinatario autorizado';end if;
  insert into public.internal_members(academy_id,user_id,name,active,all_branches) values(p_academy,p_user,b.owner_name,true,true)
  on conflict(academy_id,user_id) do update set name=excluded.name,active=true,all_branches=true returning id into m;
  select id into r from public.roles where academy_id=p_academy and name='Propietario' and '*'=any(permissions);
  if r is null then raise exception 'Falta el rol propietario del negocio';end if;
  insert into public.member_roles(academy_id,member_id,role_id) values(p_academy,m,r) on conflict(member_id,role_id) do nothing;
 end if;
 select op.actor into actor from private.platform_operation_keys op where op.action='invite_claim' and op.result->>'token'=p_token::text order by created_at desc limit 1;
 update public.platform_businesses set owner_user_id=case when p_status<>'fallida' then p_user else owner_user_id end,invitation_status=p_status,
 invitation_error=case when p_status='fallida' then left(coalesce(p_error,'No se pudo enviar la invitación.'),200) end,
 invitation_token=null,invitation_lease_until=null,invited_at=case when p_status='enviada' then now() else invited_at end,updated_at=now() where academy_id=p_academy;
 insert into public.platform_audit(academy_id,actor,action,entity_id,details) values(p_academy,actor,'invitation_'||p_status,p_user,jsonb_build_object('attempt',b.invitation_attempts));
end$$;
revoke all on function public.platform_finish_invitation(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.platform_finish_invitation(uuid,uuid,uuid,text,text) to service_role;

create function public.scheduled_platform_billing(p_limit int default 100) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a record;result jsonb:='[]';r jsonb;run uuid;total int:=0;remaining boolean:=false;begin
 if p_limit not between 1 and 200 then raise exception 'Lote inválido';end if;
 perform pg_advisory_xact_lock(hashtext('platform_billing'));
 insert into public.platform_job_runs default values returning id into run;
 for a in select academy_id from public.platform_subscriptions where status='activa' and next_charge_on<=private.platform_day() order by next_charge_on,academy_id limit 50 loop
  r:=private.platform_generate(a.academy_id,private.platform_day(),p_limit);total:=total+(r->>'generated')::int;
  remaining:=remaining or (r->>'remaining')::boolean;result:=result||jsonb_build_array(jsonb_build_object('academy_id',a.academy_id,'result',r));
 end loop;
 update public.platform_subscriptions set recovery_required=true,operational_paused_at=coalesce(operational_paused_at,now()) where private.business_access(academy_id)='suspendida_impago';
 remaining:=remaining or exists(select 1 from public.platform_subscriptions where status='activa' and next_charge_on<=private.platform_day() and (ends_on is null or next_charge_on<=ends_on));
 update public.platform_job_runs set generated=total,remaining=remaining,finished_at=now() where id=run;return jsonb_build_object('run',run,'results',result,'remaining',remaining);
end$$;
revoke all on function public.scheduled_platform_billing(int) from public,anon,authenticated;
grant execute on function public.scheduled_platform_billing(int) to service_role;
create or replace function public.scheduled_billing(p_limit int default 100) returns jsonb language plpgsql security definer set search_path='' as $$
declare a record;results jsonb:='[]';r jsonb;begin
 if p_limit not between 1 and 200 then raise exception 'Lote inválido';end if;
 update public.platform_subscriptions set recovery_required=true,operational_paused_at=coalesce(operational_paused_at,now()) where private.business_access(academy_id)='suspendida_impago';
 for a in select ac.id,ac.timezone from public.academies ac left join public.platform_subscriptions ps on ps.academy_id=ac.id
 where private.business_operational(ac.id) and not coalesce(ps.recovery_required,false)
 order by (select max(jr.started_at) from public.job_runs jr where jr.academy_id=ac.id) nulls first,ac.id limit 50 loop
  r:=private.generate_billing(a.id,(now() at time zone a.timezone)::date,p_limit);
  r:=r||jsonb_build_object('expenses',private.generate_expenses(a.id,(now() at time zone a.timezone)::date,p_limit));
  results:=results||jsonb_build_array(jsonb_build_object('academy',a.id,'result',r));
 end loop;return results;
end$$;
