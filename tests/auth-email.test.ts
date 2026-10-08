import { beforeEach,describe,expect,it,vi } from 'vitest';
import { NextRequest } from 'next/server';
import { readEmailSession } from '../src/lib/email-session';

const auth=vi.hoisted(()=>({exchangeCodeForSession:vi.fn(),verifyOtp:vi.fn()}));
vi.mock('../src/lib/supabase/server',()=>({createSupabase:vi.fn(async()=>({auth}))}));
import { GET } from '../src/app/auth/callback/route';

describe('enlaces de acceso por correo',()=>{
 beforeEach(()=>{vi.clearAllMocks();auth.exchangeCodeForSession.mockResolvedValue({error:null});auth.verifyOtp.mockResolvedValue({error:null});});
 it.each(['invite','recovery'])('lee la sesión de %s sin aceptar destinos del enlace',type=>{
  expect(readEmailSession(`#access_token=test-access&refresh_token=test-refresh&type=${type}&token_type=bearer&next=https://invalid.example`)).toEqual({access_token:'test-access',refresh_token:'test-refresh'});
 });
 it.each([
  '',
  '#access_token=test-access&type=invite&token_type=bearer',
  '#access_token=test-access&refresh_token=test-refresh&type=signup&token_type=bearer',
  '#access_token=test-access&refresh_token=test-refresh&type=invite&token_type=invalid',
  '#access_token=test-access&refresh_token=test-refresh&type=invite&token_type=bearer&access_token=other',
  '#access_token=test-access&refresh_token=test-refresh&type=invite&token_type=bearer&error=expired',
 ])('rechaza fragmentos incompletos, ambiguos o con error: %s',fragment=>{expect(()=>readEmailSession(fragment)).toThrow('Solicita uno nuevo');});
 it('envía el retorno implícito al cliente sin intentar PKCE ni aceptar next externo',async()=>{
  const response=await GET(new NextRequest('http://localhost:3000/auth/callback?next=https://invalid.example'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/auth/complete');
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();expect(auth.verifyOtp).not.toHaveBeenCalled();
 });
 it('conserva el intercambio PKCE y su destino local',async()=>{
  const response=await GET(new NextRequest('http://localhost:3000/auth/callback?code=test-code&next=/auth/password'));
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('test-code');
  expect(response.headers.get('location')).toBe('http://localhost:3000/auth/password');
 });
 it.each(['invite','recovery'])('conserva la plantilla con token_hash para %s',async type=>{
  const response=await GET(new NextRequest(`http://localhost:3000/auth/callback?token_hash=test-hash&type=${type}&next=/auth/password`));
  expect(auth.verifyOtp).toHaveBeenCalledWith({token_hash:'test-hash',type});
  expect(response.headers.get('location')).toBe('http://localhost:3000/auth/password');
 });
 it('muestra recuperación cuando Supabase rechaza el enlace',async()=>{
  auth.verifyOtp.mockResolvedValue({error:{message:'Expired'}});
  const response=await GET(new NextRequest('http://localhost:3000/auth/callback?token_hash=test-hash&type=invite'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/auth/complete');
 });
 it('rechaza tipos de token_hash ajenos a invitación o recuperación',async()=>{
  const response=await GET(new NextRequest('http://localhost:3000/auth/callback?token_hash=test-hash&type=signup'));
  expect(auth.verifyOtp).not.toHaveBeenCalled();expect(response.headers.get('location')).toBe('http://localhost:3000/auth/complete');
 });
 it('no permite redirecciones externas tras PKCE',async()=>{
  const response=await GET(new NextRequest('http://localhost:3000/auth/callback?code=test-code&next=https://invalid.example'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/panel/inicio');
 });
});
