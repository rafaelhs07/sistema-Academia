'use client';
import { useEffect,useState } from 'react';
import type { AppContext } from '@/lib/context';
import { formatMoney,allowed } from '@/lib/money';
type Row={branch:string;current:Record<string,unknown>;previous:Record<string,unknown>};
export function ComparisonReport({context,from,to}:{context:AppContext;from:string;to:string}){
 const [data,setData]=useState<{rows:Row[];previousFrom:string;previousTo:string}|null>(null),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();const q=new URLSearchParams({academy:context.academy.id,branch:context.branch??'all',from,to});fetch(`/api/comparisons?${q}`,{signal:controller.signal}).then(r=>r.json()).then(d=>{if(d.error)throw Error(d.error);setData(d);setError('');}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[context.academy.id,context.branch,from,to]);
 const metrics=[['received','Cobros','billing.read'],['charged','Cargos emitidos','billing.read'],['expenses_paid','Gastos pagados','expenses.read'],['sales','Venta neta','sales.read'],['margin','Margen','sales.read'],['operating_result','Resultado operativo','reports.read']].filter(([, ,p])=>allowed(context.permissions,p));
 return <section className="card comparison-card"><h2>Comparación de períodos y sucursales</h2><p>Actual: {from} a {to}. {data&&`Anterior: ${data.previousFrom} a ${data.previousTo}.`} Cada celda muestra actual / anterior.</p>{error&&<div role="alert" className="error">{error}</div>}{data?<div className="table-scroll"><table><thead><tr><th>Sucursal</th>{metrics.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{data.rows.map(row=><tr key={row.branch}><th>{row.branch}</th>{metrics.map(([key])=><td key={key}>{formatMoney(row.current[key],context.academy.currency,context.academy.locale)}<br/><span className="muted">{formatMoney(row.previous[key],context.academy.currency,context.academy.locale)}</span></td>)}</tr>)}</tbody></table></div>:<p>Cargando comparación…</p>}</section>;
}
