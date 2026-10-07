import { logout } from '@/app/auth/actions';
export default function Access(){return <main className="standalone"><div className="card auth-box"><h1>Tu acceso necesita activación</h1><p>Tu cuenta no tiene una membresía interna activa. Solicita al propietario que revise tus roles y sucursales.</p><form action={logout}><button className="btn primary">Cerrar sesión</button></form></div></main>;}
