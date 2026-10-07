import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { platformContext,PlatformAccessError,sameOrigin } from '@/lib/platform';
import { platformResources,platformValues } from '@/domains/platform';
import { inviteBusiness } from '@/lib/platform-invitation';
import { safeError } from '@/lib/validation';
import { csv } from '@/lib/csv';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:NextRequest,{params}:{params:Promise<{resource:string}>}){try{
 const resource=z.enum(platformResources).parse((await params).resource);const {client}=await platformContext();
 const filters=Object.fromEntries(request.nextUrl.searchParams);delete filters.export;
 const {data,error}=await client.rpc('platform_data',{p_resource:resource,p_filters:filters});if(error)throw Error(error.message);
 if(request.nextUrl.searchParams.get('export')==='csv'){
  if(!data.rows)throw Error('Este indicador no se exporta como tabla.');
  const columns=resource==='businesses'?['commercial_name','owner_email','plan_name','subscription_status','access','next_due_on','currency','price','branches_count','users_count']:resource==='payments'?['receipt_number','academy_id','amount','currency','status','reference','confirmed_at','created_at']:resource==='charges'?['academy_id','description','amount','currency','period_on','due_on','balance']:[];
  if(!columns.length)throw Error('Exportación no disponible para este recurso.');
  return new NextResponse(csv(columns,data.rows),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="plataforma-${resource}-pagina.csv"`}});
 }
 return NextResponse.json(data,{headers});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:error instanceof PlatformAccessError?error.status:400,headers});}}
export async function POST(request:NextRequest,{params}:{params:Promise<{resource:string}>}){try{
 sameOrigin(request);if(Number(request.headers.get('content-length')??0)>100000)throw Error('Solicitud demasiado grande.');
 const action=(await params).resource;const body=await request.json();const values=platformValues(action,body.data),key=z.uuid().parse(body.key);
 const {client}=await platformContext();
 if(action==='invite')return NextResponse.json(await inviteBusiness(values,key),{headers});
 const {data,error}=await client.rpc('platform_operate',{p_action:action,p_data:values,p_key:key});if(error)throw Error(error.message);
 return NextResponse.json(data,{headers});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:error instanceof PlatformAccessError?error.status:400,headers});}}
