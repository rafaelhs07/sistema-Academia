import { NextRequest,NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabase } from '@/lib/supabase/server';
function redirectTo(path:string,request:NextRequest){
 const response=NextResponse.redirect(new URL(path,request.url));
 response.headers.set('Cache-Control','private, no-store');
 response.headers.set('Referrer-Policy','no-referrer');
 return response;
}
export async function GET(request:NextRequest){
 const code=request.nextUrl.searchParams.get('code');const hash=request.nextUrl.searchParams.get('token_hash');const type=request.nextUrl.searchParams.get('type');
 const destination=request.nextUrl.searchParams.get('next')==='/auth/password'?'/auth/password':'/panel/inicio';
 // Standard invitation emails return credentials in a fragment, invisible to the server.
 // Browsers preserve it across this redirect so the client can establish SSR cookies.
 if(!code&&!hash)return redirectTo('/auth/complete',request);
 const client=await createSupabase();
 const result=code?await client.auth.exchangeCodeForSession(code):hash&&['invite','recovery'].includes(type??'')?await client.auth.verifyOtp({token_hash:hash,type:type as EmailOtpType}):{error:true};
 return redirectTo(result.error?'/auth/complete':destination,request);
}
