import { z } from 'zod';
import { money } from '@/lib/money';
const text=z.string().trim().min(1).max(300),optional=text.optional(),id=z.uuid(),reason=z.string().trim().min(5,'Explica el motivo (al menos 5 caracteres).').max(2000);
const amount=z.union([z.string(),z.number()]).transform(v=>money(v));
const currency=z.string().toUpperCase().regex(/^[A-Z]{3}$/),date=z.iso.date();
export const optionalModules=['sales','inventory','classes','staff','reports'] as const;
export const moduleNames:Record<string,string>={sales:'Punto de venta',inventory:'Inventario y compras',classes:'Calendario y asistencia',staff:'Personal y remuneraciones',reports:'Reportes avanzados'};
const modules=z.array(z.enum(optionalModules)).max(5).refine(v=>!v.includes('sales')||v.includes('inventory'),'Punto de venta requiere inventario.');
const terms={price:amount,trial_days:z.coerce.number().int().min(0).max(365),max_branches:z.coerce.number().int().min(1).max(100000),max_users:z.coerce.number().int().min(1).max(100000),max_students:z.coerce.number().int().positive().nullable(),modules};
const business={academy_id:id};
const schemas:Record<string,z.ZodType>={
 plan:z.strictObject({id:id.optional(),name:text,description:z.string().max(2000),currency,cycle:z.enum(['mensual','anual']),...terms,active:z.boolean()}),
 payment_method:z.strictObject({id:id.optional(),name:text,kind:z.enum(['efectivo','transferencia','otro']),requires_verification:z.boolean(),active:z.boolean()}).refine(v=>v.kind!=='transferencia'||v.requires_verification,'Las transferencias requieren verificación.'),
 settings:z.strictObject({timezone:text,contact:z.string().max(1000),payment_instructions:z.string().max(4000)}),
 automation:z.strictObject({enabled:z.boolean(),preview_token:z.string().max(100).optional(),reason}),
 create_business:z.strictObject({id:id.optional(),name:text,country:text,currency,timezone:text,contact:optional,responsible_name:text,contact_email:z.email().optional(),phone:optional,owner_name:text,owner_email:z.email().max(254),branch_name:text,branch_address:optional,plan_id:id,starts_on:date,trial_days:terms.trial_days}),
 edit_business:z.strictObject({...business,name:text,responsible_name:text,contact_email:z.email().optional(),phone:optional,reason}),
 assign_plan:z.strictObject({...business,plan_id:id,starts_on:date.optional(),price:amount.optional(),trial_days:terms.trial_days.optional(),max_branches:terms.max_branches.optional(),max_users:terms.max_users.optional(),max_students:terms.max_students.optional(),modules:modules.optional(),reason}),
 trial:z.strictObject({...business,trial_until:date,reason}),extend:z.strictObject({...business,extension_until:date,reason}),
 grace:z.strictObject({...business,grace_days:z.coerce.number().int().min(0).max(90),automatic_suspension:z.boolean(),reason}),
 suspend:z.strictObject({...business,reason,internal_note:z.string().max(2000).optional(),customer_message:text}),
 reactivate:z.strictObject({...business,reason,extension_until:date.optional()}),cancel:z.strictObject({...business,reason,customer_message:text}),
 generate:z.strictObject({...business,cutoff:date.optional()}),generate_all:z.strictObject({}),
 adjustment:z.strictObject({...business,charge_id:id,amount,reason}),
 payment:z.strictObject({...business,method_id:id,amount,currency,reference:optional,document_id:id.optional(),applications:z.array(z.strictObject({charge_id:id,amount})).min(1).max(100)}),
 confirm_payment:z.strictObject({...business,payment_id:id}),reject_payment:z.strictObject({...business,payment_id:id,reason}),
 invite:z.strictObject({...business,resend:z.boolean().optional(),reason}),
};
export function platformValues(action:string,input:unknown){const schema=schemas[action];if(!schema)throw Error('Operación no disponible.');return schema.parse(input) as Record<string,unknown>;}
export const platformResources=['dashboard','preview','businesses','plans','methods','charges','payments','contracts','audit','documents','settings','jobs'] as const;
export const accessNames:Record<string,string>={sin_contrato:'Sin contrato',pendiente_inicio:'Inicio futuro',prueba:'En prueba',activa:'Activa y al día',gracia:'Deuda en gracia',extension_temporal:'Extensión temporal',deuda_sin_suspension:'Con deuda · acceso activo',suspendida_impago:'Suspendida por impago',suspendida_manual:'Suspendida manualmente',cancelada:'Cancelada'};
