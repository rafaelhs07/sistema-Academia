import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
const supplied=Object.fromEntries(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
const args={...(supplied.config?JSON.parse(await readFile(supplied.config,'utf8')):{}),...supplied};
for (const k of ['email','name','country','currency','timezone']) if (!args[k]) throw Error(`Falta ${k}=valor. No se deducen país, moneda ni precios.`);
if (!process.env.SUPABASE_SECRET_KEY) throw Error('Falta SUPABASE_SECRET_KEY (solo servidor).');
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let owner;
for(let page=1;page<=100;page++){const {data,error}=await client.auth.admin.listUsers({page,perPage:100});if(error)throw error;owner=data.users.find(u=>u.email?.toLowerCase()===args.email.toLowerCase());if(owner||data.users.length<100)break;}
if(owner){const existing=await client.from('internal_members').select('academy_id').eq('user_id',owner.id);if(existing.error)throw existing.error;if(existing.data?.length){console.log('El propietario ya tiene una academia. No se crea otra por reintento.');process.exit(0);}}
if(!owner){const {data,error}=await client.auth.admin.inviteUserByEmail(args.email,{redirectTo:`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/password`});if(error)throw error;owner=data.user;}
const result=await client.rpc('bootstrap_academy',{p_owner:owner.id,p_name:args.name,p_country:args.country,p_currency:args.currency,p_timezone:args.timezone});
if(result.error) throw result.error;
console.log(`Academia creada: ${result.data}. El propietario recibe un enlace para definir su contraseña.`);
