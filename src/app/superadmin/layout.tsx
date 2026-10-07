import Link from 'next/link';
import { redirect } from 'next/navigation';
import { platformContext,PlatformAccessError } from '@/lib/platform';
import { logout } from '@/app/auth/actions';
export const dynamic='force-dynamic';
export default async function PlatformLayout({children}:{children:React.ReactNode}){
 let identity;try{identity=await platformContext(false);}catch(error){if(error instanceof PlatformAccessError&&error.status===401)redirect('/login');return <main className="standalone"><div className="card"><h1>Acceso de plataforma restringido</h1><p>Esta sección requiere un nombramiento de Superadministrador realizado por el operador autorizado.</p><Link className="btn" href="/panel/inicio">Volver a mi academia</Link></div></main>;}
 return <div className="platform-shell"><aside className="platform-nav"><Link href="/superadmin" className="platform-brand">A<span>Academia<small>ADMINISTRACIÓN DE PLATAFORMA</small></span></Link><nav aria-label="Administración de plataforma"><Link href="/superadmin">Panorama</Link><Link href="/superadmin/negocios">Negocios</Link><Link href="/superadmin/planes">Planes comerciales</Link><Link href="/superadmin/cobros">Cargos y pagos</Link><Link href="/superadmin/ajustes">Configuración</Link><Link href="/superadmin/historial">Historial</Link></nav><div className="platform-user"><small>{identity.user.email}</small><form action={logout}><button className="btn small">Cerrar sesión</button></form></div></aside><div className="platform-main"><header className="platform-top"><span>Control comercial</span><span>Superadministrador · {identity.mfaRequired?'Verificación pendiente':'MFA verificado'}</span></header><main className="platform-content">{children}</main></div></div>;
}
