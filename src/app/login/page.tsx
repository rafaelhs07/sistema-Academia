import { AuthForm } from '@/components/auth-form';
import { EmailLinkForward } from '@/components/email-link';
import { configured } from '@/lib/supabase/server';
import { ShieldCheck, Dumbbell, Flame } from 'lucide-react';

export default function Login() {
  return (
    <main className="login-page">
      <EmailLinkForward />
      
      {/* SECCIÓN ARTÍSTICA Y DISCIPLINA DEPORTIVA */}
      <section className="login-art">
        <div className="brand">
          <span className="brand-mark">
            <Flame size={20} className="text-emerald-400" />
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">ACADEMIA OS</span>
            <span className="text-[10px] tracking-widest text-emerald-300 font-semibold uppercase">Gestión deportiva</span>
          </div>
        </div>

        <div>
          <span className="eyebrow">
            <Dumbbell size={14} className="text-emerald-400" />
            <span>PLATAFORMA OPERATIVA PARA ARTES MARCIALES</span>
          </span>
          <h1>Disciplina en el tatami.<br />Precisión en tu negocio.</h1>
          <p>
            Control total de estudiantes, membresías, cobros en recepción y asistencia en una sola plataforma diseñada para la constancia del entrenamiento.
          </p>

          <div className="belt-line" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="login-footer flex items-center justify-between text-xs text-emerald-200/80">
          <span>Control para crecer · Orden para avanzar</span>
          <span>v1.0 Producción</span>
        </div>
      </section>

      {/* CONTENIDO DEL FORMULARIO */}
      <section className="login-content">
        <div className="login-box">
          <span className="eyebrow text-emerald-800">ACCESO SEGURO</span>
          <h2>Entra a tu academia</h2>
          <p>Utiliza las credenciales autorizadas por el administrador.</p>

          {configured() ? (
            <AuthForm />
          ) : (
            <div className="error" role="alert">
              La conexión a la base de datos aún no está configurada. Verifica las variables de entorno en el servidor.
            </div>
          )}

          <div className="security-note">
            <ShieldCheck size={16} className="text-emerald-700" />
            <span>Acceso cifrado y restringido a personal autorizado</span>
          </div>
        </div>
      </section>
    </main>
  );
}
