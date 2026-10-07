'use client';
import { useState } from 'react';
import { Check,ChevronRight } from 'lucide-react';
import type { AppContext } from '@/lib/context';
import { resources,operations } from '@/domains/catalog';
import { RecordForm } from './record-form';
const steps=[{title:'Identidad de la academia',action:'academy_settings'}, {title:'Primera sucursal',resource:'branches'}, {title:'Primera caja o cuenta',resource:'accounts'}, {title:'Medio de pago',resource:'payment_methods'}, {title:'Primer plan',resource:'plans'}, {title:'Primera tarifa',action:'plan_version'}];
export function SetupWizard({context,onSaved}:{context:AppContext;onSaved:()=>void}){
 const [index,setIndex]=useState(0),[editing,setEditing]=useState(false);
 const step=steps[index];const spec=step?.action?operations[step.action]:step?.resource?resources[step.resource]:undefined;
 return <section className="card setup-wizard"><div><span className="eyebrow">PUESTA EN MARCHA</span><h2>Configura tu academia</h2><p>Completa cada paso con los datos y precios reales. Puedes volver a cualquier configuración después.</p></div><div className="wizard-steps">{steps.map((step,i)=><button key={step.title} className={i===index?'current':''} onClick={()=>setIndex(i)}><span>{i<index?<Check size={13}/>:i+1}</span>{step.title}</button>)}</div>{step?<div className="wizard-action"><strong>{step.title}</strong><button className="btn primary" disabled={index>1&&!context.branch} onClick={()=>setEditing(true)}>Configurar <ChevronRight size={16}/></button><button className="btn" onClick={()=>setIndex(i=>i+1)}>Ya está configurado</button></div>:<div className="success">Configuración inicial recorrida. Verifica tus datos en cada sección antes de operar.</div>}{editing&&spec&&step&&<RecordForm title={step.title} fields={spec.fields} context={context} endpoint={step.action?`/api/operations/${step.action}`:`/api/data/${step.resource}`} initial={index===0?context.academy:{}} onClose={()=>setEditing(false)} onSaved={()=>{onSaved();setIndex(i=>i+1);}}/>}</section>;
}
