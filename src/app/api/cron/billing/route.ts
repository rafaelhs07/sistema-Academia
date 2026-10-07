import { NextRequest,NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(request:NextRequest) {
 const secret=process.env.CRON_SECRET;const supplied=request.headers.get('authorization')??'';const expected=`Bearer ${secret??''}`;
 const providedBytes=Buffer.from(supplied),expectedBytes=Buffer.from(expected);
 if(!secret||secret.length<32||providedBytes.length!==expectedBytes.length||!timingSafeEqual(providedBytes,expectedBytes))return NextResponse.json({error:'No autorizado.'},{status:401});
 if(process.env.ENABLE_BILLING_CRON!=='true'||process.env.VERCEL_ENV==='preview')return NextResponse.json({error:'Proceso desactivado en este entorno.'},{status:403});
 const {data,error}=await adminClient().rpc('scheduled_billing',{p_limit:100});
 if(error){console.error('billing_job_failed',{code:error.code});return NextResponse.json({error:'Falló la generación. Revisa el registro del proceso.'},{status:500});}
 return NextResponse.json({results:data});
}
