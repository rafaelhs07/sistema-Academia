import 'server-only';
import { createSupabase } from './supabase/server';
export class PlatformAccessError extends Error { constructor(public status:number,message:string){super(message);} }
export async function platformContext(requireMfa=true){
 const client=await createSupabase();const {data:{user},error}=await client.auth.getUser();
 if(error||!user)throw new PlatformAccessError(401,'Inicia sesión.');
 const identity=await client.rpc('platform_identity');
 if(identity.error)throw Error('No se pudo verificar el acceso de plataforma.');
 if(!identity.data?.superadmin)throw new PlatformAccessError(403,'Acceso exclusivo de Superadministrador.');
 if(requireMfa&&identity.data.mfa_required)throw new PlatformAccessError(403,'Completa la autenticación multifactor.');
 return {client,user,mfaRequired:Boolean(identity.data.mfa_required)};
}
export async function platformData(resource:string,filters:Record<string,unknown>={}){const {client}=await platformContext();const {data,error}=await client.rpc('platform_data',{p_resource:resource,p_filters:filters});if(error)throw Error(error.message);return data;}
export function sameOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new PlatformAccessError(403,'Origen no permitido.');}
