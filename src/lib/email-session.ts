const invalidLink='El enlace no está disponible. Solicita uno nuevo para definir tu contraseña.';

export function readEmailSession(fragment:string){
 const params=new URLSearchParams(fragment.replace(/^#/,''));
 const required=['access_token','refresh_token','type','token_type'];
 if(params.has('error')||params.has('error_code')||required.some(key=>params.getAll(key).length!==1||!params.get(key)))throw Error(invalidLink);
 if(!['invite','recovery'].includes(params.get('type')!)||params.get('token_type')!=='bearer')throw Error(invalidLink);
 // Supabase validates the tokens in setSession; URL fields never grant permissions.
 return {access_token:params.get('access_token')!,refresh_token:params.get('refresh_token')!};
}
