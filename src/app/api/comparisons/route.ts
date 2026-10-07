import { NextRequest,NextResponse } from 'next/server';
import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';
import { getContext,requirePermission,BusinessServiceError } from '@/lib/context';
import { safeError } from '@/lib/validation';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{
 const url=request.nextUrl;const {client,context}=await getContext(url.searchParams.get('academy'),url.searchParams.get('branch'));requirePermission(context,'reports.read');
 const from=Temporal.PlainDate.from(z.iso.date().parse(url.searchParams.get('from'))),to=Temporal.PlainDate.from(z.iso.date().parse(url.searchParams.get('to')));
 const days=from.until(to).days+1;if(days<1||days>366)throw Error('Selecciona entre 1 y 366 días.');
 const previousTo=from.subtract({days:1}),previousFrom=previousTo.subtract({days:days-1});
 const scopes=context.branch?context.branches.filter(b=>b.id===context.branch):context.branches;
 const rows=await Promise.all(scopes.map(async branch=>{const base={p_academy:context.academy.id,p_branch:branch.id};const [current,previous]=await Promise.all([client.rpc('dashboard',{...base,p_from:from.toString(),p_to:to.toString()}),client.rpc('dashboard',{...base,p_from:previousFrom.toString(),p_to:previousTo.toString()})]);if(current.error||previous.error)throw Error(current.error?.message??previous.error?.message);return {branch:branch.name,current:current.data,previous:previous.data};}));
 return NextResponse.json({rows,previousFrom:previousFrom.toString(),previousTo:previousTo.toString()},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return NextResponse.json({error:safeError(error)},{status:error instanceof BusinessServiceError?403:400});}}
