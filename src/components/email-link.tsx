'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { readEmailSession } from '@/lib/email-session';

async function completeSession(){
 const fragment=window.location.hash;
 // Remove credentials from this history entry before creating any Auth client.
 window.history.replaceState(null,'','/auth/complete');
 const session=readEmailSession(fragment);
 const client=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  isSingleton:false,auth:{detectSessionInUrl:false,autoRefreshToken:false},
 });
 const {data,error}=await client.auth.setSession(session);
 if(error||!data.user||!data.session)throw Error('El enlace no está disponible.');
}

export function EmailLinkCompletion(){
 const pending=useRef<Promise<void>|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  let active=true;
  // Reuse the exchange across React Strict Mode's effect replay.
  pending.current??=completeSession();
  pending.current.then(()=>{if(active)window.location.replace('/auth/password');},()=>{if(active)setFailed(true);});
  return()=>{active=false;};
 },[]);
 return failed?<><div className="error" role="alert">El enlace no está disponible o ha vencido. Solicita uno nuevo para definir tu contraseña.</div><Link href="/auth/recover" className="btn primary">Solicitar nuevo enlace</Link></>:<p role="status">Validando tu enlace de acceso…</p>;
}

export function EmailLinkForward(){
 useEffect(()=>{
  const params=new URLSearchParams(window.location.hash.slice(1));
  // Recover returns that reached /login with the previous callback version.
  if(params.has('access_token')||params.has('error')||params.has('error_code'))window.location.replace('/auth/complete'+window.location.hash);
 },[]);
 return null;
}
