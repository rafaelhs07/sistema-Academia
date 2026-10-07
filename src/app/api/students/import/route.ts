import { NextRequest,NextResponse } from 'next/server';
import { getContext,requirePermission } from '@/lib/context';
import { importRow,previewStudents } from '@/domains/students/import';
import { safeError,uuid } from '@/lib/validation';
import { z } from 'zod';
export async function POST(request:NextRequest){try{
 if(request.headers.get('origin')!==request.nextUrl.origin)throw Error('Origen no permitido.');const body=await request.json();const {client,context}=await getContext(body.academy,body.branch??'all');requirePermission(context,'students.write');if(!context.branch)throw Error('Selecciona una sucursal.');
 const existing=await client.from('students').select('name,email').eq('academy_id',context.academy.id).limit(10000);if(existing.error)throw Error(existing.error.message);
 const lines=previewStudents(z.string().max(1000000).parse(body.csv),existing.data??[]);
 if(body.mode==='preview')return NextResponse.json({lines});
 if(lines.some(row=>row.errors.length))throw Error('Corrige los errores antes de importar.');
 const duplicateMode=z.enum(['skip','include']).parse(body.duplicates);const rows=lines.filter(row=>duplicateMode==='include'||!row.duplicate).map(row=>importRow.parse(row.data));
 if(!rows.length)throw Error('No hay filas nuevas que importar.');
 const result=await client.rpc('operate',{p_academy:context.academy.id,p_branch:context.branch,p_action:'import_students',p_key:uuid.parse(body.key),p_data:{rows,allow_duplicates:duplicateMode==='include'}});if(result.error)throw Error(result.error.message);return NextResponse.json(result.data);
}catch(error){return NextResponse.json({error:safeError(error)},{status:400});}}
