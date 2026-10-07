import 'server-only';
import { z } from 'zod';
import { adminClient } from './supabase/admin';
import { platformContext } from './platform';
export async function inviteBusiness(values:Record<string,unknown>,key:string){
 const {client}=await platformContext();
 const privileged=adminClient(); // Validate configuration before claiming a lease.
 const appUrl=z.url().parse(process.env.NEXT_PUBLIC_APP_URL);
 const claim=await client.rpc('platform_operate',{p_action:'invite_claim',p_data:values,p_key:key});
 if(claim.error)throw Error(claim.error.message);const pending=claim.data;
 if(pending.done)return {id:values.academy_id,status:pending.status};
 const current=await client.from('platform_businesses').select('invitation_token,invitation_status,invitation_error').eq('academy_id',values.academy_id).single();
 if(current.error)throw Error('No se pudo verificar el intento de invitación.');
 if(current.data.invitation_token!==pending.token)return {id:values.academy_id,status:current.data.invitation_status,error:current.data.invitation_error};
 let userId:string|null=null,status='fallida',failure:string|null=null;
 try{
  let existing;let exhausted=false;
  for(let page=1;page<=100;page++){const result=await privileged.auth.admin.listUsers({page,perPage:100});if(result.error)throw result.error;existing=result.data.users.find(u=>u.email?.toLowerCase()===pending.email);if(existing||result.data.users.length<100){exhausted=true;break;}}
  if(!exhausted)throw Error('USER_LOOKUP_LIMIT');
  if(existing?.email_confirmed_at){userId=existing.id;status='vinculada';}
  else {const result=await privileged.auth.admin.inviteUserByEmail(pending.email,{redirectTo:`${appUrl}/auth/callback?next=/auth/password`});if(result.error)throw result.error;if(!result.data.user)throw Error('INVITE_NO_USER');userId=result.data.user.id;status='enviada';}
 }catch{failure='No se pudo enviar la invitación. Revisa el correo, SMTP, los límites de Auth y reintenta.';}
 const finished=await privileged.rpc('platform_finish_invitation',{p_academy:values.academy_id,p_token:pending.token,p_user:userId,p_status:status,p_error:failure});
 if(finished.error)throw Error('La invitación requiere conciliación. Revisa los límites del plan y reintenta después de dos minutos. El negocio se conserva.');
 return {id:values.academy_id,status,error:failure};
}
