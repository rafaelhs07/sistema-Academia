'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { login,recover,setPassword,type AuthState } from '@/app/auth/actions';
import { ArrowRight,LoaderCircle } from 'lucide-react';
export function AuthForm({mode='login'}:{mode?:'login'|'recover'|'password'}){
 const [state,action,pending]=useActionState<AuthState,FormData>(mode==='login'?login:mode==='recover'?recover:setPassword,{});
 return <form action={action} className="auth-form">
  {mode!=='password'&&<label>Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="nombre@academia.com" required/></label>}
  {mode!=='recover'&&<label>{mode==='password'?'Nueva contraseña':'Contraseña'}<input name="password" type="password" autoComplete={mode==='password'?'new-password':'current-password'} required minLength={mode==='password'?12:1}/></label>}
  {mode==='password'&&<label>Repite la contraseña<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required/></label>}
  {state.error&&<div className="error" role="alert">{state.error}</div>}{state.message&&<div className="success" role="status">{state.message}</div>}
  <button className="btn primary" disabled={pending}>{pending?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>} {mode==='login'?'Entrar a la academia':mode==='recover'?'Enviar enlace':'Guardar contraseña'}</button>
  {mode==='login'?<Link href="/auth/recover" className="text-link">Olvidé mi contraseña</Link>:<Link href="/login" className="text-link">Volver al inicio de sesión</Link>}
 </form>;
}
