import { NextRequest,NextResponse } from 'next/server';
import { getContext } from '@/lib/context';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 try{const {client,context}=await getContext(request.nextUrl.searchParams.get('academy'));const path=await client.rpc('logo_path',{p_academy:context.academy.id});if(path.error||!path.data)return new NextResponse(null,{status:404});const file=await client.storage.from('academy-private').download(path.data);if(file.error||!file.data)return new NextResponse(null,{status:404});return new NextResponse(file.data,{headers:{'Content-Type':file.data.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{return new NextResponse(null,{status:404});}
}
