import { AuthForm } from '@/components/auth-form';
import Link from 'next/link';
import { createSupabase } from '@/lib/supabase/server';
export default async function Password(){const client=await createSupabase();const {data:{user}}=await client.auth.getUser();return <main className="standalone"><div className="card auth-box"><span className="eyebrow">ACCESO</span><h1>Define tu contraseña</h1>{user?<><p>Cuenta: <strong>{user.email}</strong>. Usa al menos 12 caracteres.</p><AuthForm mode="password"/></>:<><p role="alert">El enlace no está disponible o ha vencido.</p><Link href="/auth/recover" className="btn primary">Solicitar nuevo enlace</Link></>}</div></main>;}
