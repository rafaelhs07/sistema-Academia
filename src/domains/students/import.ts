import { z } from 'zod';
import { parseCsv } from '@/lib/csv';
export const importRow=z.strictObject({name:z.string().trim().min(2).max(120),email:z.union([z.email(),z.literal('')]).default(''),phone:z.string().max(40).default(''),birth_date:z.union([z.iso.date(),z.literal('')]).default(''),joined_on:z.iso.date(),status:z.enum(['activo','pausado','retirado']).default('activo')});
export const importColumns=['name','email','phone','birth_date','joined_on','status'];
export type ImportLine={line:number;data:Record<string,string>;errors:string[];duplicate:boolean};
function normalized(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();}
export function previewStudents(text:string,existing:{name:string;email:string|null}[]):ImportLine[]{
 const [header,...rows]=parseCsv(text);if(!header||header.join(',')!==importColumns.join(','))throw Error('Usa la plantilla CSV de estudiantes sin cambiar sus columnas.');if(rows.length>500)throw Error('Importa hasta 500 estudiantes por lote.');
 const names=new Set(existing.map(r=>normalized(r.name))),emails=new Set(existing.map(r=>r.email?.toLowerCase()).filter(Boolean));
 return rows.map((row,index)=>{const data=Object.fromEntries(header.map((key,i)=>[key,row[i]?.trim()??'']));const parsed=importRow.safeParse(data);const duplicate=names.has(normalized(data.name))||Boolean(data.email&&emails.has(data.email.toLowerCase()));names.add(normalized(data.name));if(data.email)emails.add(data.email.toLowerCase());return {line:index+2,data,errors:row.length!==header.length?['Cantidad de columnas incorrecta.']:parsed.success?[]:parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`),duplicate};});
}
