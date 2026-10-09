import { test,expect } from '@playwright/test';

test('primera inscripción MFA muestra el SVG de Supabase y permite verificar',async({page})=>{
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 // Auth returns raw, multiline SVG; the real SDK adds the data: prefix.
 const svg='<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="219" height="219">\n<rect width="219" height="219" fill="#fff"/><rect x="12" y="12" width="30" height="30" fill="#000"/>\n</svg>\n';
 let factorId='';
 await page.route('http://127.0.0.1:54321/auth/v1/user',async route=>{
  const response=await route.fetch();const user=await response.json();
  factorId=user.factors?.[0]?.id??factorId;
  await route.fulfill({response,json:{...user,factors:[]}});
 });
 await page.route('http://127.0.0.1:54321/auth/v1/factors',async route=>{
  expect(route.request().postDataJSON().factor_type).toBe('totp');
  expect(factorId).toBeTruthy();
  await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'http://localhost:3100','Access-Control-Allow-Credentials':'true'},json:{id:factorId,type:'totp',friendly_name:'Inscripción de prueba',totp:{qr_code:svg,secret:'JBSWY3DPEHPK3PXP',uri:'otpauth://totp/Prueba?secret=JBSWY3DPEHPK3PXP'}}});
 });
 await page.goto('/login');
 await page.getByLabel('Correo electrónico').fill('admin@test.invalid');
 await page.getByLabel('Contraseña',{exact:true}).fill('test-only-password-123');
 await page.getByRole('button',{name:'Entrar a la academia'}).click();
 await expect(page).toHaveURL(/superadmin\/mfa/);
 expect((await page.request.get('/api/platform/businesses')).status()).toBe(403);
 await page.getByRole('button',{name:'Configurar aplicación autenticadora'}).click();
 const qr=page.getByRole('img',{name:'Código QR para configurar la aplicación autenticadora'});
 await expect(qr).toBeVisible();
 await expect.poll(()=>qr.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===219)).toBe(true);
 const src=await qr.getAttribute('src');
 expect(src).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
 expect(src).not.toContain('\n');
 expect(decodeURIComponent(src!.slice(src!.indexOf(',')+1))).toBe(svg);
 await page.getByText('Usar clave manual',{exact:true}).click();
 await expect(page.getByText('JBSWY3DPEHPK3PXP',{exact:true})).toBeVisible();
 await page.getByLabel('Código de seis dígitos').fill('000000');
 await page.getByRole('button',{name:'Verificar y entrar'}).click();
 await expect(page.getByRole('alert').filter({hasText:'No se pudo verificar'})).toBeVisible();
 expect((await page.request.get('/api/platform/businesses')).status()).toBe(403);
 await page.unroute('http://127.0.0.1:54321/auth/v1/user');
 await page.getByLabel('Código de seis dígitos').fill('111111');
 await page.getByRole('button',{name:'Verificar y entrar'}).click();
 await expect(page.getByRole('heading',{name:'Tu plataforma, en perspectiva'})).toBeVisible();
 expect(errors).toEqual([]);
});
