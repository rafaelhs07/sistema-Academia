'use client';
import { useState } from 'react';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import type { AppContext } from '@/lib/context';
import { resources, operations } from '@/domains/catalog';
import { RecordForm } from './record-form';

const steps = [
  { title: 'Identidad de la academia', action: 'academy_settings', desc: 'Nombre, moneda operativa, horario y datos de contacto' },
  { title: 'Primera sucursal', resource: 'branches', desc: 'Sede principal o sucursal donde se imparten las clases' },
  { title: 'Primera caja o cuenta', resource: 'accounts', desc: 'Caja chica, recepción o cuenta bancaria receptora' },
  { title: 'Medio de pago', resource: 'payment_methods', desc: 'Efectivo, transferencia bancaria, tarjetas de débito/crédito' },
  { title: 'Primer plan', resource: 'plans', desc: 'Modalidad de servicio (ilimitado, clases por semana, paquete)' },
  { title: 'Primera tarifa', action: 'plan_version', desc: 'Precio vigente y periodicidad de cobro del plan' }
];

export function SetupWizard({
  context,
  onSaved
}: {
  context: AppContext;
  onSaved: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);

  const step = steps[index];
  const spec = step?.action
    ? operations[step.action]
    : step?.resource
    ? resources[step.resource]
    : undefined;

  return (
    <section className="card setup-wizard mb-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="eyebrow flex items-center gap-1.5 text-emerald-800">
            <Sparkles size={13} />
            <span>PUESTA EN MARCHA RÁPIDA</span>
          </span>
          <h2>Asistente de configuración operativa</h2>
          <p className="text-muted text-xs">
            Configura las reglas básicas de tu negocio paso a paso. Puedes modificar cualquier ajuste más adelante.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-full text-slate-700">
          Paso {Math.min(index + 1, steps.length)} de {steps.length}
        </span>
      </div>

      <div className="wizard-steps my-4">
        {steps.map((s, i) => {
          const isDone = i < index;
          const isCurrent = i === index;
          return (
            <button
              key={s.title}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                isCurrent
                  ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-semibold shadow-xs'
                  : isDone
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : 'border-slate-200 text-slate-400 opacity-70'
              }`}
              onClick={() => setIndex(i)}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isDone ? <Check size={12} /> : i + 1}
              </span>
              <span>{s.title}</span>
            </button>
          );
        })}
      </div>

      {step ? (
        <div className="wizard-action p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
          <div>
            <strong className="text-sm font-semibold text-slate-900 block">{step.title}</strong>
            <small className="text-slate-500 text-xs block">{step.desc}</small>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn primary small"
              disabled={index > 1 && !context.branch}
              onClick={() => setEditing(true)}
            >
              <span>Configurar ahora</span>
              <ChevronRight size={15} />
            </button>
            <button className="btn small" onClick={() => setIndex(i => i + 1)}>
              Omitir / Ya configurado
            </button>
          </div>
        </div>
      ) : (
        <div className="success">
          <Check size={16} className="text-emerald-700" />
          <span>¡Todos los pasos iniciales han sido recorridos! Tu academia está lista para recibir registros.</span>
        </div>
      )}

      {editing && spec && step && (
        <RecordForm
          title={step.title}
          fields={spec.fields}
          context={context}
          endpoint={step.action ? `/api/operations/${step.action}` : `/api/data/${step.resource}`}
          initial={index === 0 ? context.academy : {}}
          onClose={() => setEditing(false)}
          onSaved={() => {
            onSaved();
            setIndex(i => i + 1);
          }}
        />
      )}
    </section>
  );
}
