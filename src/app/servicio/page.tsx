import { createSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { logout } from '@/app/auth/actions';
import { accessNames } from '@/domains/platform';
import type { ServiceStatus } from '@/lib/context';
import { formatMoney } from '@/lib/money';
export const dynamic='force-dynamic';
export default async function Service({searchParams}:{searchParams:Promise<{academy?:string}>}){
 const client=await createSupabase();const {data:{user}}=await client.auth.getUser();if(!user)redirect('/login');
 const members=await client.from('internal_members').select('academy_id,name').eq('user_id',user.id).eq('active',true);if(members.error||!members.data?.length)redirect('/access');
 const academy=(await searchParams).academy??members.data[0].academy_id;const response=await client.rpc('academy_service',{p_academy:z.uuid().parse(academy)});if(response.error)throw Error('No se pudo consultar el servicio.');const service=response.data as ServiceStatus;
 return <main className="receipt-page"><span className="eyebrow">ESTADO DEL SERVICIO</span><h1>{service.operational?'Tu servicio está disponible':'El acceso está suspendido'}</h1><div className="notice">{accessNames[service.access]??service.access}</div><p>{service.message}</p>{service.owner&&<><h2>Suscripción a la plataforma</h2><div className="platform-money">{service.balances?.map(b=><div key={b.currency}><small>Saldo pendiente</small><strong>{formatMoney(b.balance,b.currency)}</strong></div>)}</div><h3>Instrucciones de pago</h3><p style={{whiteSpace:'pre-wrap'}}>{service.instructions||'Solicita las instrucciones al administrador de la plataforma.'}</p><p>Contacto: {service.contact||'Pendiente de configurar por la plataforma.'}</p><h3>Cargos</h3><div className="table-scroll"><table><thead><tr><th>Concepto</th><th>Vencimiento</th><th>Saldo</th></tr></thead><tbody>{service.charges?.map(c=><tr key={String(c.id)}><td>{String(c.description)}</td><td>{String(c.due_on)}</td><td>{formatMoney(c.balance,String(c.currency))}</td></tr>)}</tbody></table></div><h3>Pagos registrados</h3>{service.payments?.map(p=><p key={String(p.id)}>#{String(p.receipt_number)} · {formatMoney(p.amount,String(p.currency))} · {String(p.status)}</p>)}</>}{service.operational&&<Link className="btn primary" href={`/panel/inicio?academy=${academy}`}>Entrar a la academia</Link>}{members.data.length>1&&<details><summary>Mis otros negocios</summary>{members.data.map(m=><p key={m.academy_id}><Link href={`/panel/inicio?academy=${m.academy_id}`}>{m.name} · {m.academy_id.slice(0,8)}</Link></p>)}</details>}<form action={logout}><button className="btn">Cerrar sesión</button></form></main>;
}
