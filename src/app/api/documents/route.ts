import { NextRequest,NextResponse } from 'next/server';
import { getContext,requirePermission } from '@/lib/context';
import { safeError,uuid } from '@/lib/validation';
import { z } from 'zod';
function mime(bytes:Uint8Array):string|null{
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return 'image/png';
 if(new TextDecoder().decode(bytes.slice(0,5))==='%PDF-')return 'application/pdf';return null;
}
export async function POST(request:NextRequest){
 try{if(request.headers.get('origin')!==request.nextUrl.origin)throw Error('Origen no permitido.');if(Number(request.headers.get('content-length')??0)>5500000)throw Error('El archivo supera 5 MB.');
  const body=await request.formData();const {client,context}=await getContext(String(body.get('academy')),String(body.get('branch')??'all'));requirePermission(context,'documents.write');
  if(!context.branch)throw Error('Selecciona una sucursal.');const file=body.get('file');if(!(file instanceof File)||file.size===0||file.size>5242880)throw Error('Selecciona un archivo de hasta 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());const detected=mime(bytes);if(!detected||detected!==file.type)throw Error('Usa un PDF, JPG o PNG válido.');
  const title=z.string().trim().min(1).max(120).parse(body.get('title'));const student=body.get('student_id')?uuid.parse(body.get('student_id')):null;
  if(student){const {data,error}=await client.from('students').select('id').eq('id',student).eq('branch_id',context.branch).eq('academy_id',context.academy.id).single();if(error||!data)throw Error('Estudiante no disponible.');}
  const path=`${context.academy.id}/${context.branch}/${crypto.randomUUID()}.${detected==='application/pdf'?'pdf':detected==='image/jpeg'?'jpg':'png'}`;
  const {error}=await client.storage.from('academy-private').upload(path,bytes,{contentType:detected,upsert:false});if(error)throw Error(error.message);
  const result=await client.from('documents').insert({academy_id:context.academy.id,branch_id:context.branch,student_id:student,title,path,mime_type:detected,size_bytes:file.size}).select('id').single();if(result.error)throw Error('El archivo se subió, pero no se guardó el expediente. Revisa los archivos huérfanos desde el procedimiento de mantenimiento.');
  return NextResponse.json({id:result.data.id});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:400});}
}
