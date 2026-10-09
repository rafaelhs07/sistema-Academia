import { notFound, redirect } from 'next/navigation';
import { getContext, requirePermission, BusinessServiceError } from '@/lib/context';
import { uuid } from '@/lib/validation';
import { formatMoney } from '@/lib/money';
import { PrintButton } from '@/components/print-button';
import Decimal from 'decimal.js';
import { Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Receipt({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ academy?: string }>;
}) {
  let ctx;
  try {
    ctx = await getContext((await searchParams).academy);
    requirePermission(ctx.context, 'billing.read');
  } catch (error) {
    if (error instanceof BusinessServiceError) {
      redirect(`/servicio?academy=${error.academyId}`);
    }
    redirect('/login');
  }

  const { client, context } = ctx;
  const { id } = await params;
  const payment = await client
    .from('payments')
    .select('*')
    .eq('id', uuid.parse(id))
    .eq('academy_id', context.academy.id)
    .single();

  if (payment.error || !payment.data) notFound();

  const p = payment.data;
  const [applications, student, method, branch] = await Promise.all([
    client.from('payment_applications').select('amount,charge_id').eq('payment_id', p.id),
    p.student_id ? client.from('students').select('name').eq('id', p.student_id).single() : Promise.resolve({ data: null }),
    client.from('payment_methods').select('name').eq('id', p.method_id).single(),
    client.from('branches').select('name').eq('id', p.branch_id).single()
  ]);

  if (applications.error || method.error || branch.error) {
    throw Error('No se pudo cargar el recibo.');
  }

  const chargeIds = (applications.data ?? []).map(line => line.charge_id);
  const charges = chargeIds.length
    ? await client.from('charges').select('id,description,student_id').in('id', chargeIds)
    : { data: [], error: null };

  if (charges.error) throw Error('No se pudieron cargar los conceptos.');

  const studentIds = [...new Set((charges.data ?? []).map(c => c.student_id).filter(Boolean))];
  const students = studentIds.length
    ? await client.from('students').select('id,name').in('id', studentIds)
    : { data: [], error: null };

  const lines = (applications.data ?? []).map(line => {
    const c = charges.data?.find(c => c.id === line.charge_id);
    return {
      amount: line.amount,
      description: c?.description ?? 'Concepto fuera del acceso actual',
      name: students.data?.find(s => s.id === c?.student_id)?.name ?? 'Cliente externo'
    };
  });

  const unallocated = new Decimal(p.amount)
    .minus(lines.reduce((s, line) => s.plus(line.amount), new Decimal(0)))
    .toFixed(2);

  const isConfirmed = p.status === 'confirmado';

  return (
    <main className="receipt-page">
      <header className="receipt-header">
        <div>
          <span className="eyebrow">COMPROBANTE DE PAGO</span>
          <h1 className="receipt-title">{context.academy.name}</h1>
          <p className="text-muted text-xs leading-relaxed">
            {context.academy.contact && <span>{context.academy.contact}<br /></span>}
            <span className="font-semibold text-slate-700">Sucursal: {branch.data?.name}</span>
          </p>
        </div>
        <div className="text-right">
          <strong className="text-lg font-bold block text-slate-900">
            Recibo #{p.receipt_prefix}{p.receipt_number}
          </strong>
          <p className="text-xs text-muted mt-1">
            {new Intl.DateTimeFormat(context.academy.locale, {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: context.academy.timezone
            }).format(new Date(p.created_at))}
          </p>
          <div className={`badge ${isConfirmed ? 'activo' : 'pendiente'} mt-2`}>
            <span className="status-dot" />
            <span>{isConfirmed ? 'Confirmado' : 'Pendiente de verificación'}</span>
          </div>
        </div>
      </header>

      <div className="receipt-meta">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted block">Recibido de:</span>
            <strong className="text-sm text-slate-900">{student.data?.name ?? 'Responsable o cliente externo'}</strong>
          </div>
          <div>
            <span className="text-muted block">Medio de pago:</span>
            <strong className="text-sm text-slate-900">{method.data?.name}</strong>
          </div>
          {p.reference && (
            <div className="md:col-span-2">
              <span className="text-muted block">Referencia bancaria / autorización:</span>
              <span className="font-mono text-slate-800">{p.reference}</span>
            </div>
          )}
        </div>

        {p.status === 'pendiente' && (
          <div className="notice mt-3 mb-0">
            <Clock size={15} className="shrink-0" />
            <span>Este pago aún no salda la deuda. El dinero requiere confirmación bancaria por parte de administración.</span>
          </div>
        )}
      </div>

      <div className="table-scroll my-4 border border-slate-200 rounded-lg">
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Estudiante</th>
              <th className="text-right">Aplicado</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td className="font-medium">{line.description}</td>
                <td>{line.name}</td>
                <td className="money text-right font-semibold">
                  {formatMoney(line.amount, context.academy.currency, context.academy.locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 my-4 space-y-2">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Importe Total:</span>
          <span className="receipt-total my-0 text-emerald-800">
            Total: {formatMoney(p.amount, context.academy.currency, context.academy.locale)}
          </span>
        </div>

        {Number(p.tendered) > Number(p.amount) && (
          <div className="flex justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
            <span>Efectivo entregado: {formatMoney(p.tendered, context.academy.currency, context.academy.locale)}</span>
            <strong className="text-blue-700">
              Cambio: {formatMoney(new Decimal(p.tendered).minus(p.amount).toFixed(2), context.academy.currency, context.academy.locale)}
            </strong>
          </div>
        )}

        {Number(unallocated) > 0 && (
          <div className="flex justify-between text-xs text-amber-700 pt-2 border-t border-slate-200">
            <span>Saldo a favor remanente (sin aplicar a cargos):</span>
            <strong className="money font-semibold">
              {formatMoney(unallocated, context.academy.currency, context.academy.locale)}
            </strong>
          </div>
        )}
      </div>

      <footer className="receipt-footer">
        <p className="font-medium text-slate-700">
          {context.academy.receipt_footer ?? 'Conserva este comprobante para tu control.'}
        </p>
        <small className="block text-slate-400">
          Comprobante administrativo emitido conforme a las políticas de la academia. Los reembolsos y modificaciones posteriores se consultan en el historial operativo.
        </small>
        <div className="no-print mt-4">
          <PrintButton />
        </div>
      </footer>
    </main>
  );
}
