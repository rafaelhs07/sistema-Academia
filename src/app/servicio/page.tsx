import { createSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { logout } from '@/app/auth/actions';
import { accessNames } from '@/domains/platform';
import type { ServiceStatus } from '@/lib/context';
import { formatMoney } from '@/lib/money';
import { CheckCircle2, AlertOctagon, ArrowRight, Building, LogOut, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Service({
  searchParams
}: {
  searchParams: Promise<{ academy?: string }>;
}) {
  const client = await createSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');

  const members = await client
    .from('internal_members')
    .select('academy_id,name')
    .eq('user_id', user.id)
    .eq('active', true);

  if (members.error || !members.data?.length) redirect('/access');

  const academy = (await searchParams).academy ?? members.data[0].academy_id;
  const response = await client.rpc('academy_service', {
    p_academy: z.uuid().parse(academy)
  });

  if (response.error) throw Error('No se pudo consultar el servicio.');
  const service = response.data as ServiceStatus;

  const isSuspended = !service.operational;

  return (
    <main className="receipt-page">
      <header className="mb-6 flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isSuspended
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {isSuspended ? <AlertOctagon size={26} /> : <CheckCircle2 size={26} />}
        </div>
        <div>
          <span className="eyebrow text-slate-500">ESTADO DEL SERVICIO DE PLATAFORMA</span>
          <h1 className="text-2xl font-bold mb-1">
            {service.operational ? 'Tu servicio está disponible' : 'El acceso está suspendido'}
          </h1>
          <div className={`badge ${isSuspended ? 'retirado' : 'activo'} mt-1`}>
            <span className="status-dot" />
            <span>{accessNames[service.access] ?? service.access}</span>
          </div>
        </div>
      </header>

      <div className={`p-4 rounded-xl text-sm mb-6 ${isSuspended ? 'bg-rose-50/70 border border-rose-200 text-rose-900' : 'bg-slate-50 border border-slate-200 text-slate-800'}`}>
        <p className="mb-0 leading-relaxed">{service.message}</p>
      </div>

      {service.owner && (
        <section className="mt-8 pt-6 border-t border-slate-200">
          <span className="eyebrow">INFORMACIÓN COMERCIAL PARA EL PROPIETARIO</span>
          <h2 className="text-lg font-bold mb-4">Suscripción a la plataforma</h2>

          <div className="platform-money mb-6">
            {service.balances?.map(b => (
              <div key={b.currency} className="card p-4">
                <small className="text-slate-500 block mb-1">Saldo pendiente por regularizar</small>
                <strong className="text-xl font-bold text-slate-900">
                  {formatMoney(b.balance, b.currency)}
                </strong>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Info size={16} className="text-blue-600" />
              <span>Instrucciones para reactivación de cuenta</span>
            </h3>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mb-3">
              {service.instructions || 'Solicita las instrucciones al administrador de la plataforma.'}
            </p>
            <div className="text-xs text-slate-500 border-t border-slate-200 pt-2">
              Contacto de plataforma: <strong className="text-slate-800">{service.contact || 'Pendiente de configurar por la plataforma.'}</strong>
            </div>
          </div>

          {service.charges && service.charges.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Cargos emitidos</h3>
              <div className="table-scroll border border-slate-200 rounded-lg">
                <table>
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Vencimiento</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {service.charges.map(c => (
                      <tr key={String(c.id)}>
                        <td className="font-medium">{String(c.description)}</td>
                        <td>{String(c.due_on)}</td>
                        <td className="money font-semibold text-rose-700">
                          {formatMoney(c.balance, String(c.currency))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {service.payments && service.payments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Pagos registrados recientemente</h3>
              <div className="space-y-1.5">
                {service.payments.map(p => (
                  <div key={String(p.id)} className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                    <span>Recibo #{String(p.receipt_number)} · Estado: <strong className="capitalize">{String(p.status)}</strong></span>
                    <strong className="money">{formatMoney(p.amount, String(p.currency))}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex items-center gap-3 mt-8 pt-4 border-t border-slate-200">
        {service.operational && (
          <Link className="btn primary" href={`/panel/inicio?academy=${academy}`}>
            <span>Entrar a la academia</span>
            <ArrowRight size={16} />
          </Link>
        )}

        {members.data.length > 1 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-600 font-medium hover:text-slate-900">
              Mis otros negocios vinculados ({members.data.length})
            </summary>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mt-2 space-y-2">
              {members.data.map(m => (
                <div key={m.academy_id}>
                  <Link
                    href={`/panel/inicio?academy=${m.academy_id}`}
                    className="text-emerald-700 font-medium hover:underline flex items-center gap-1.5"
                  >
                    <Building size={13} />
                    <span>{m.name}</span>
                    <small className="text-slate-400">({m.academy_id.slice(0, 8)})</small>
                  </Link>
                </div>
              ))}
            </div>
          </details>
        )}

        <form action={logout} className="ml-auto">
          <button className="btn">
            <LogOut size={15} />
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </main>
  );
}
