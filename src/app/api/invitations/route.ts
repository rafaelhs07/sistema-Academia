import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { getContext,requirePermission,BusinessServiceError } from '@/lib/context';
import { adminClient } from '@/lib/supabase/admin';
import { safeError } from '@/lib/validation';
export async function POST(request:NextRequest){
 try{if(request.headers.get('origin')!==request.nextUrl.origin)throw Error('Origen no permitido.');
  const body=await request.json();const {client,context}=await getContext(body.academy,body.branch);requirePermission(context,'users.manage');
  const email=z.email().parse(body.email);const name=z.string().trim().min(2).max(120).parse(body.name);
  const {data,error}=await adminClient().auth.admin.inviteUserByEmail(email,{redirectTo:`${z.url().parse(process.env.NEXT_PUBLIC_APP_URL)}/auth/callback?next=/auth/password`});if(error)throw Error(error.message);
  const {error:accessError}=await client.rpc('operate',{p_academy:context.academy.id,p_branch:context.branch,p_action:'user_access',p_key:crypto.randomUUID(),p_data:{user_id:data.user.id,name,active:false,all_branches:false,branch_ids:[],role_ids:[]}});
  if(accessError)throw Error('La invitación se envió, pero no se pudo crear la membresía. El administrador debe registrar el acceso con el ID del usuario en Supabase.');
  return NextResponse.json({id:data.user.id});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:error instanceof BusinessServiceError?403:400});}
}
