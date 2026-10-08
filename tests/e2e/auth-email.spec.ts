import { test,expect,type Page } from '@playwright/test';

async function emailFragment(page:Page,type:'invite'|'recovery'){
 const response=await page.request.post('http://127.0.0.1:54321/auth/v1/token?grant_type=password',{data:{email:'owner@test.invalid',password:'test-only-password-123'}});
 expect(response.ok()).toBe(true);const session=await response.json();
 return {session,fragment:new URLSearchParams({access_token:session.access_token,refresh_token:session.refresh_token,token_type:'bearer',type}).toString()};
}

test('invitación estándar abre contraseña y permite iniciar sesión con ella',async({page,browser})=>{
 const {session,fragment}=await emailFragment(page,'invite');
 let credentialsInQuery=false;
 page.on('request',request=>{const url=new URL(request.url());if(url.searchParams.has('access_token')||url.searchParams.has('refresh_token'))credentialsInQuery=true;});
 await page.goto(`/auth/callback?next=/auth/password#${fragment}`);
 await expect(page).toHaveURL('http://localhost:3100/auth/password');
 await expect(page.getByRole('heading',{name:'Define tu contraseña'})).toBeVisible();
 await expect(page.getByText('owner@test.invalid',{exact:true})).toBeVisible();
 const newPassword='new-test-password-123';
 try{
  await page.getByLabel('Nueva contraseña',{exact:true}).fill(newPassword);
  await page.getByLabel('Repite la contraseña',{exact:true}).fill(newPassword);
  await page.getByRole('button',{name:'Guardar contraseña'}).click();
  await expect(page.getByRole('heading',{name:'Hola, Propietario'})).toBeVisible();
  const context=await browser.newContext();
  try{
   const login=await context.newPage();await login.goto('http://localhost:3100/login');
   await login.getByLabel('Correo electrónico').fill('owner@test.invalid');
   await login.getByLabel('Contraseña',{exact:true}).fill(newPassword);
   await login.getByRole('button',{name:'Entrar a la academia'}).click();
   await expect(login.getByRole('heading',{name:'Hola, Propietario'})).toBeVisible();
  }finally{await context.close();}
  expect(credentialsInQuery).toBe(false);
 }finally{
  const restored=await page.request.put('http://127.0.0.1:54321/auth/v1/user',{headers:{Authorization:`Bearer ${session.access_token}`},data:{password:'test-only-password-123'}});
  expect(restored.ok()).toBe(true);
 }
});

test('recuperación y retorno antiguo desde login muestran contraseña sin tokens en URL',async({page})=>{
 for(const path of ['/auth/callback?next=/auth/password','/login?error=enlace']){
  const {fragment}=await emailFragment(page,'recovery');
  await page.goto(`${path}#${fragment}`);
  await expect(page).toHaveURL('http://localhost:3100/auth/password');
  await expect(page.getByLabel('Nueva contraseña',{exact:true})).toBeVisible();
 }
});

test('enlaces inválidos o vencidos muestran recuperación y no habilitan contraseña',async({page})=>{
 for(const fragment of ['', 'error=access_denied&error_code=otp_expired', 'access_token=invalid&refresh_token=invalid&token_type=bearer&type=invite']){
  await page.goto(`/auth/callback?next=https://invalid.example#${fragment}`);
  await expect(page).toHaveURL('http://localhost:3100/auth/complete');
  await expect(page.getByRole('alert').filter({hasText:'El enlace no está disponible'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Solicitar nuevo enlace'})).toHaveAttribute('href','/auth/recover');
  expect((await page.request.get('/api/data/students')).status()).toBe(401);
 }
 await page.goto('/auth/password');
 await expect(page.getByRole('alert').filter({hasText:'El enlace no está disponible'})).toBeVisible();
 await expect(page.getByLabel('Nueva contraseña',{exact:true})).toHaveCount(0);
});
