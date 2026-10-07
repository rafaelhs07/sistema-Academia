import { NextRequest,NextResponse } from 'next/server';
import { getContext,BusinessServiceError } from '@/lib/context';
import { safeError } from '@/lib/validation';
import { z } from 'zod';
import { allowed } from '@/lib/money';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{const url=request.nextUrl;const {client,context}=await getContext(url.searchParams.get('academy'),url.searchParams.get('branch'));const input={p_academy:context.academy.id,p_branch:context.branch,p_from:z.iso.date().parse(url.searchParams.get('from')),p_to:z.iso.date().parse(url.searchParams.get('to'))};const {data,error}=await client.rpc('dashboard',input);if(error)throw Error(error.message);let concepts=[];if(allowed(context.permissions,'billing.read')){const result=await client.rpc('collection_breakdown',input);if(result.error)throw Error(result.error.message);concepts=result.data??[];}return NextResponse.json({...data,concepts},{headers:{'Cache-Control':'private, no-store'}});}catch(error){return NextResponse.json({error:safeError(error)},{status:error instanceof BusinessServiceError?403:400});}}
