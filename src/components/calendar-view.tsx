'use client';
import { useEffect, useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { ChevronLeft, ChevronRight, Clock, Users, User, AlertTriangle } from 'lucide-react';
import type { AppContext } from '@/lib/context';

type ClassRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: string;
  level: string | null;
  age_group: string | null;
  _labels?: Record<string, string>;
};

export function CalendarView({
  context,
  revision
}: {
  context: AppContext;
  revision: number;
}) {
  const [mode, setMode] = useState('semana');
  const [anchor, setAnchor] = useState(() =>
    Temporal.Now.plainDateISO(context.academy.timezone).toString()
  );
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const date = Temporal.PlainDate.from(anchor);
  const first =
    mode === 'mes'
      ? date.with({ day: 1 })
      : mode === 'semana'
      ? date.subtract({ days: date.dayOfWeek - 1 })
      : date;
  const days = mode === 'mes' ? date.daysInMonth : mode === 'semana' ? 7 : 1;
  const start = first.toString();
  const end = first.add({ days: days - 1 }).toString();

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      academy: context.academy.id,
      branch: context.branch ?? 'all',
      from: start,
      to: end
    });

    async function load() {
      setLoading(true);
      const all: ClassRow[] = [];
      for (let page = 0; page < 200; page++) {
        query.set('page', String(page));
        const res = await fetch(`/api/data/classes?${query}`, { signal: controller.signal });
        const result = await res.json();
        if (result.error) throw Error(result.error);
        all.push(...result.rows);
        if (all.length >= result.count) break;
        if (page === 199) {
          throw Error('Más de 10 000 clases en el rango. Reduce el período o consulta la lista paginada.');
        }
      }
      setRows(all);
      setError('');
      setLoading(false);
    }

    load().catch(e => {
      if (e.name !== 'AbortError') {
        setError(e.message);
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [context.academy.id, context.branch, start, end, revision]);

  const move = (direction: number) =>
    setAnchor(date.add(mode === 'mes' ? { months: direction } : { days: direction * days }).toString());

  return (
    <section className="card calendar-card">
      <div className="calendar-toolbar">
        <div>
          <button className="icon-btn" aria-label="Período anterior" onClick={() => move(-1)}>
            <ChevronLeft size={18} />
          </button>
          <strong>
            {new Intl.DateTimeFormat(context.academy.locale, {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC'
            }).format(new Date(`${anchor}T12:00:00Z`))}
          </strong>
          <button className="icon-btn" aria-label="Período siguiente" onClick={() => move(1)}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-muted">Cargando…</span>}
          <button
            className="btn small"
            onClick={() => setAnchor(Temporal.Now.plainDateISO(context.academy.timezone).toString())}
          >
            Hoy
          </button>
          <select
            aria-label="Vista de calendario"
            value={mode}
            onChange={e => setMode(e.target.value)}
          >
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </div>
      </div>

      {error && <div className="notice mx-4 my-2">{error}</div>}

      <div className={`calendar-grid ${mode}`}>
        {Array.from({ length: days }, (_, index) => {
          const day = first.add({ days: index }).toString();
          const matches = rows.filter(
            row =>
              Temporal.Instant.from(row.starts_at)
                .toZonedDateTimeISO(context.academy.timezone)
                .toPlainDate()
                .toString() === day
          );

          const isToday =
            day === Temporal.Now.plainDateISO(context.academy.timezone).toString();

          return (
            <div className={`calendar-day ${isToday ? 'bg-emerald-50/20' : ''}`} key={day}>
              <div className="day-title">
                <span className={isToday ? 'text-emerald-700 font-bold' : ''}>
                  {new Intl.DateTimeFormat(context.academy.locale, {
                    weekday: 'short',
                    timeZone: 'UTC'
                  }).format(new Date(`${day}T12:00:00Z`))}
                </span>
                <strong className={isToday ? 'text-emerald-700' : ''}>{day.slice(8)}</strong>
              </div>

              {matches.length === 0 && mode === 'dia' && (
                <div className="text-xs text-muted py-6 text-center">
                  No hay clases programadas para este día.
                </div>
              )}

              {matches.map(row => {
                const isCancelled = row.status === 'cancelada';
                return (
                  <div
                    className={`class-event ${row.status} relative group`}
                    key={row.id}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="shrink-0" />
                        {new Intl.DateTimeFormat(context.academy.locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: context.academy.timezone
                        }).format(new Date(row.starts_at))}
                      </span>
                      <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5">
                        {row.status}
                      </span>
                    </div>

                    <strong className="text-xs mt-0.5 block truncate">
                      {row.name}
                    </strong>

                    <div className="text-[11px] text-muted flex flex-col gap-0.5 mt-1">
                      <span className="flex items-center gap-1 truncate">
                        <User size={11} className="shrink-0" />
                        {row._labels?.substitute_id ?? row._labels?.instructor_id ?? 'Instructor'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} className="shrink-0" />
                        {row.capacity} cupos
                        {(row.level || row.age_group) && (
                          <span className="truncate">· {[row.level, row.age_group].filter(Boolean).join(' · ')}</span>
                        )}
                      </span>
                    </div>

                    {isCancelled && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-700 font-medium mt-1">
                        <AlertTriangle size={11} />
                        <span>Clase cancelada</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
