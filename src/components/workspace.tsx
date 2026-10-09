'use client';
import { useCallback,useEffect,useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Temporal } from '@js-temporal/polyfill';
import { ComparisonReport } from './comparison-report';
import { useRouter } from 'next/navigation';
import { 
  Activity, ArrowDownLeft, ArrowUpRight, CalendarDays, ChartNoAxesCombined, 
  ChevronLeft, ChevronRight, CircleHelp, CreditCard, Download, GraduationCap, 
  LayoutDashboard, LogOut, Menu, Package, Plus, Receipt, Search, Settings, 
  ShoppingBag, Users, Wallet, X, RefreshCw, Check, Clock
} from 'lucide-react';
import type { AppContext } from '@/lib/context';
import { resources,modules,operations,labels,type Field } from '@/domains/catalog';
import { allowed,formatMoney } from '@/lib/money';
import { logout } from '@/app/auth/actions';
import { RecordForm } from './record-form';
import { ImportStudents } from './student-import';
import { SetupWizard } from './setup-wizard';
import { ServiceRecovery } from './service-recovery';
import { CalendarView } from './calendar-view';
import { StudentProfile } from './student-profile';

type Row = Record<string, unknown>;
type FormSpec = { title:string; fields:Field[]; endpoint:string; initial?:Row; description?:string };

const moduleIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  inicio: LayoutDashboard,
  estudiantes: Users,
  cobros: CreditCard,
  cajas: Wallet,
  ventas: ShoppingBag,
  inventario: Package,
  gastos: Receipt,
  calendario: CalendarDays,
  personal: GraduationCap,
  reportes: ChartNoAxesCombined,
  configuracion: Settings,
};

const navigationGroups = [
  {
    label: 'GENERAL',
    moduleIds: ['inicio']
  },
  {
    label: 'OPERACIÓN',
    moduleIds: ['estudiantes', 'cobros', 'calendario']
  },
  {
    label: 'FINANZAS',
    moduleIds: ['cajas', 'gastos', 'reportes']
  },
  {
    label: 'COMERCIO',
    moduleIds: ['ventas', 'inventario']
  },
  {
    label: 'ADMINISTRACIÓN',
    moduleIds: ['personal', 'configuracion']
  }
];

const moneyColumns = new Set([
  'net_sales','cost','margin','amount','balance','price','unit_price',
  'unit_cost','average_cost','expected','counted','difference','total',
  'earned','fixed_amount','hourly_rate','class_rate','opening_amount','fee'
]);

const statusLabels: Record<string, string> = {
  activo: 'Activo', pausado: 'Pausado', retirado: 'Retirado',
  pendiente: 'Pendiente', confirmado: 'Confirmado', aprobado: 'Aprobado',
  activa: 'Activa', congelada: 'Congelada', cancelada: 'Cancelada',
  programada: 'Programada', impartida: 'Impartida', reservada: 'Reservada',
  espera: 'En espera', revision: 'En revisión', aprobada: 'Aprobada',
  pagada: 'Pagada', confirmada: 'Confirmada', devuelta: 'Devuelta',
  parcial: 'Parcial', pagado: 'Pagado', anulado: 'Anulado',
  enviado: 'Enviado', recibido: 'Recibido'
};

export function Workspace({ context, moduleId, initialResource, studentId }: {
  context: AppContext;
  moduleId: string;
  initialResource?: string;
  studentId?: string;
}) {
  const router = useRouter();
  const section = modules.find(m => m.id === moduleId)!;
  const available = [
    ...(section.resources as readonly string[]),
    ...(studentId ? ['memberships', 'charges', 'payments', 'commitments', 'attendance'] : [])
  ].filter(key => allowed(context.permissions, `${resources[key].domain}.read`));

  const [tab, setTab] = useState(initialResource && available.includes(initialResource) ? initialResource : available[0] ?? '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormSpec | null>(null);
  const [mobile, setMobile] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [importing, setImporting] = useState(false);
  const [from, setFrom] = useState(() => Temporal.Now.plainDateISO(context.academy.timezone).with({ day: 1 }).toString());
  const [to, setTo] = useState(() => Temporal.Now.plainDateISO(context.academy.timezone).toString());

  const selected = resources[tab];
  const query = new URLSearchParams({
    academy: context.academy.id,
    branch: context.branch ?? 'all',
    page: String(page),
    search,
    ...(studentId ? { student: studentId } : {}),
    ...(status ? { status } : {}),
    ...(moduleId === 'reportes' ? { from, to } : {})
  });
  const queryString = query.toString();

  useEffect(() => {
    if (!tab) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      fetch(`/api/data/${tab}?${queryString}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          if (data.error) throw Error(data.error);
          setRows(data.rows);
          setCount(data.count);
          setLoading(false);
        })
        .catch(e => {
          if (e.name !== 'AbortError') {
            setError(e.message);
            setLoading(false);
          }
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tab, queryString, revision]);

  const refresh = useCallback(() => {
    setRevision(r => r + 1);
    setMessage('Operación guardada.');
    router.refresh();
  }, [router]);

  function openOperation(key: string, initial?: Row) {
    const op = operations[key];
    if (!context.branch && resources[op.resource]?.branch) {
      setError('Selecciona una sucursal para registrar esta operación.');
      return;
    }
    setForm({
      title: op.label,
      fields: op.fields,
      endpoint: `/api/operations/${key}`,
      description: op.description,
      initial: initial ?? (studentId ? { student_id: studentId } : {})
    });
  }

  function openCreate(row?: Row) {
    if (!selected) return;
    if (selected.branch && !context.branch) {
      setError('Selecciona una sucursal para crear o editar este registro.');
      return;
    }
    setForm({
      title: `${row ? 'Editar' : 'Nuevo registro'} · ${selected.title}`,
      fields: selected.fields,
      endpoint: `/api/data/${tab}`,
      initial: row
    });
  }

  function changeScope(key: string, value: string) {
    const params = new URLSearchParams({
      academy: context.academy.id,
      branch: context.branch ?? 'all',
      tab
    });
    params.set(key, value);
    router.push(`/panel/${moduleId}?${params}`);
  }

  const relatedOps = Object.entries(operations).filter(([, op]) =>
    available.includes(op.resource) && allowed(context.permissions, op.permission)
  );

  const link = (id: string, key?: string) =>
    `/panel/${id}?${new URLSearchParams({
      academy: context.academy.id,
      branch: context.branch ?? 'all',
      ...(key ? { tab: key } : {})
    })}`;

  function display(row: Row, key: string) {
    const value = row[key];
    if (value === null || value === undefined) return <span className="muted">—</span>;
    if (moneyColumns.has(key)) {
      return <span className="money">{formatMoney(value, context.academy.currency, context.academy.locale)}</span>;
    }
    if (key === 'status' || key === 'payment_status') {
      return (
        <span className={`badge ${String(value)}`}>
          <span className="status-dot" />
          {statusLabels[String(value)] ?? String(value)}
        </span>
      );
    }
    if (typeof value === 'boolean') {
      return value ? <span className="bool text-emerald-700"><Check size={14} />Sí</span> : <span className="muted">No</span>;
    }
    if (key.endsWith('_at')) {
      return new Intl.DateTimeFormat(context.academy.locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: context.academy.timezone
      }).format(new Date(String(value)));
    }
    if (key.endsWith('_on') || key === 'birth_date') {
      return String(value).slice(0, 10);
    }
    if (key.endsWith('_id')) {
      return String((row._labels as Row | undefined)?.[key] ?? value).slice(0, 70);
    }
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }

  return (
    <div className="app-shell" style={{ '--accent': context.academy.primary_color } as React.CSSProperties}>
      {mobile && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={() => setMobile(false)} />}
      
      {/* SIDEBAR TÁCTICO POR ÁREAS */}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <Link className="brand" href={link('inicio')}>
          <span className="brand-mark">
            {context.academy.logo_document_id ? (
              <Image unoptimized width={36} height={36} src={`/api/academy/logo?academy=${context.academy.id}`} alt="Logotipo" />
            ) : (
              context.academy.name[0]
            )}
          </span>
          <span className="brand-name">
            {context.academy.name}
            <small>ADMINISTRACIÓN</small>
          </span>
        </Link>
        <button className="icon-btn mobile-close" onClick={() => setMobile(false)} aria-label="Cerrar menú">
          <X size={20} />
        </button>

        <div className="sidebar-divider" />

        <nav aria-label="Menú principal">
          {navigationGroups.map(group => {
            const groupModules = group.moduleIds
              .map(id => modules.find(m => m.id === id)!)
              .filter(m => m && allowed(context.permissions, m.permission));

            if (groupModules.length === 0) return null;

            return (
              <div key={group.label} className="nav-group">
                <span className="nav-label">{group.label}</span>
                {groupModules.map(m => {
                  const Icon = moduleIcons[m.id] ?? LayoutDashboard;
                  const isCurrent = m.id === moduleId;
                  return (
                    <Link
                      key={m.id}
                      href={link(m.id)}
                      className={`nav-item ${isCurrent ? 'current' : ''}`}
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={() => setMobile(false)}
                    >
                      <Icon size={18} />
                      <span>{m.title}</span>
                      {isCurrent && <i />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="academy-chip">
            <span className="status-dot" />
            <span>{context.branch ? `Sucursal: ${context.branches.find(b => b.id === context.branch)?.name ?? 'Activa'}` : 'Todas las sucursales'}</span>
          </div>
          <a href="/manual" className="nav-item">
            <CircleHelp size={17} />
            <span>Guía de operación</span>
          </a>
          <div className="profile">
            <span className="avatar">{context.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{context.name}</strong>
              <small>{context.user.email}</small>
            </div>
            <form action={logout}>
              <button className="icon-btn" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-toggle" aria-label="Abrir menú" onClick={() => setMobile(true)}>
            <Menu size={20} />
          </button>
          
          <div className="breadcrumb">
            <span>Administración</span>
            <ChevronRight size={14} />
            <strong>{section.title}</strong>
          </div>

          <div className="scope-selects">
            {context.academies.length > 1 && (
              <select aria-label="Academia" value={context.academy.id} onChange={e => changeScope('academy', e.target.value)}>
                {context.academies.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <select aria-label="Sucursal" value={context.branch ?? 'all'} onChange={e => changeScope('branch', e.target.value)}>
              <option value="all">Todas las sucursales autorizadas</option>
              {context.branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <span className="top-avatar" title={context.name}>
              {context.name[0]}
            </span>
          </div>
        </header>

        <main className="workspace">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {new Intl.DateTimeFormat(context.academy.locale, {
                  dateStyle: 'long',
                  timeZone: context.academy.timezone
                }).format(new Date())}
              </span>
              <h1>{moduleId === 'inicio' ? `Hola, ${context.name.split(' ')[0]}` : section.title}</h1>
              <p>{section.subtitle}</p>
            </div>

            <div className="heading-actions">
              {moduleId === 'inicio' && allowed(context.permissions, 'billing.collect') && (
                <button className="btn primary" onClick={() => openOperation('payment')}>
                  <Plus size={18} />
                  <span>Registrar cobro</span>
                </button>
              )}
              {selected?.writable && allowed(context.permissions, selected.permission ?? `${selected.domain}.write`) && (
                <button className="btn primary" onClick={() => openCreate()}>
                  <Plus size={18} />
                  <span>Nuevo registro</span>
                </button>
              )}
              {relatedOps.length > 0 && (
                <select
                  className="action-select"
                  aria-label="Elegir acción"
                  value=""
                  onChange={e => e.target.value && openOperation(e.target.value)}
                >
                  <option value="">Realizar operación…</option>
                  {relatedOps.map(([key, op]) => (
                    <option key={key} value={key}>{op.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {message && (
            <div className="success dismissible" role="status">
              <span>{message}</span>
              <button className="icon-btn" onClick={() => setMessage('')} aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            </div>
          )}

          {context.branches.length === 0 && (
            <div className="notice">
              <strong>Configura tu primera sucursal.</strong> Continúa en Configuración, después agrega tu primera caja, medio de pago, plan y tarifa.
              <Link href={link('configuracion')}>
                Abrir configuración <ArrowUpRight size={15} />
              </Link>
            </div>
          )}

          <ServiceRecovery context={context} />

          {moduleId === 'inicio' ? (
            <Dashboard
              context={context}
              from={from}
              to={to}
              setFrom={setFrom}
              setTo={setTo}
              revision={revision}
              link={link}
              openOperation={openOperation}
            />
          ) : (
            <>
              {moduleId === 'configuracion' && (
                <div className="settings-banner">
                  <div>
                    <span className="eyebrow">IDENTIDAD Y REGLAS</span>
                    <h2>{context.academy.name}</h2>
                    <p>{context.academy.currency} · {context.academy.timezone} · {context.academy.country}</p>
                  </div>
                  {allowed(context.permissions, 'settings.write') && (
                    <button className="btn" onClick={() => openOperation('academy_settings', context.academy)}>
                      Editar academia
                    </button>
                  )}
                  {allowed(context.permissions, 'users.manage') && (
                    <InviteUser context={context} onSaved={refresh} />
                  )}
                </div>
              )}

              {moduleId === 'configuracion' && allowed(context.permissions, 'settings.write') && (
                <SetupWizard context={context} onSaved={refresh} />
              )}

              {moduleId === 'reportes' && (
                <div className="report-filters">
                  <label>
                    Desde
                    <input
                      aria-label="Desde"
                      type="date"
                      value={from}
                      onChange={e => { setFrom(e.target.value); setPage(0); }}
                    />
                  </label>
                  <label>
                    Hasta
                    <input
                      aria-label="Hasta"
                      type="date"
                      value={to}
                      onChange={e => { setTo(e.target.value); setPage(0); }}
                    />
                  </label>
                  <p>Exporta la fuente del reporte. Los saldos y la deuda se calculan con sus movimientos confirmados.</p>
                </div>
              )}

              {moduleId === 'reportes' && (
                <ComparisonReport context={context} from={from} to={to} />
              )}

              {moduleId === 'calendario' && (
                <CalendarView context={context} revision={revision} />
              )}

              {studentId && (
                <StudentProfile context={context} id={studentId} revision={revision} />
              )}

              {/* SECCIONES Y PESTAÑAS */}
              <div className="tabs" role="tablist" aria-label="Secciones">
                {available.map(key => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={tab === key ? 'selected' : ''}
                    onClick={() => {
                      setTab(key);
                      setPage(0);
                      setSearch('');
                      setStatus('');
                      const url = new URL(window.location.href);
                      url.searchParams.set('tab', key);
                      window.history.replaceState(null, '', url);
                    }}
                  >
                    {resources[key].title}
                  </button>
                ))}
              </div>

              {studentId && (
                <div className="notice">
                  <span>Expediente del estudiante: esta vista está filtrada por estudiante.</span>
                  <Link href={link('estudiantes')}>Ver todos los estudiantes</Link>
                </div>
              )}

              {/* TABLA PRINCIPAL DE DATOS */}
              <section className="card data-card">
                <div className="table-toolbar">
                  <div>
                    <h2>{selected?.title}</h2>
                    <span className="muted">{loading ? 'Cargando registros…' : `${count} registros encontrados`}</span>
                  </div>
                  <div className="table-tools">
                    {selected?.search && (
                      <div className="searchbox">
                        <Search size={16} />
                        <input
                          aria-label="Buscar registros"
                          placeholder="Buscar…"
                          value={search}
                          onChange={e => { setSearch(e.target.value); setPage(0); }}
                        />
                      </div>
                    )}
                    {['students','payments','memberships','expenses','classes','reservations','settlements','stock_transfers'].includes(tab) && (
                      <select
                        aria-label="Filtrar por estado"
                        value={status}
                        onChange={e => { setStatus(e.target.value); setPage(0); }}
                      >
                        <option value="">Todos los estados</option>
                        {(tab === 'students' ? ['activo','pausado','retirado'] :
                          tab === 'payments' ? ['pendiente','confirmado'] :
                          tab === 'memberships' ? ['activa','congelada','cancelada'] :
                          tab === 'expenses' ? ['pendiente','aprobado'] :
                          tab === 'classes' ? ['programada','impartida','cancelada'] :
                          tab === 'reservations' ? ['reservada','espera','cancelada','ausente'] :
                          tab === 'settlements' ? ['revision','aprobada','pagada'] :
                          ['enviado','recibido']).map(v => (
                            <option key={v} value={v}>{statusLabels[v] ?? v}</option>
                        ))}
                      </select>
                    )}
                    {tab === 'students' && allowed(context.permissions, 'students.write') && (
                      <button className="btn small" onClick={() => setImporting(true)}>
                        Importar CSV
                      </button>
                    )}
                    <a className="btn small" href={`/api/data/${tab}?${queryString}&export=csv`}>
                      <Download size={15} />
                      <span>CSV</span>
                    </a>
                    <button className="icon-btn" aria-label="Actualizar registros" onClick={() => setRevision(r => r + 1)}>
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="error" role="alert">{error}</div>
                ) : loading ? (
                  <div className="loading-list" aria-busy="true">
                    <div className="skeleton" />
                    <div className="skeleton" />
                    <div className="skeleton" />
                  </div>
                ) : rows.length === 0 ? (
                  <div className="empty-state">
                    <Activity size={32} />
                    <h3>{search ? 'No encontramos coincidencias' : 'Todo comienza con el primer registro'}</h3>
                    <p>
                      {search
                        ? 'Prueba otro término de búsqueda o limpia los filtros activos.'
                        : selected?.writable
                        ? 'Agrega un nuevo registro para comenzar a administrar esta sección.'
                        : 'Utiliza «Realizar operación» para registrar el primer movimiento.'}
                    </p>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {selected?.columns.map(key => (
                            <th key={key}>{labels[key] ?? key}</th>
                          ))}
                          <th><span className="sr-only">Acciones</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(row => (
                          <tr key={String(row.id)}>
                            {selected?.columns.map((key, index) => (
                              <td key={key} className={index === 0 ? 'first-cell' : ''}>
                                {key === 'name' && tab === 'students' ? (
                                  <Link
                                    href={`/panel/estudiantes?${new URLSearchParams({
                                      academy: context.academy.id,
                                      branch: context.branch ?? 'all',
                                      student: String(row.id),
                                      tab: 'memberships'
                                    })}`}
                                    className="student-link"
                                  >
                                    <span className="mini-avatar">
                                      {String(row.name).split(' ').map(v => v[0]).slice(0, 2).join('')}
                                    </span>
                                    <span>{display(row, key)}</span>
                                  </Link>
                                ) : (
                                  display(row, key)
                                )}
                              </td>
                            ))}
                            <td>
                              <div className="flex items-center gap-1.5 justify-end">
                                {selected?.writable && allowed(context.permissions, selected.permission ?? `${selected.domain}.write`) && (
                                  <button className="btn small" onClick={() => openCreate(row)}>
                                    Editar
                                  </button>
                                )}
                                {tab === 'payments' && (
                                  <Link className="btn small" href={`/recibo/${row.id}?academy=${context.academy.id}`} target="_blank">
                                    Recibo
                                  </Link>
                                )}
                                {tab === 'documents' && (
                                  <a className="btn small" href={`/api/documents/${row.id}?academy=${context.academy.id}`} target="_blank" rel="noreferrer">
                                    Abrir
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="table-footer">
                  <span>
                    {count ? `${page * 50 + 1}–${Math.min((page + 1) * 50, count)} de ${count} registros` : 'Sin registros'}
                  </span>
                  <div>
                    <button
                      className="icon-btn"
                      aria-label="Página anterior"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>Página {page + 1}</span>
                    <button
                      className="icon-btn"
                      aria-label="Página siguiente"
                      disabled={(page + 1) * 50 >= count}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </section>

              {tab === 'documents' && allowed(context.permissions, 'documents.write') && (
                <UploadDocument context={context} studentId={studentId} onSaved={refresh} />
              )}
            </>
          )}

          <footer className="workspace-footer">
            <span>{context.academy.name} · Administración operativa</span>
            <span>Moneda {context.academy.currency} · {context.academy.timezone}</span>
          </footer>
        </main>
      </div>

      {form && (
        <RecordForm
          key={form.endpoint + String(form.initial?.id ?? '')}
          {...form}
          context={context}
          onClose={() => setForm(null)}
          onSaved={refresh}
        />
      )}
      {importing && (
        <ImportStudents
          context={context}
          onClose={() => setImporting(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function Dashboard({
  context, from, to, setFrom, setTo, revision, link, openOperation
}: {
  context: AppContext;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  revision: number;
  link: (id: string, tab?: string) => string;
  openOperation: (key: string) => void;
}) {
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const params = new URLSearchParams({
    academy: context.academy.id,
    branch: context.branch ?? 'all',
    from,
    to
  }).toString();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/dashboard?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw Error(d.error);
        setData(d);
        setError('');
      })
      .catch(e => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => controller.abort();
  }, [params, revision]);

  const days = ((data?.daily ?? []) as { day: string; received: number; spent: number }[])
    .filter(d => Number(d.received) !== 0 || Number(d.spent) !== 0);
  const max = Math.max(1, ...days.flatMap(day => [Number(day.received), Number(day.spent)]));

  const cards = [
    { key: 'received', label: 'Cobros recibidos', permission: 'billing.read', target: 'cobros', tab: 'payments', icon: ArrowDownLeft, detail: 'Dinero confirmado en el período' },
    { key: 'pending', label: 'Cuentas por cobrar', permission: 'billing.read', target: 'cobros', tab: 'charges', icon: Clock, detail: 'Saldo pendiente total' },
    { key: 'expenses_paid', label: 'Gastos pagados', permission: 'expenses.read', target: 'gastos', tab: 'expense_payments', icon: ArrowUpRight, detail: 'Salidas del período' },
    { key: 'balance', label: 'Disponible en cuentas', permission: 'treasury.read', target: 'cajas', tab: 'accounts', icon: Wallet, detail: 'Saldo derivado de movimientos' },
    { key: 'charged', label: 'Cargos emitidos', permission: 'billing.read', target: 'cobros', tab: 'charges', icon: Receipt, detail: 'Importes originales emitidos en el período' },
    { key: 'sales', label: 'Venta neta de productos', permission: 'sales.read', target: 'reportes', tab: 'sales_report', icon: ShoppingBag, detail: 'Venta menos devoluciones y descuentos' },
    { key: 'margin', label: 'Margen de productos', permission: 'sales.read', target: 'reportes', tab: 'sales_report', icon: ChartNoAxesCombined, detail: 'Venta neta menos costo histórico' },
    { key: 'operating_result', label: 'Resultado operativo', permission: 'reports.read', target: 'reportes', tab: 'account_movements', icon: Activity, detail: 'Devengo de servicios + margen − gastos' }
  ];

  return (
    <>
      <div className="period-bar">
        <span className="section-label">PANORAMA FINANCIERO Y OPERATIVO</span>
        <div>
          <label className="sr-only" htmlFor="from">Desde</label>
          <input id="from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <span>—</span>
          <label className="sr-only" htmlFor="to">Hasta</label>
          <input id="to" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      <div className="metrics-grid">
        {cards.filter(card => allowed(context.permissions, card.permission)).map(card => (
          <Link key={card.key} className="metric" href={link(card.target, card.tab)}>
            <div className="metric-top">
              <span>{card.label}</span>
              <span className="metric-icon">
                <card.icon size={19} />
              </span>
            </div>
            <strong>
              {data ? formatMoney(data[card.key], context.academy.currency, context.academy.locale) : '…'}
            </strong>
            <div className="metric-bottom">
              <small>{card.detail}</small>
              <ChevronRight size={15} />
            </div>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="card cashflow">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MOVIMIENTOS CONFIRMADOS</span>
              <h2>Flujo de dinero</h2>
            </div>
            <div className="chart-legend">
              <span><i />Cobros recibidos</span>
              <span><i />Salidas de dinero</span>
            </div>
          </div>

          {days.length ? (
            <div className="chart">
              <div className="chart-grid">
                {[1, 0.75, 0.5, 0.25, 0].map(f => (
                  <div key={f}>
                    <span>{formatMoney(max * f, context.academy.currency, context.academy.locale)}</span>
                    <i />
                  </div>
                ))}
              </div>
              <div className="chart-bars">
                {days.map(day => (
                  <div
                    className="bar-group"
                    key={day.day}
                    title={`${day.day}: cobros ${day.received}, salidas ${day.spent}`}
                  >
                    <div>
                      <i style={{ height: `${(Number(day.received) / max) * 100}%` }} />
                      <i style={{ height: `${(Number(day.spent) / max) * 100}%` }} />
                    </div>
                    <small>{day.day.slice(8)}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="chart-empty">
              <ChartNoAxesCombined size={32} />
              <p>No hay movimientos registrados en este período.</p>
              <small>Los cobros y las salidas confirmadas aparecerán aquí.</small>
            </div>
          )}
          <div className="chart-note">
            Las transferencias internas y los aportes de capital se consultan por separado en Cajas y cuentas.
          </div>
        </section>

        <section className="card quick-actions">
          <span className="eyebrow">EL TRABAJO DE HOY</span>
          <h2>Accesos rápidos</h2>
          {[
            { action: 'payment', label: 'Cobrar a un estudiante', text: 'Pago, deuda y recibo inmediato', icon: CreditCard },
            { action: 'attendance', label: 'Registrar asistencia', text: 'Clases, tatami y membresías', icon: Check },
            { action: 'sale', label: 'Nueva venta de producto', text: 'Caja e inventario automático', icon: ShoppingBag },
            { action: 'expense', label: 'Registrar un gasto', text: 'Obligación y aprobación', icon: Receipt }
          ]
            .filter(a => allowed(context.permissions, operations[a.action].permission))
            .map(action => (
              <button key={action.action} onClick={() => openOperation(action.action)}>
                <span className="quick-icon">
                  <action.icon size={18} />
                </span>
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.text}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
        </section>
      </div>

      {allowed(context.permissions, 'billing.read') && (
        <section className="card concepts-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DESGLOSE</span>
              <h2>Cobros por concepto</h2>
            </div>
          </div>
          <p>Distribución de pagos confirmados del período. Los saldos a favor pendientes de aplicar se conservan en cuenta.</p>
          <div className="concepts-list">
            {((data?.concepts ?? []) as { concept: string; amount: number }[]).map(item => (
              <Link key={item.concept} href={link('cobros', 'payments')}>
                <span>{item.concept}</span>
                <strong>{formatMoney(item.amount, context.academy.currency, context.academy.locale)}</strong>
              </Link>
            ))}
            {data && ((data.concepts as unknown[])?.length === 0) && (
              <span className="muted">Sin cobros confirmados en este período.</span>
            )}
          </div>
        </section>
      )}

      <div className="dashboard-bottom">
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ALUMNOS</span>
              <h2>Tu comunidad</h2>
            </div>
            <Users size={20} className="text-muted" />
          </div>
          <div className="community-stats">
            {[
              { key: 'active_students', label: 'Activos' },
              { key: 'new_students', label: 'Nuevos en período' },
              { key: 'paused_students', label: 'Pausados' },
              { key: 'retired_students', label: 'Retirados' }
            ].map(item => (
              <Link key={item.key} href={link('estudiantes')}>
                <strong>{String(data?.[item.key] ?? '…')}</strong>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ALERTAS OPERATIVAS</span>
              <h2>Requieren atención</h2>
            </div>
            <Activity size={20} className="text-muted" />
          </div>
          <div className="attention-list">
            {[
              { key: 'overdue', label: 'Deuda vencida', module: 'cobros', tab: 'charges', permission: 'billing.read', money: true },
              { key: 'expiring', label: 'Membresías por vencer', module: 'cobros', tab: 'memberships', permission: 'billing.read' },
              { key: 'low_stock', label: 'Productos con existencia baja', module: 'inventario', tab: 'stock', permission: 'inventory.read' },
              { key: 'approvals', label: 'Obligaciones por aprobar', module: 'gastos', tab: 'expenses', permission: 'expenses.read' },
              { key: 'differences', label: 'Diferencias de caja', module: 'cajas', tab: 'cash_sessions', permission: 'treasury.read' },
              { key: 'classes_today', label: 'Clases del día', module: 'calendario', tab: 'classes', permission: 'classes.read' }
            ]
              .filter(item => allowed(context.permissions, item.permission))
              .map(item => (
                <Link key={item.key} href={link(item.module, item.tab)}>
                  <span>{item.label}</span>
                  <strong>
                    {data ? (item.money ? formatMoney(data[item.key], context.academy.currency, context.academy.locale) : String(data[item.key])) : '…'}
                  </strong>
                  <ChevronRight size={15} />
                </Link>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}

function InviteUser({ context, onSaved }: { context: AppContext; onSaved: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const response = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ academy: context.academy.id, branch: context.branch, email, name })
    });
    const data = await response.json();
    setMessage(data.error ?? 'Invitación enviada. Asigna los roles del usuario para activar su acceso.');
    setPending(false);
    if (!data.error) {
      setEmail('');
      setName('');
      onSaved();
    }
  }

  return (
    <details className="invite">
      <summary>Invitar usuario interno</summary>
      <form onSubmit={invite}>
        <label>
          Nombre
          <input required value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          Correo electrónico
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <button className="btn primary" disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar invitación'}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}

function UploadDocument({ context, studentId, onSaved }: { context: AppContext; studentId?: string; onSaved: () => void }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = new FormData(form);
    body.set('academy', context.academy.id);
    body.set('branch', context.branch ?? 'all');
    if (studentId) body.set('student_id', studentId);
    setPending(true);
    try {
      const response = await fetch('/api/documents', { method: 'POST', body });
      const data = await response.json();
      if (data.error) throw Error(data.error);
      setMessage('Documento guardado.');
      form.reset();
      onSaved();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card upload-card">
      <div className="section-heading">
        <h2>Agregar documento privado</h2>
      </div>
      <form onSubmit={upload}>
        <label>
          Título
          <input name="title" required />
        </label>
        <label>
          Archivo (PDF, JPG o PNG; hasta 4 MB)
          <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required />
        </label>
        <button className="btn primary" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar documento'}
        </button>
        {message && <span role="status">{message}</span>}
      </form>
    </section>
  );
}
