import { NextRequest,NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabase } from '@/lib/supabase/server';
export async function GET(request:NextRequest){
 const code=request.nextUrl.searchParams.get('code');const hash=request.nextUrl.searchParams.get('token_hash');const type=request.nextUrl.searchParams.get('type');
 const destination=request.nextUrl.searchParams.get('next')==='/auth/password'?'/auth/password':'/panel/inicio';
 const client=await createSupabase();
 const result=code?await client.auth.exchangeCodeForSession(code):hash&&['invite','recovery'].includes(type??'')?await client.auth.verifyOtp({token_hash:hash,type:type as EmailOtpType}):{error:true};
 const response=NextResponse.redirect(new URL(result.error?'/login?error=enlace':destination,request.url));response.headers.set('Cache-Control','private, no-store');return response;
}
