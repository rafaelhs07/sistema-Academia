import { NextRequest,NextResponse } from 'next/server';
import { privateFiles,validateAcademyFile } from '@/lib/private-files';
import { z } from 'zod';
import { platformContext,sameOrigin,PlatformAccessError } from '@/lib/platform';
import { safeError } from '@/lib/validation';
export async function POST(request:NextRequest){try{
 sameOrigin(request);const {client}=await platformContext();if(Number(request.headers.get('content-length')??0)>4400000)throw Error('El archivo supera 4 MB.');
 const form=await request.formData();const academy=z.uuid().parse(form.get('academy_id')),kind=z.enum(['logo','comprobante']).parse(form.get('kind')),title=z.string().trim().min(1).max(120).parse(form.get('title'));const key=z.uuid().parse(form.get('key'));
 const business=await client.from('platform_businesses').select('academy_id').eq('academy_id',academy).single();if(business.error||!business.data)throw Error('Negocio no disponible.');
 const file=form.get('file');if(!(file instanceof File)||file.size===0||file.size>4194304)throw Error('Selecciona un archivo de hasta 4 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());const mime=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff?'image/jpeg':bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47?'image/png':new TextDecoder().decode(bytes.slice(0,5))==='%PDF-'?'application/pdf':null;
 if(!mime||mime!==file.type||(kind==='logo'&&mime==='application/pdf'))throw Error('Usa un PNG o JPG para el logo; PDF, PNG o JPG para comprobantes.');
 const path=`${academy}/${kind}/${key}.${mime==='image/png'?'png':mime==='image/jpeg'?'jpg':'pdf'}`;
 const existing=await client.from('platform_documents').select('id').eq('path',path).maybeSingle();if(existing.error)throw Error(existing.error.message);if(existing.data)return NextResponse.json(existing.data);
 const uploaded=await privateFiles().from('platform-private').upload(path,bytes,{contentType:mime,upsert:false});
 if(uploaded.error&&uploaded.error.message!=='The resource already exists')throw Error('No se pudo subir el archivo.');
 const recorded=await client.rpc('platform_operate',{p_action:'document',p_data:{academy_id:academy,id:key,kind,title,path,mime_type:mime,size_bytes:file.size},p_key:key});if(recorded.error)throw Error(recorded.error.message);
 return NextResponse.json(recorded.data,{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:error instanceof PlatformAccessError?error.status:400});}}
export async function GET(request:NextRequest){try{
 const {client}=await platformContext();let bucket='platform-private',path:string,mime:string;
 if(request.nextUrl.searchParams.has('logo')){const r=await client.rpc('platform_logo',{p_academy:z.uuid().parse(request.nextUrl.searchParams.get('logo'))});if(r.error||!r.data)throw new PlatformAccessError(404,'Logotipo no disponible.');bucket=r.data.bucket;path=r.data.path;mime=path.endsWith('.png')?'image/png':'image/jpeg';}
 else{const r=await client.from('platform_documents').select('path,mime_type').eq('id',z.uuid().parse(request.nextUrl.searchParams.get('id'))).single();if(r.error||!r.data)throw new PlatformAccessError(404,'Archivo no disponible.');path=r.data.path;mime=r.data.mime_type;}
 if(bucket==='academy-private')validateAcademyFile(path,z.uuid().parse(request.nextUrl.searchParams.get('logo')));
 const download=await privateFiles().from(bucket).download(path);if(download.error)throw Error('No se pudo leer el archivo.');
 return new NextResponse(download.data,{headers:{'Content-Type':mime,'Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});
 }catch(error){return NextResponse.json({error:safeError(error)},{status:error instanceof PlatformAccessError?error.status:400});}}
