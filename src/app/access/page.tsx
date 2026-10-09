import { logout } from '@/app/auth/actions';
import { ShieldAlert, LogOut, MailQuestion } from 'lucide-react';

export default function Access() {
  return (
    <main className="standalone">
      <div className="card auth-box text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-5">
          <ShieldAlert size={28} />
        </div>
        
        <span className="eyebrow text-amber-800">ACCESO RESTRINGIDO</span>
        <h1 className="text-2xl font-bold mb-2">Tu cuenta necesita activación</h1>
        <p className="text-slate-600 text-sm mb-6">
          Tu usuario no tiene asignado un rol operativo activo en esta academia. Contacta al propietario o administrador para que active tus permisos o sucursales.
        </p>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left mb-6 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <MailQuestion size={15} />
            <span>¿Qué debes hacer ahora?</span>
          </div>
          <p className="text-slate-600 mb-0">
            1. Pide al administrador que ingrese a <strong>Configuración &gt; Usuarios internos</strong>.
          </p>
          <p className="text-slate-600 mb-0">
            2. Debe verificar que tengas un rol asignado y al menos una sucursal habilitada.
          </p>
        </div>

        <form action={logout}>
          <button className="btn primary w-full justify-center">
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </main>
  );
}
