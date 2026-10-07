import { NextRequest,NextResponse } from 'next/server';
import { operations } from '@/domains/catalog';
import { getContext,requirePermission } from '@/lib/context';
import { formSchema,safeError,uuid } from '@/lib/validation';
export async function POST(request:NextRequest,{params}:{params:Promise<{action:string}>}) {
 try{
  if(request.headers.get('origin')!==request.nextUrl.origin)throw Error('Origen de solicitud no permitido.');
  const {action}=await params;const op=operations[action];if(!op)throw Error('Operación desconocida.');
  const body=await request.json();const {client,context}=await getContext(body.academy,body.branch??'all');requirePermission(context,op.permission);
  const values=formSchema(op.fields,context.academy.timezone).parse(body.data);
  const {data,error}=await client.rpc('operate',{p_academy:context.academy.id,p_branch:context.branch,p_action:action,p_data:values,p_key:uuid.parse(body.key)});if(error)throw Error(error.message);
  return NextResponse.json(data);
 }catch(error){return NextResponse.json({error:safeError(error)},{status:400});}
}
