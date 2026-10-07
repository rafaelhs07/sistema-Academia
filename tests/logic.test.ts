import { describe,it,expect } from 'vitest';
import { money,sum } from '../src/lib/money';
import { parseCsv,csv } from '../src/lib/csv';
import { previewStudents } from '../src/domains/students/import';
import { formSchema } from '../src/lib/validation';
describe('importes y entradas',()=>{
 it('suma decimales exactos y rechaza redondeos implícitos',()=>{expect(sum(['0.10','0.20'])).toBe('0.30');expect(()=>money('1.005')).toThrow();expect(()=>money('NaN')).toThrow();});
 it('CSV conserva comas, saltos y comillas y neutraliza fórmulas',()=>{expect(parseCsv('nombre,nota\r\n"Ana, B","Dos\nfilas"\r\n')).toEqual([['nombre','nota'],['Ana, B','Dos\nfilas']]);expect(csv(['x'],[{x:'=HYPERLINK("malicioso")'}])).toContain("'=HYPERLINK");});
 it('prevalida duplicados y errores de importación',()=>{const lines=previewStudents('name,email,phone,birth_date,joined_on,status\nAna,a@test.invalid,,,2026-10-01,activo\nAna,,,,no-fecha,activo',[{name:'Ana',email:'a@test.invalid'}]);expect(lines[0].duplicate).toBe(true);expect(lines[1].errors.length).toBeGreaterThan(0);});
 it('rechaza claves extra y convierte horarios en la zona correcta',()=>{const schema=formSchema([{key:'starts_at',label:'Inicio',type:'datetime-local'}],'America/Guatemala');expect(schema.parse({starts_at:'2026-10-07T12:00'}).starts_at).toBe('2026-10-07T18:00:00Z');expect(()=>schema.parse({starts_at:'2026-10-07T12:00',academy_id:'otra'})).toThrow();});
});
