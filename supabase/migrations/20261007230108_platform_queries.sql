create function private.business_summary(a uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select (to_jsonb(b)-'invitation_token'-'invitation_lease_until')||jsonb_build_object(
 'id',b.academy_id,'country',ac.country,'operating_currency',ac.currency,'timezone',ac.timezone,
 'plan_id',c.plan_id,'plan_name',coalesce(c.plan_name,'Sin contrato'),'price',c.price,'currency',c.currency,'cycle',c.cycle,
 'subscription',to_jsonb(s),'access',private.business_access(a),
 'subscription_status',case when s.status='cancelada' then 'cancelada' when private.business_access(a)='prueba' then 'prueba'
 when private.business_access(a) in('suspendida_manual','suspendida_impago') then 'suspendida' when s.academy_id is null then 'sin_contrato' else 'activa' end,
 'next_due_on',coalesce((select min(due_on) from public.platform_charges where academy_id=a and private.platform_balance(id)>0),s.next_charge_on),
 'balances',coalesce((select jsonb_agg(x) from(select currency,sum(private.platform_balance(id))::text balance from public.platform_charges where academy_id=a group by currency)x),'[]'),
 'branches_count',(select count(*) from public.branches where academy_id=a),
 'users_count',(select count(*) from public.internal_members where academy_id=a and active),
 'usage',jsonb_build_object('branches',(select count(*) from public.branches where academy_id=a and active),
 'users',(select count(*) from public.internal_members where academy_id=a and active),'students',(select count(*) from public.students where academy_id=a and status='activo')),
 'limits',jsonb_build_object('branches',c.max_branches,'users',c.max_users,'students',c.max_students),'modules',c.modules)
 from public.platform_businesses b join public.academies ac on ac.id=b.academy_id
 left join public.platform_subscriptions s on s.academy_id=b.academy_id left join public.platform_contracts c on c.id=s.contract_id where b.academy_id=a
$$;
revoke all on function private.business_summary(uuid) from public,anon,authenticated;

create function private.platform_dashboard(from_on date,to_on date) returns jsonb language sql stable security definer set search_path='' as $$
 with businesses as(select private.business_summary(academy_id) row from public.platform_businesses),
 counts as(select count(*) total,count(*) filter(where row->>'subscription_status'='prueba') trials,
 count(*) filter(where row->>'subscription_status'='activa') active,count(*) filter(where row->>'subscription_status'='suspendida') suspended,
 count(*) filter(where row->>'subscription_status'='cancelada') cancelled,
 count(*) filter(where (row->>'next_due_on')::date between private.platform_day() and private.platform_day()+7) expiring,
 count(*) filter(where exists(select 1 from public.platform_charges c where c.academy_id=(row->>'id')::uuid and c.due_on<private.platform_day() and private.platform_balance(c.id)>0)) overdue,
 count(*) filter(where (row->>'created_at')::timestamptz>=(date_trunc('month',private.platform_day()) at time zone (select timezone from public.platform_settings where id))) new_month from businesses)
 select jsonb_build_object('counts',(select to_jsonb(counts) from counts),'currencies',coalesce((select jsonb_agg(x) from(
 select currency,coalesce((select sum(p.amount) from public.platform_payments p where p.currency=cu.currency and p.status='confirmado'
 and (coalesce(p.confirmed_at,p.created_at) at time zone (select timezone from public.platform_settings where id))::date between from_on and to_on),0)::text collected,
 coalesce((select sum(private.platform_balance(c.id)) from public.platform_charges c where c.currency=cu.currency),0)::text pending
 from(select currency from public.platform_charges union select currency from public.platform_payments)cu order by currency)x),'[]'))
$$;
revoke all on function private.platform_dashboard(date,date) from public,anon,authenticated;

create function private.platform_data(resource text,filters jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
#variable_conflict use_variable
declare a uuid:=(filters->>'academy_id')::uuid;take int:=least(coalesce((filters->>'limit')::int,25),100);
 skip int:=coalesce((filters->>'offset')::int,0);q text:=coalesce(filters->>'search','');rows jsonb;total bigint;t text;where_sql text;begin
 perform private.require_platform_admin();
 if skip<0 or skip>100000 or take<1 or length(q)>120 then raise exception 'Paginación o búsqueda inválida';end if;
 if resource='dashboard' then return private.platform_dashboard(coalesce((filters->>'from_on')::date,date_trunc('month',private.platform_day())::date),coalesce((filters->>'to_on')::date,private.platform_day()));end if;
 if resource='preview' then return private.suspension_preview();end if;
 if resource='businesses' then
  with matches as(select private.business_summary(b.academy_id) row from public.platform_businesses b
  where (a is null or b.academy_id=a) and (q='' or b.commercial_name ilike '%'||q||'%' or b.owner_email ilike '%'||q||'%' or b.responsible_name ilike '%'||q||'%')),
  filtered as(select * from matches where
  (nullif(filters->>'plan_id','') is null or row->>'plan_id'=filters->>'plan_id')
  and (nullif(filters->>'access','') is null or row->>'access'=filters->>'access')
  and (nullif(filters->>'subscription_status','') is null or row->>'subscription_status'=filters->>'subscription_status')
  and (coalesce(filters->>'due_mode','')<>'proxima' or (row->>'next_due_on')::date between private.platform_day() and private.platform_day()+7)
  and (coalesce(filters->>'due_mode','')<>'vencida' or exists(select 1 from public.platform_charges c where c.academy_id=(row->>'id')::uuid and c.due_on<private.platform_day() and private.platform_balance(c.id)>0))
  and (coalesce(filters->>'created_mode','')<>'mes' or (row->>'created_at')::timestamptz>=(date_trunc('month',private.platform_day()) at time zone (select timezone from public.platform_settings where id))))
  select (select count(*) from filtered),coalesce((select jsonb_agg(row) from(select row from filtered order by row->>'commercial_name' limit take offset skip)x),'[]') into total,rows;
 else
  t:=case resource when 'plans' then 'platform_plans' when 'methods' then 'platform_payment_methods' when 'charges' then 'platform_charge_balances'
  when 'payments' then 'platform_payments' when 'contracts' then 'platform_contracts' when 'audit' then 'platform_audit'
  when 'documents' then 'platform_documents' when 'settings' then 'platform_settings' when 'jobs' then 'platform_job_runs' end;
  if t is null then raise exception 'Recurso de plataforma no disponible';end if;
  where_sql:=case when resource in('charges','payments','contracts','audit','documents') then ' where ($1::uuid is null or academy_id=$1)' else ' where $1::uuid is null' end;
  if resource in('plans','methods') then where_sql:=where_sql||' and (coalesce($2,'''')='''' or name ilike ''%''||$2||''%'')';else where_sql:=where_sql||' and ($2::text is null or $2::text is not null)';end if;
  if resource in('charges','payments') then
   where_sql:=where_sql||' and (coalesce($5->>''currency'','''')='''' or currency=$5->>''currency'')';
   if resource='payments' then where_sql:=where_sql||' and (coalesce($5->>''status'','''')='''' or status=$5->>''status'') and (coalesce(confirmed_at,created_at) at time zone (select timezone from public.platform_settings where id))::date between coalesce(($5->>''from_on'')::date,''1900-01-01''::date) and coalesce(($5->>''to_on'')::date,''9999-12-31''::date)';
   else where_sql:=where_sql||' and (coalesce($5->>''unpaid'','''')<>''true'' or balance>0)';end if;
  else where_sql:=where_sql||' and ($5::jsonb is null or $5::jsonb is not null)';end if;
  execute format('select count(*) from public.%I%s',t,where_sql) into total using a,q,take,skip,filters;
  execute format('select coalesce(jsonb_agg(x),''[]'') from(select * from public.%I%s order by %s limit $3 offset $4)x',t,where_sql,
  case when resource in('plans','methods') then 'name' when resource='settings' then 'id' when resource='jobs' then 'started_at desc' else 'created_at desc' end) into rows using a,q,take,skip,filters;
 end if;
 return jsonb_build_object('rows',rows,'count',total,'offset',skip,'limit',take);
end$$;
revoke all on function private.platform_data(text,jsonb) from public,anon;
grant execute on function private.platform_data(text,jsonb) to authenticated;
create function public.platform_data(p_resource text,p_filters jsonb default '{}') returns jsonb language sql stable security invoker set search_path='' as $$select private.platform_data(p_resource,p_filters)$$;
revoke all on function public.platform_data(text,jsonb) from public,anon;
grant execute on function public.platform_data(text,jsonb) to authenticated;

create function private.platform_logo(a uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case when pd.path is not null then jsonb_build_object('bucket','platform-private','path',pd.path)
 when d.path is not null then jsonb_build_object('bucket','academy-private','path',d.path) end
 from public.platform_businesses b join public.academies ac on ac.id=b.academy_id
 left join public.platform_documents pd on pd.id=b.logo_document_id and pd.kind='logo'
 left join public.documents d on d.id=ac.logo_document_id and d.student_id is null and d.mime_type in('image/png','image/jpeg')
 where b.academy_id=a and private.platform_admin()
$$;
revoke all on function private.platform_logo(uuid) from public,anon;
grant execute on function private.platform_logo(uuid) to authenticated;
create function public.platform_logo(p_academy uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.platform_logo(p_academy)$$;
revoke all on function public.platform_logo(uuid) from public,anon;
grant execute on function public.platform_logo(uuid) to authenticated;
create function private.platform_academy_logo_access(path text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare logo jsonb;begin logo:=private.platform_logo(split_part(path,'/',1)::uuid);return logo->>'bucket'='academy-private' and logo->>'path'=path;
exception when invalid_text_representation then return false;end$$;
revoke all on function private.platform_academy_logo_access(text) from public,anon;
grant execute on function private.platform_academy_logo_access(text) to authenticated;
alter policy academy_files_read on storage.objects using(bucket_id='academy-private' and
 (private.storage_access(name,'documents.read') or private.logo_access(name) or private.platform_academy_logo_access(name)));

create function private.academy_recovery(a uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.business_operational(a) or not private.academy_permission(a,null,'owner.manage') or not private.academy_permission(a,null,'billing.generate') then raise exception 'Solo el propietario activo puede revisar la recuperación' using errcode='42501';end if;
 return jsonb_build_object('paused_at',(select operational_paused_at from public.platform_subscriptions where academy_id=a),
 'memberships',coalesce((select jsonb_agg(x) from(select m.id,st.name,m.next_charge_on,pv.price-m.discount amount,ac.currency
 from public.memberships m join public.students st on st.id=m.student_id join public.plan_versions pv on pv.id=m.plan_version_id
 join public.academies ac on ac.id=m.academy_id where m.academy_id=a and m.status='activa' and pv.renewable and m.next_charge_on<=(now() at time zone ac.timezone)::date order by m.next_charge_on limit 100)x),'[]'),
 'expenses',coalesce((select jsonb_agg(x) from(select e.id,e.description,e.next_due_on,e.amount from public.expense_templates e join public.academies ac on ac.id=e.academy_id
 where e.academy_id=a and e.active and e.next_due_on<=(now() at time zone ac.timezone)::date order by e.next_due_on limit 100)x),'[]'),
 'warning','La revisión muestra hasta 100 registros afectados. Cada registro puede tener varios períodos pendientes. La generación se ejecuta en lotes y conserva la tarifa histórica.');
end$$;
revoke all on function private.academy_recovery(uuid) from public,anon;
grant execute on function private.academy_recovery(uuid) to authenticated;
create function public.academy_recovery(p_academy uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.academy_recovery(p_academy)$$;
revoke all on function public.academy_recovery(uuid) from public,anon;
grant execute on function public.academy_recovery(uuid) to authenticated;
create function private.resume_academy(a uuid,reason text,key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare old private.platform_operation_keys;payload jsonb:=jsonb_build_object('academy_id',a,'reason',reason);begin
 perform private.academy_recovery(a);
 if reason is null or length(trim(reason))<5 or key is null then raise exception 'Motivo y clave de reintento obligatorios';end if;
 perform 1 from public.academies where id=a for update;
 insert into private.platform_operation_keys(key,actor,action,payload) values(key,auth.uid(),'resume_academy',payload) on conflict do nothing;
 select * into old from private.platform_operation_keys where platform_operation_keys.key=key for update;
 if old.actor<>auth.uid() or old.payload<>payload or old.action<>'resume_academy' then raise exception 'Clave utilizada por otra operación';end if;
 if old.result is not null then return old.result;end if;
 update public.platform_subscriptions set recovery_required=false,operational_paused_at=null where academy_id=a;
 insert into public.platform_audit(academy_id,actor,action,reason) values(a,auth.uid(),'resume_academy',reason);
 update private.platform_operation_keys set result='{"resumed":true}' where platform_operation_keys.key=key;return '{"resumed":true}';
end$$;
revoke all on function private.resume_academy(uuid,text,uuid) from public,anon;
grant execute on function private.resume_academy(uuid,text,uuid) to authenticated;
create function public.academy_resume(p_academy uuid,p_reason text,p_key uuid) returns jsonb language sql security invoker set search_path='' as $$select private.resume_academy(p_academy,p_reason,p_key)$$;
revoke all on function public.academy_resume(uuid,text,uuid) from public,anon;
grant execute on function public.academy_resume(uuid,text,uuid) to authenticated;

-- Expand wildcard academy roles for navigation, filtering contracted modules centrally.
create function private.academy_permissions(a uuid) returns text[] language sql stable security definer set search_path='' as $$
 with configured as(select unnest(r.permissions) p from public.internal_members m join public.member_roles mr on mr.member_id=m.id join public.roles r on r.id=mr.role_id where m.academy_id=a and m.user_id=auth.uid() and m.active and r.active),
 expanded as(select p from configured where p<>'*' union select unnest(array['audit.read','billing.collect','billing.discount','billing.generate','billing.read','billing.refund','billing.verify','billing.write','classes.override','classes.read','classes.write','dashboard.read','documents.read','documents.write','expenses.approve','expenses.pay','expenses.read','expenses.write','inventory.approve','inventory.read','inventory.write','notes.read','notes.write','owner.manage','reports.read','sales.credit','sales.discount','sales.read','sales.refund','sales.write','settings.read','settings.write','staff.approve','staff.read','staff.write','students.read','students.write','treasury.approve','treasury.read','treasury.write','users.manage']) where exists(select 1 from configured where p='*'))
 select coalesce(array_agg(distinct p),'{}') from expanded where private.has_permission(a,null,p)
$$;
revoke all on function private.academy_permissions(uuid) from public,anon;
grant execute on function private.academy_permissions(uuid) to authenticated;
create or replace function public.my_permissions(p_academy uuid) returns text[] language sql stable security invoker set search_path='' as $$select private.academy_permissions(p_academy)$$;
