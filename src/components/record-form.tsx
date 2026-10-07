'use client';
import { useEffect,useRef,useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { LoaderCircle,Plus,Trash2,X } from 'lucide-react';
import type { Field } from '@/domains/catalog';
import type { AppContext } from '@/lib/context';
type Row=Record<string,unknown>;
export function rowLabel(row:Row):string{
 const refs=(row._labels??{}) as Row;
 if(row.receipt_number)return `Recibo ${row.receipt_number} · ${row.amount} · ${row.status}`;
 if(row.description)return `${row.description}${row.balance!==undefined?` · saldo ${row.balance}`:''}`;
 if(row.name)return `${row.name}${row.code?` · ${row.code}`:''}`;
 if(row.plan_id)return `${refs.plan_id??'Tarifa'} · ${row.price} · ${row.effective_on}`;
 if(row.student_id&&row.ends_on)return `${refs.student_id??'Membresía'} · ${row.status} · ${row.ends_on}`;
 if(row.account_id&&row.opened_at)return `${refs.account_id??'Caja'} · ${String(row.opened_at).slice(0,16)} · ${row.closed_at?'cerrada':'abierta'}`;
 if(row.variant_id)return `${refs.variant_id??'Variante'} · ${row.quantity??''} unidades${row.received!==undefined?` · recibidas ${row.received}`:''}`;
 if(row.employee_id)return `${refs.employee_id??'Personal'} · ${row.kind??row.status??''} · ${row.earned??row.total??''}`;
 if(row.body)return String(row.body).slice(0,60);
 return String(row.id??'Registro').slice(0,12);
}
function Lookup({field,value,onChange,context}:{field:Field;value:unknown;onChange:(value:unknown)=>void;context:AppContext}){
 const [rows,setRows]=useState<Row[]>([]),[search,setSearch]=useState(''),[error,setError]=useState('');
 const valueKey=['user_id','linked_user_id'].includes(field.key)?'user_id':'id';
 useEffect(()=>{
  const controller=new AbortController();const timer=setTimeout(()=>{
   const query=new URLSearchParams({academy:context.academy.id,...(context.branch?{branch:context.branch}:{}),search});
   const ids=(Array.isArray(value)?value:typeof value==='string'&&value?[value]:[]).join(',');const selectedQuery=new URLSearchParams(query);selectedQuery.delete('search');selectedQuery.set('ids',ids);selectedQuery.set('by',valueKey);
   Promise.all([fetch(`/api/data/${field.relation}?${query}`,{signal:controller.signal}).then(r=>r.json()),ids?fetch(`/api/data/${field.relation}?${selectedQuery}`,{signal:controller.signal}).then(r=>r.json()):Promise.resolve({rows:[]})]).then(([data,selected])=>{if(data.error||selected.error){setError(data.error??selected.error);return;}setError('');const all=[...selected.rows,...data.rows] as Row[];setRows(all.filter((row,index)=>all.findIndex(other=>other[valueKey]===row[valueKey])===index));}).catch(e=>{if(e.name!=='AbortError')setError('No se pudo cargar la lista.');});
  },200);return()=>{clearTimeout(timer);controller.abort();};
 },[field.relation,context.academy.id,context.branch,search,value,valueKey]);
 return <div className="lookup"><input aria-label={`Buscar ${field.label.toLowerCase()}`} placeholder="Buscar en la lista…" value={search} onChange={e=>setSearch(e.target.value)}/>{field.type==='multi'?<div className="check-list">{rows.map(row=><label key={String(row.id)}><input type="checkbox" checked={Array.isArray(value)&&value.includes(row[valueKey])} onChange={e=>onChange(e.target.checked?[...(Array.isArray(value)?value:[]),row[valueKey]]:(Array.isArray(value)?value:[]).filter(v=>v!==row[valueKey]))}/>{rowLabel(row)}</label>)}</div>:<select aria-label={field.label} required={!field.optional} value={String(value??'')} onChange={e=>onChange(e.target.value)}><option value="">Selecciona{field.optional?' (opcional)':''}</option>{rows.map(row=><option key={String(row.id)} value={String(row[valueKey])}>{rowLabel(row)}</option>)}</select>}{error&&<small role="alert" className="field-error">{error}</small>}<small>Si no encuentras el registro, créalo en su sección.</small></div>;
}
function Fields({fields,values,change,context,prefix=''}:{fields:Field[];values:Row;change:(key:string,value:unknown)=>void;context:AppContext;prefix?:string}){
 return <>{fields.map(field=>{
  const value=values[field.key];const id=`${prefix}${field.key}`;
  if(field.type==='lines'){
   const lines=(Array.isArray(value)?value:[]) as Row[];
   return <fieldset className="line-fields" key={id}><legend>{field.label}{field.optional?' (opcional)':''}</legend>{lines.map((line,index)=><div className="line-row" key={index}><div className="form-grid"><Fields fields={field.fields??[]} values={line} change={(key,value)=>change(field.key,lines.map((row,i)=>i===index?{...row,[key]:value}:row))} context={context} prefix={`${id}-${index}-`}/></div><button type="button" className="icon-btn danger" aria-label={`Quitar línea ${index+1}`} onClick={()=>change(field.key,lines.filter((_,i)=>i!==index))}><Trash2 size={17}/></button></div>)}<button type="button" className="btn small" onClick={()=>change(field.key,[...lines,initialValues(field.fields??[],context,{})])}><Plus size={16}/>Agregar línea</button></fieldset>;
  }
  if(field.type==='relation'||field.type==='multi'&&field.relation)return <div className="form-field" key={id}><span className="field-label">{field.label}{field.optional?' (opcional)':''}</span><Lookup field={field} value={value} onChange={value=>change(field.key,value)} context={context}/></div>;
  if(field.type==='multi')return <fieldset className="line-fields" key={id}><legend>{field.label}</legend><div className="check-list">{field.options?.map(option=><label key={option}><input type="checkbox" checked={Array.isArray(value)&&value.includes(option)} onChange={e=>change(field.key,e.target.checked?[...(Array.isArray(value)?value:[]),option]:(Array.isArray(value)?value:[]).filter(v=>v!==option))}/>{option}</label>)}</div></fieldset>;
  if(field.type==='boolean')return <label className="checkbox-field" key={id}><input id={id} type="checkbox" checked={Boolean(value)} onChange={e=>change(field.key,e.target.checked)}/>{field.label}</label>;
  return <label className={`form-field ${field.type==='textarea'?'full':''}`} key={id} htmlFor={id}>{field.label}{field.optional&&<span className="optional" aria-hidden="true"> · opcional</span>}{field.type==='textarea'?<textarea aria-label={field.label} id={id} required={!field.optional} value={String(value??'')} onChange={e=>change(field.key,e.target.value)} rows={3}/>:field.type==='select'?<select aria-label={field.label} id={id} required={!field.optional} value={String(value??'')} onChange={e=>change(field.key,e.target.value)}><option value="">Selecciona</option>{field.options?.map(v=><option key={v}>{v}</option>)}</select>:<input aria-label={field.label} id={id} type={field.type} required={!field.optional} step={field.step} min={field.min} maxLength={field.type==='number'?undefined:5000} value={String(value??'')} onChange={e=>change(field.key,e.target.value)}/>}</label>;
 })}</>;
}
function initialValues(fields:Field[],context:AppContext,initial:Row):Row{
 const today=Temporal.Now.plainDateISO(context.academy.timezone).toString();
 return Object.fromEntries(fields.map(field=>{let value=initial[field.key];
  if(value!==undefined&&value!==null&&field.type==='datetime-local'){try{value=Temporal.Instant.from(String(value)).toZonedDateTimeISO(context.academy.timezone).toPlainDateTime().toString().slice(0,16);}catch{value=String(value).slice(0,16);}}
  if(value===null||value===undefined)value=field.default??(field.type==='boolean'?false:field.type==='date'&&!field.optional?today:field.type==='select'?field.options?.[0]??'':field.type==='lines'||field.type==='multi'?[]:'');
  return [field.key,value];
 }));
}
export function RecordForm({title,fields,context,endpoint,initial={},description,onClose,onSaved}:{title:string;fields:Field[];context:AppContext;endpoint:string;initial?:Row;description?:string;onClose:()=>void;onSaved:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);const [values,setValues]=useState<Row>(()=>initialValues(fields,context,initial));const [pending,setPending]=useState(false),[error,setError]=useState('');const retry=useRef({key:crypto.randomUUID(),payload:''});
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close();},[]);
 async function submit(event:React.FormEvent){event.preventDefault();setPending(true);setError('');
  const payload=JSON.stringify(values);if(retry.current.payload&&retry.current.payload!==payload)retry.current.key=crypto.randomUUID();retry.current.payload=payload;
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({academy:context.academy.id,branch:context.branch??'all',data:values,key:retry.current.key,id:initial.id})});const data=await response.json();if(!response.ok||data.error)throw Error(data.error??'No se pudo guardar.');onSaved();onClose();}catch(error){setError(error instanceof Error?error.message:'No se pudo guardar.');}finally{setPending(false);}
 }
 return <dialog ref={dialog} onCancel={e=>{if(pending)e.preventDefault();else onClose();}} className="form-dialog"><div className="dialog-top"><div><span className="eyebrow">{context.academy.name}</span><h2>{title}</h2></div><button type="button" className="icon-btn" aria-label="Cerrar formulario" onClick={onClose} disabled={pending}><X size={21}/></button></div>{description&&<p className="form-description">{description}</p>}<form onSubmit={submit}><div className="form-grid"><Fields fields={fields} values={values} change={(key,value)=>setValues(v=>({...v,[key]:value}))} context={context}/></div>{error&&<div className="error" role="alert">{error}</div>}<div className="dialog-footer"><small>Moneda: {context.academy.currency} · {context.academy.timezone}</small><button type="button" className="btn" onClick={onClose} disabled={pending}>Cancelar</button><button className="btn primary" disabled={pending}>{pending?<LoaderCircle className="spin" size={17}/>:null}{pending?'Guardando…':'Confirmar'}</button></div></form></dialog>;
}
