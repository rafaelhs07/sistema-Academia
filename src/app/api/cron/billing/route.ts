import { NextRequest,NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(request:NextRequest) {
 const secret=process.env.CRON_SECRET;const supplied=request.headers.get('authorization')??'';const expected=`Bearer ${secret??''}`;
 const providedBytes=Buffer.from(supplied),expectedBytes=Buffer.from(expected);
 if(!secret||secret.length<32||providedBytes.length!==expectedBytes.length||!timingSafeEqual(providedBytes,expectedBytes))return NextResponse.json({error:'No autorizado.'},{status:401});
 if(process.env.VERCEL_ENV==='preview'||(process.env.ENABLE_BILLING_CRON!=='true'&&process.env.ENABLE_PLATFORM_BILLING_CRON!=='true'))return NextResponse.json({error:'Proceso desactivado en este entorno.'},{status:403});
 const results:Record<string,unknown>={};const client=adminClient();
 for(const [name,enabled] of [['scheduled_platform_billing',process.env.ENABLE_PLATFORM_BILLING_CRON],['scheduled_billing',process.env.ENABLE_BILLING_CRON]]){if(enabled!=='true')continue;const {data,error}=await client.rpc(name!,{p_limit:100});if(error){console.error('billing_job_failed',{job:name,code:error.code});return NextResponse.json({error:'Falló la generación. Revisa el registro del proceso.'},{status:500});}results[name!]=data;}
 return NextResponse.json({results});
}
