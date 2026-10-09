'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { LoaderCircle, Plus, Trash2, X, AlertCircle, Info, Calculator } from 'lucide-react';
import type { Field } from '@/domains/catalog';
import type { AppContext } from '@/lib/context';
import { formatMoney } from '@/lib/money';

type Row = Record<string, unknown>;

export function rowLabel(row: Row): string {
  const refs = (row._labels ?? {}) as Row;
  if (row.receipt_number) return `Recibo #${row.receipt_number} · ${row.amount} · ${row.status}`;
  if (row.description) return `${row.description}${row.balance !== undefined ? ` (Saldo: ${row.balance})` : ''}`;
  if (row.name) return `${row.name}${row.code ? ` · ${row.code}` : ''}`;
  if (row.plan_id) return `${refs.plan_id ?? 'Tarifa'} · ${row.price} · Vigente: ${row.effective_on}`;
  if (row.student_id && row.ends_on) return `${refs.student_id ?? 'Membresía'} · ${row.status} · Hasta ${row.ends_on}`;
  if (row.account_id && row.opened_at) return `${refs.account_id ?? 'Caja'} · ${String(row.opened_at).slice(0, 16)} · ${row.closed_at ? 'Cerrada' : 'Abierta'}`;
  if (row.variant_id) return `${refs.variant_id ?? 'Variante'} · ${row.quantity ?? ''} unid.${row.received !== undefined ? ` · Recibidas: ${row.received}` : ''}`;
  if (row.employee_id) return `${refs.employee_id ?? 'Personal'} · ${row.kind ?? row.status ?? ''} · ${row.earned ?? row.total ?? ''}`;
  if (row.body) return String(row.body).slice(0, 60);
  return String(row.id ?? 'Registro').slice(0, 12);
}

function Lookup({ field, value, onChange, context }: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  context: AppContext;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const valueKey = ['user_id', 'linked_user_id'].includes(field.key) ? 'user_id' : 'id';

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const query = new URLSearchParams({
        academy: context.academy.id,
        ...(context.branch ? { branch: context.branch } : {}),
        search
      });
      const ids = (Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []).join(',');
      const selectedQuery = new URLSearchParams(query);
      selectedQuery.delete('search');
      selectedQuery.set('ids', ids);
      selectedQuery.set('by', valueKey);

      Promise.all([
        fetch(`/api/data/${field.relation}?${query}`, { signal: controller.signal }).then(r => r.json()),
        ids ? fetch(`/api/data/${field.relation}?${selectedQuery}`, { signal: controller.signal }).then(r => r.json()) : Promise.resolve({ rows: [] })
      ])
        .then(([data, selected]) => {
          if (data.error || selected.error) {
            setError(data.error ?? selected.error);
            setLoading(false);
            return;
          }
          setError('');
          const all = [...selected.rows, ...data.rows] as Row[];
          setRows(all.filter((row, index) => all.findIndex(other => other[valueKey] === row[valueKey]) === index));
          setLoading(false);
        })
        .catch(e => {
          if (e.name !== 'AbortError') {
            setError('No se pudo cargar la lista.');
            setLoading(false);
          }
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [field.relation, context.academy.id, context.branch, search, value, valueKey]);

  return (
    <div className="lookup">
      <input
        aria-label={`Buscar ${field.label.toLowerCase()}`}
        placeholder="Escribe para buscar en la lista…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {field.type === 'multi' ? (
        <div className="check-list">
          {rows.map(row => (
            <label key={String(row.id)}>
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(row[valueKey])}
                onChange={e =>
                  onChange(
                    e.target.checked
                      ? [...(Array.isArray(value) ? value : []), row[valueKey]]
                      : (Array.isArray(value) ? value : []).filter(v => v !== row[valueKey])
                  )
                }
              />
              <span>{rowLabel(row)}</span>
            </label>
          ))}
        </div>
      ) : (
        <select
          aria-label={field.label}
          required={!field.optional}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Selecciona {field.optional ? '(opcional)' : 'una opción'}</option>
          {rows.map(row => (
            <option key={String(row[valueKey])} value={String(row[valueKey])}>
              {rowLabel(row)}
            </option>
          ))}
        </select>
      )}
      {error && <small role="alert" className="field-error">{error}</small>}
      <small className="text-muted">
        {loading ? 'Buscando opciones…' : 'Si no encuentras el registro, puedes crearlo en su sección.'}
      </small>
    </div>
  );
}

function Fields({ fields, values, change, context, prefix = '' }: {
  fields: Field[];
  values: Row;
  change: (key: string, value: unknown) => void;
  context: AppContext;
  prefix?: string;
}) {
  return (
    <>
      {fields.map(field => {
        const value = values[field.key];
        const id = `${prefix}${field.key}`;

        if (field.type === 'lines') {
          const lines = (Array.isArray(value) ? value : []) as Row[];
          return (
            <fieldset className="line-fields" key={id}>
              <legend>
                {field.label} {field.optional ? '(opcional)' : ''}
              </legend>
              {lines.map((line, index) => (
                <div className="line-row" key={index}>
                  <div className="form-grid">
                    <Fields
                      fields={field.fields ?? []}
                      values={line}
                      change={(key, val) =>
                        change(
                          field.key,
                          lines.map((row, i) => (i === index ? { ...row, [key]: val } : row))
                        )
                      }
                      context={context}
                      prefix={`${id}-${index}-`}
                    />
                  </div>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label={`Quitar línea ${index + 1}`}
                    title="Quitar esta línea"
                    onClick={() => change(field.key, lines.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn small"
                onClick={() => change(field.key, [...lines, initialValues(field.fields ?? [], context, {})])}
              >
                <Plus size={15} />
                <span>Agregar línea</span>
              </button>
            </fieldset>
          );
        }

        if (field.type === 'relation' || (field.type === 'multi' && field.relation)) {
          return (
            <div className="form-field" key={id}>
              <span className="field-label">
                {field.label} {field.optional ? <span className="optional">(opcional)</span> : ''}
              </span>
              <Lookup
                field={field}
                value={value}
                onChange={val => change(field.key, val)}
                context={context}
              />
            </div>
          );
        }

        if (field.type === 'multi') {
          return (
            <fieldset className="line-fields" key={id}>
              <legend>{field.label}</legend>
              <div className="check-list">
                {field.options?.map(option => (
                  <label key={option}>
                    <input
                      type="checkbox"
                      checked={Array.isArray(value) && value.includes(option)}
                      onChange={e =>
                        change(
                          field.key,
                          e.target.checked
                            ? [...(Array.isArray(value) ? value : []), option]
                            : (Array.isArray(value) ? value : []).filter(v => v !== option)
                        )
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }

        if (field.type === 'boolean') {
          return (
            <label className="checkbox-field" key={id}>
              <input
                id={id}
                type="checkbox"
                checked={Boolean(value)}
                onChange={e => change(field.key, e.target.checked)}
              />
              <span>{field.label}</span>
            </label>
          );
        }

        return (
          <label className={`form-field ${field.type === 'textarea' ? 'full' : ''}`} key={id} htmlFor={id}>
            <span>
              {field.label}
              {field.optional && <span className="optional" aria-hidden="true"> · opcional</span>}
            </span>
            {field.type === 'textarea' ? (
              <textarea
                aria-label={field.label}
                id={id}
                required={!field.optional}
                value={String(value ?? '')}
                onChange={e => change(field.key, e.target.value)}
                rows={3}
              />
            ) : field.type === 'select' ? (
              <select
                aria-label={field.label}
                id={id}
                required={!field.optional}
                value={String(value ?? '')}
                onChange={e => change(field.key, e.target.value)}
              >
                <option value="">Selecciona una opción</option>
                {field.options?.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : (
              <input
                aria-label={field.label}
                id={id}
                type={field.type}
                required={!field.optional}
                step={field.step}
                min={field.min}
                maxLength={field.type === 'number' ? undefined : 5000}
                value={String(value ?? '')}
                onChange={e => change(field.key, e.target.value)}
              />
            )}
          </label>
        );
      })}
    </>
  );
}

function initialValues(fields: Field[], context: AppContext, initial: Row): Row {
  const today = Temporal.Now.plainDateISO(context.academy.timezone).toString();
  return Object.fromEntries(
    fields.map(field => {
      let value = initial[field.key];
      if (value !== undefined && value !== null && field.type === 'datetime-local') {
        try {
          value = Temporal.Instant.from(String(value))
            .toZonedDateTimeISO(context.academy.timezone)
            .toPlainDateTime()
            .toString()
            .slice(0, 16);
        } catch {
          value = String(value).slice(0, 16);
        }
      }
      if (value === null || value === undefined) {
        value =
          field.default ??
          (field.type === 'boolean'
            ? false
            : field.type === 'date' && !field.optional
            ? today
            : field.type === 'select'
            ? field.options?.[0] ?? ''
            : field.type === 'lines' || field.type === 'multi'
            ? []
            : '');
      }
      return [field.key, value];
    })
  );
}

export function RecordForm({
  title,
  fields,
  context,
  endpoint,
  initial = {},
  description,
  onClose,
  onSaved
}: {
  title: string;
  fields: Field[];
  context: AppContext;
  endpoint: string;
  initial?: Row;
  description?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Row>(() => initialValues(fields, context, initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef({ key: crypto.randomUUID(), payload: '' });

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  // Cálculos dinámicos en vivo para pagos y arqueos
  const paymentBreakdown = useMemo(() => {
    const amountNum = Number(values.amount) || 0;
    const tenderedNum = Number(values.tendered) || 0;
    const applications = Array.isArray(values.applications) ? (values.applications as Row[]) : [];
    const appliedTotal = applications.reduce((sum, app) => sum + (Number(app.amount) || 0), 0);
    const unallocated = Math.max(0, amountNum - appliedTotal);
    const change = tenderedNum > amountNum ? tenderedNum - amountNum : 0;

    return {
      hasPaymentData: Boolean(values.amount !== undefined),
      amount: amountNum,
      tendered: tenderedNum,
      appliedTotal,
      unallocated,
      change
    };
  }, [values.amount, values.tendered, values.applications]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');

    const payload = JSON.stringify(values);
    if (retry.current.payload && retry.current.payload !== payload) {
      retry.current.key = crypto.randomUUID();
    }
    retry.current.payload = payload;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academy: context.academy.id,
          branch: context.branch ?? 'all',
          data: values,
          key: retry.current.key,
          id: initial.id
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw Error(data.error ?? 'No se pudo guardar.');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la operación.');
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={e => {
        if (pending) e.preventDefault();
        else onClose();
      }}
      className="form-dialog"
    >
      <div className="dialog-top">
        <div>
          <span className="eyebrow">{context.academy.name}</span>
          <h2>{title}</h2>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Cerrar formulario"
          onClick={onClose}
          disabled={pending}
        >
          <X size={20} />
        </button>
      </div>

      {description && (
        <div className="notice mx-6 mt-4 mb-2">
          <Info size={16} className="shrink-0" />
          <span>{description}</span>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="form-grid">
          <Fields
            fields={fields}
            values={values}
            change={(key, val) => setValues(v => ({ ...v, [key]: val }))}
            context={context}
          />
        </div>

        {/* Resumen explicativo en vivo para cobros */}
        {paymentBreakdown.hasPaymentData && paymentBreakdown.amount > 0 && (
          <div className="mx-7 my-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-2">
              <Calculator size={15} />
              <span>Resumen previo a la confirmación:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Importe a cobrar:</span>
              <strong className="font-semibold">{formatMoney(paymentBreakdown.amount, context.academy.currency, context.academy.locale)}</strong>
            </div>
            {paymentBreakdown.appliedTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Cargos cubiertos:</span>
                <strong>{formatMoney(paymentBreakdown.appliedTotal, context.academy.currency, context.academy.locale)}</strong>
              </div>
            )}
            {paymentBreakdown.unallocated > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Saldo restante (a favor del estudiante):</span>
                <strong>{formatMoney(paymentBreakdown.unallocated, context.academy.currency, context.academy.locale)}</strong>
              </div>
            )}
            {paymentBreakdown.change > 0 && (
              <div className="flex justify-between text-blue-700 font-semibold pt-1 border-t border-slate-200">
                <span>Cambio en efectivo a entregar:</span>
                <strong>{formatMoney(paymentBreakdown.change, context.academy.currency, context.academy.locale)}</strong>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error" role="alert">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="dialog-footer">
          <small>
            Moneda: {context.academy.currency} · Zona: {context.academy.timezone}
          </small>
          <button type="button" className="btn" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button className="btn primary" disabled={pending}>
            {pending ? (
              <>
                <LoaderCircle className="spin" size={16} />
                <span>Guardando…</span>
              </>
            ) : (
              <span>Confirmar</span>
            )}
          </button>
        </div>
      </form>
    </dialog>
  );
}
