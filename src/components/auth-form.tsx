'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { login, recover, setPassword, type AuthState } from '@/app/auth/actions';
import { ArrowRight, LoaderCircle, Mail, Lock, KeyRound } from 'lucide-react';

export function AuthForm({ mode = 'login' }: { mode?: 'login' | 'recover' | 'password' }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === 'login' ? login : mode === 'recover' ? recover : setPassword,
    {}
  );

  return (
    <form action={action} className="auth-form">
      {mode !== 'password' && (
        <label>
          <span className="flex items-center gap-1.5">
            <Mail size={13} className="text-slate-500" />
            <span>Correo electrónico</span>
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@academia.com"
            required
          />
        </label>
      )}

      {mode !== 'recover' && (
        <label>
          <span className="flex items-center gap-1.5">
            <Lock size={13} className="text-slate-500" />
            <span>{mode === 'password' ? 'Nueva contraseña' : 'Contraseña'}</span>
          </span>
          <input
            name="password"
            type="password"
            autoComplete={mode === 'password' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'password' ? 12 : 1}
            placeholder="••••••••••••"
          />
        </label>
      )}

      {mode === 'password' && (
        <label>
          <span className="flex items-center gap-1.5">
            <KeyRound size={13} className="text-slate-500" />
            <span>Repite la contraseña</span>
          </span>
          <input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            placeholder="••••••••••••"
          />
        </label>
      )}

      {state.error && <div className="error" role="alert">{state.error}</div>}
      {state.message && <div className="success" role="status">{state.message}</div>}

      <button className="btn primary" disabled={pending}>
        {pending ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
        <span>
          {mode === 'login'
            ? 'Entrar a la academia'
            : mode === 'recover'
            ? 'Enviar enlace'
            : 'Guardar contraseña'}
        </span>
      </button>

      {mode === 'login' ? (
        <Link href="/auth/recover" className="text-link">
          ¿Olvidaste tu contraseña?
        </Link>
      ) : (
        <Link href="/login" className="text-link">
          Volver al inicio de sesión
        </Link>
      )}
    </form>
  );
}
