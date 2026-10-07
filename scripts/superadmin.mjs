// Trusted operator only. Never imported by the application or executed on deployment.
import { createClient } from '@supabase/supabase-js';
const args=Object.fromEntries(process.argv.slice(2).map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)];}));
if(!args.email||!args.reason||args.reason.trim().length<5||args.confirm!==args.email)throw Error('Usa email=correo reason="motivo" confirm=el-mismo-correo. Revisa la identidad antes de nombrarla.');
if(!process.env.SUPABASE_SECRET_KEY)throw Error('Configura SUPABASE_SECRET_KEY únicamente en .env.local.');
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let user,completed=false;
for(let page=1;page<=100;page++){const r=await client.auth.admin.listUsers({page,perPage:100});if(r.error)throw Error(`No se pudo consultar Auth (${r.error.status??'error'}).`);user=r.data.users.find(u=>u.email?.toLowerCase()===args.email.toLowerCase());if(user||r.data.users.length<100){completed=true;break;}}
if(!completed)throw Error('La búsqueda excedió 10.000 cuentas. Revisa la identidad desde la consola autorizada.');
if(!user||(!user.email_confirmed_at&&args.invite==='true')){if(args.invite!=='true')throw Error('No existe la cuenta. Añade invite=true para enviarle una invitación sin contraseña compartida.');if(!process.env.NEXT_PUBLIC_APP_URL)throw Error('Configura NEXT_PUBLIC_APP_URL y las URLs autorizadas de Auth.');const r=await client.auth.admin.inviteUserByEmail(args.email,{redirectTo:`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/password`});if(r.error||!r.data.user)throw Error('No se pudo enviar la invitación. Revisa SMTP y los límites de Auth.');user=r.data.user;}
const r=await client.rpc('bootstrap_superadmin',{p_user:user.id,p_reason:args.reason});if(r.error)throw Error('No se pudo registrar el nombramiento. Comprueba que se aplicaron las migraciones de plataforma.');
console.log(`Nombramiento registrado para ${args.email}. Debe iniciar sesión y verificar MFA en /superadmin/mfa.`);
