import { NextRequest,NextResponse } from 'next/server';
import { resources } from '@/domains/catalog';
import { getContext,requirePermission } from '@/lib/context';
import { formSchema,safeError,uuid } from '@/lib/validation';
import { csv } from '@/lib/csv';
import { Temporal } from '@js-temporal/polyfill';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{resource:string}>}) {
 try{
  const {resource:key}=await params;const resource=resources[key];if(!resource)return NextResponse.json({error:'Recurso no disponible.'},{status:404});
  const url=request.nextUrl;const {client,context}=await getContext(url.searchParams.get('academy'),url.searchParams.get('branch'));
  requirePermission(context,`${resource.domain}.read`);
  if(key==='instructors'){const result=await client.rpc('instructor_directory',{p_academy:context.academy.id,p_branch:context.branch,p_search:(url.searchParams.get('search')??'').slice(0,100)});if(result.error)throw Error(result.error.message);return NextResponse.json({rows:result.data??[],count:result.data?.length??0});}
  const page=Math.max(0,Math.min(10000,Number(url.searchParams.get('page')??0)||0));const exporting=url.searchParams.get('export')==='csv';
  let query=client.from(resource.table).select('*',{count:'exact'}).eq('academy_id',context.academy.id);
  if(resource.branch&&context.branch)query=query.eq('branch_id',context.branch);
  const search=url.searchParams.get('search')?.trim().slice(0,100);if(search&&resource.search){const value=search.replace(/[%,_()"\\]/g,'');query=key==='product_variants'?query.or(`name.ilike.%${value}%,code.ilike.%${value}%`):query.ilike(resource.search,`%${value}%`);}
  const ids=url.searchParams.get('ids');if(ids){const selectedIds=ids.split(',').slice(0,100).map(id=>uuid.parse(id));query=query.in(key==='internal_members'&&url.searchParams.get('by')==='user_id'?'user_id':'id',selectedIds);}
  const student=url.searchParams.get('student');if(student&&key==='students')query=query.eq('id',uuid.parse(student));else if(student&&['charges','payments','memberships','student_guardians','student_progress','student_notes','documents','attendance','commitments'].includes(key))query=query.eq('student_id',uuid.parse(student));
  const state=url.searchParams.get('status');if(state)query=query.eq('status',state.slice(0,30));
  const dateKey=resource.date??'created_at';
  for(const filter of ['from','to'] as const){const value=url.searchParams.get(filter);if(value){const day=String(formSchema([{key:'day',label:'Fecha',type:'date'}],context.academy.timezone).parse({day:value}).day);if(dateKey.endsWith('_at')){const boundary=Temporal.PlainDate.from(day).add({days:filter==='to'?1:0}).toZonedDateTime(context.academy.timezone).toInstant().toString();query=filter==='from'?query.gte(dateKey,boundary):query.lt(dateKey,boundary);}else query=filter==='from'?query.gte(dateKey,day):query.lte(dateKey,day);}}
  query=query.order('created_at',{ascending:false}).range(page*50,page*50+(exporting?9999:49));
  const {data,error,count}=await query;if(error)throw Error(error.message);
  if(exporting){if((count??0)>10000)throw Error('La exportación supera 10 000 filas. Reduce el período.');return new NextResponse(csv(resource.columns,data??[]),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${key}.csv"`,'Cache-Control':'private, no-store'}});}
  const referenceTables:Record<string,string>={student_id:'students',payer_id:'contacts',contact_id:'contacts',group_id:'student_groups',discipline_id:'disciplines',belt_id:'belts',branch_id:'branches',to_branch_id:'branches',account_id:'accounts',from_account_id:'accounts',to_account_id:'accounts',method_id:'payment_methods',product_id:'products',variant_id:'product_variants',category_id:'product_categories',supplier_id:'suppliers',employee_id:'employees',instructor_id:'employees',substitute_id:'employees',room_id:'rooms',class_id:'classes',plan_id:'plans'};
  const names:Record<string,Record<string,string>>={};
  await Promise.all(Object.entries(referenceTables).filter(([field])=>data?.some(row=>row[field])).map(async([field,table])=>{const ids=[...new Set((data??[]).map(row=>row[field]).filter(Boolean))];const result=await client.from(table).select('id,name').eq('academy_id',context.academy.id).in('id',ids);names[field]=Object.fromEntries((result.data??[]).map(row=>[row.id,row.name]));}));
  if(key==='classes'||key==='class_templates'){const directory=await client.rpc('instructor_directory',{p_academy:context.academy.id,p_branch:context.branch,p_search:''});if(directory.error)throw Error(directory.error.message);const mapping=Object.fromEntries((directory.data??[]).map((row:{id:string;name:string})=>[row.id,row.name]));names.instructor_id=mapping;names.substitute_id=mapping;}
  if(key==='expenses'){const ids=[...new Set((data??[]).map(row=>row.category_id).filter(Boolean))];if(ids.length){const categories=await client.from('expense_categories').select('id,name').in('id',ids);names.category_id=Object.fromEntries((categories.data??[]).map(row=>[row.id,row.name]));}}
  const enriched=(data??[]).map(row=>({...row,_labels:Object.fromEntries(Object.keys(names).filter(key=>row[key]).map(key=>[key,names[key][row[key]]??'Registro de otra sección']))}));
  return NextResponse.json({rows:enriched,count:count??0},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:String(error).includes('AUTH_REQUIRED')?401:400});}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{resource:string}>}) {
 try{
  if(request.headers.get('origin')!==request.nextUrl.origin)throw Error('Origen de solicitud no permitido.');
  const {resource:key}=await params;const resource=resources[key];if(!resource?.writable)throw Error('Este registro se modifica mediante su proceso autorizado.');
  const body=await request.json();const {client,context}=await getContext(body.academy,body.branch??'all');requirePermission(context,resource.permission??`${resource.domain}.write`);
  const values=formSchema(resource.fields,context.academy.timezone).parse(body.data);
  if(key==='students'&&['pausado','retirado'].includes(String(values.status))&&!values.status_reason)throw Error('Escribe el motivo de pausa o retiro.');
  const payload={...values,academy_id:context.academy.id,...(resource.branch?{branch_id:context.branch}:{} )};
  if(resource.branch&&!context.branch)throw Error('Primero crea o selecciona una sucursal.');
  const table=key==='accounts'?'accounts':resource.table;
  const query=body.id?client.from(table).update(payload).eq('id',uuid.parse(body.id)).eq('academy_id',context.academy.id):client.from(table).insert(payload);
  const {data,error}=await query.select('id').single();if(error)throw Error(error.message);
  return NextResponse.json({id:data.id});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:400});}
}
