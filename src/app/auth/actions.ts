'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabase } from '@/lib/supabase/server';
import { safeError } from '@/lib/validation';
export type AuthState={error?:string;message?:string};
export async function login(_state:AuthState,form:FormData):Promise<AuthState>{
 try{const email=z.email().parse(form.get('email'));const password=z.string().min(1).max(128).parse(form.get('password'));const client=await createSupabase();const {error}=await client.auth.signInWithPassword({email,password});if(error)return {error:'No pudimos iniciar sesión. Comprueba tu correo y contraseña.'};}catch(error){return {error:safeError(error)};}redirect('/panel/inicio');
}
export async function recover(_state:AuthState,form:FormData):Promise<AuthState>{
 try{const email=z.email().parse(form.get('email'));const appUrl=z.url().parse(process.env.NEXT_PUBLIC_APP_URL);const client=await createSupabase();await client.auth.resetPasswordForEmail(email,{redirectTo:`${appUrl}/auth/callback?next=/auth/password`});return {message:'Si existe una cuenta para este correo, recibirás un enlace para cambiar tu contraseña.'};}catch(error){return {error:safeError(error)};}
}
export async function setPassword(_state:AuthState,form:FormData):Promise<AuthState>{
 try{const password=z.string().min(12,'Usa al menos 12 caracteres.').max(128).parse(form.get('password'));if(password!==form.get('confirmation'))return {error:'Las contraseñas no coinciden.'};const client=await createSupabase();const {data:{user}}=await client.auth.getUser();if(!user)return {error:'El enlace ha vencido. Solicita uno nuevo.'};const {error}=await client.auth.updateUser({password});if(error)throw Error(error.message);}catch(error){return {error:safeError(error)};}redirect('/panel/inicio');
}
export async function logout(){const client=await createSupabase();await client.auth.signOut();redirect('/login');}
