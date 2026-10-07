import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import type { Field } from '@/domains/catalog';
export const uuid=z.uuid();
function fieldSchema(field:Field,timezone:string):z.ZodType {
 let schema:z.ZodType;
 switch(field.type){
  case 'boolean':schema=z.boolean();break;
  case 'number':schema=z.union([z.string(),z.number()]).transform(String).refine(v=>/^-?\d{1,12}(\.\d{1,4})?$/.test(v),'Escribe un número válido.').refine(v=>field.min===undefined||Number(v)>=field.min,'El importe está fuera de rango.');break;
  case 'date':schema=z.iso.date();break;
  case 'datetime-local':schema=z.string().transform((v,ctx)=>{try{return Temporal.PlainDateTime.from(v).toZonedDateTime(timezone,{disambiguation:'reject'}).toInstant().toString();}catch{ctx.addIssue({code:'custom',message:'Fecha u hora inválida en la zona de la academia.'});return z.NEVER;}});break;
  case 'email':schema=z.email().max(254);break;
  case 'relation':schema=uuid;break;
  case 'select':schema=z.enum(field.options as [string,...string[]]);break;
  case 'multi':schema=z.array(field.relation?uuid:z.enum(field.options as [string,...string[]])).max(100);break;
  case 'lines':schema=z.array(formSchema(field.fields??[],timezone)).max(100);if(!field.optional)schema=(schema as z.ZodArray<z.ZodType>).min(1);break;
  default:schema=z.string().trim().min(1,'Este campo es obligatorio.').max(field.type==='textarea'?5000:300);
 }
 if(field.optional)schema=z.preprocess(v=>v===''||v===null?undefined:v,schema.optional());
 return schema;
}
export function formSchema(fields:Field[],timezone:string) {return z.strictObject(Object.fromEntries(fields.map(field=>[field.key,fieldSchema(field,timezone)])));}
export function safeError(error:unknown):string {
 if(error instanceof z.ZodError)return error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(' · ');
 const message=error instanceof Error?error.message:String(error);
 if(/permission denied|row-level security|42501/i.test(message))return 'No tienes permiso para consultar o modificar este registro.';
 if(/foreign key/i.test(message))return 'Un registro relacionado no está disponible en esta academia.';
 if(/duplicate key|unique constraint/i.test(message))return 'Este registro ya existe. Revisa el código o la fecha.';
 if(/check constraint/i.test(message))return 'Los datos no cumplen las reglas del registro. Revisa importes, cantidades y fechas.';
 if(/fetch failed|failed to fetch|network|ECONN/i.test(message))return 'No se pudo conectar. Comprueba tu conexión y vuelve a intentar.';
 return message.slice(0,300);
}
