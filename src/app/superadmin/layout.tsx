import Link from 'next/link';
import { redirect } from 'next/navigation';
import { platformContext, PlatformAccessError } from '@/lib/platform';
import { logout } from '@/app/auth/actions';
import { 
  Building2, CreditCard, Layers, Sliders, History, 
  LayoutDashboard, ShieldAlert, ShieldCheck, LogOut, Globe2 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({
  children
}: {
  children: React.ReactNode;
}) {
  let identity;
  try {
    identity = await platformContext(false);
  } catch (error) {
    if (error instanceof PlatformAccessError && error.status === 401) {
      redirect('/login');
    }
    return (
      <main className="standalone">
        <div className="card text-center p-8 max-w-lg">
          <div className="mx-auto w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-4">
            <ShieldAlert size={26} />
          </div>
          <span className="eyebrow text-rose-800">SEGURIDAD CENTRAL</span>
          <h1 className="text-2xl font-bold mb-2">Acceso de plataforma restringido</h1>
          <p className="text-slate-600 text-sm mb-6">
            Esta sección requiere un nombramiento de Superadministrador realizado por el operador autorizado de la plataforma.
          </p>
          <Link className="btn primary" href="/panel/inicio">
            Volver a mi academia
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="platform-shell">
      {/* SIDEBAR SUPERADMIN CON IDENTIDAD PROPIA */}
      <aside className="platform-nav">
        <Link href="/superadmin" className="platform-brand">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
            <Globe2 size={20} />
          </div>
          <span>
            Plataforma
            <small>SUPERADMINISTRADOR</small>
          </span>
        </Link>

        <nav aria-label="Administración de plataforma">
          <Link href="/superadmin">
            <LayoutDashboard size={17} />
            <span>Panorama</span>
          </Link>
          <Link href="/superadmin/negocios">
            <Building2 size={17} />
            <span>Negocios</span>
          </Link>
          <Link href="/superadmin/planes">
            <Layers size={17} />
            <span>Planes comerciales</span>
          </Link>
          <Link href="/superadmin/cobros">
            <CreditCard size={17} />
            <span>Cargos y pagos</span>
          </Link>
          <Link href="/superadmin/ajustes">
            <Sliders size={17} />
            <span>Configuración</span>
          </Link>
          <Link href="/superadmin/historial">
            <History size={17} />
            <span>Historial</span>
          </Link>
        </nav>

        <div className="platform-user">
          <small>{identity.user.email}</small>
          <form action={logout}>
            <button className="btn small">
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ÁREA CENTRAL SUPERADMIN */}
      <div className="platform-main">
        <header className="platform-top">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Control comercial central</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500">Gestión de suscripciones y multi-inquilino</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {identity.mfaRequired ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                <ShieldAlert size={14} />
                <span>MFA: Verificación pendiente</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                <ShieldCheck size={14} />
                <span>Superadministrador · MFA verificado</span>
              </span>
            )}
          </div>
        </header>

        <main className="platform-content">
          {children}
        </main>
      </div>
    </div>
  );
}
