import { beforeAll,afterAll,it,expect } from 'vitest';
import { database,identity,rpc } from './db-harness';
import type { PGlite } from '@electric-sql/pglite';
let db:PGlite,a:string,b:string,bank:string,method:string,variant:string,employee:string;const owner=crypto.randomUUID();
async function insert(table:string,values:Record<string,unknown>){const entries=Object.entries(values);return(await db.query<{id:string}>(`insert into public.${table}(${entries.map(([k])=>k).join(',')}) values(${entries.map((_,i)=>'$'+(i+1)).join(',')}) returning id`,entries.map(([,v])=>v))).rows[0].id;}
beforeAll(async()=>{db=await database();await db.query('insert into auth.users(id,email) values($1,$2)',[owner,'workflows@test.invalid']);a=(await db.query<{a:string}>("select public.bootstrap_academy($1,'Flujos','Prueba','NIO','America/Managua') a",[owner])).rows[0].a;await identity(db,owner);b=await insert('branches',{academy_id:a,name:'Central'});bank=await insert('accounts',{academy_id:a,branch_id:b,name:'Banco',kind:'banco'});method=await insert('payment_methods',{academy_id:a,name:'Tarjeta',kind:'tarjeta'});const product=await insert('products',{academy_id:a,name:'Gi'});variant=await insert('product_variants',{academy_id:a,product_id:product,name:'Azul',code:'GI',price:50});await rpc(db,a,b,'inventory_adjustment',{variant_id:variant,quantity:10,unit_cost:'20.00',reason:'Inventario inicial'});employee=await insert('employees',{academy_id:a,branch_id:b,name:'Vendedor',position:'Instructor',linked_user_id:owner});await rpc(db,a,b,'compensation',{employee_id:employee,effective_on:'2026-01-01',fixed_amount:'0.00',hourly_rate:'10.00',class_rate:'20.00',sale_percent:10,private_percent:20,accrual:'cobro'});});
afterAll(async()=>{await db?.close();});
it('venta cobra productos y deuda existente sin duplicar el cargo y revierte comisión al devolver',async()=>{
 const charge=(await rpc(db,a,b,'charge',{amount:'100.00',description:'Mensualidad existente',due_on:'2026-10-07'})).id;
 const sale=await rpc(db,a,b,'sale',{due_on:'2026-10-07',lines:[{variant_id:variant,quantity:1}],existing_charges:[{charge_id:charge,amount:'25.00'}],payments:[{account_id:bank,method_id:method,amount:'75.00'}]});
 expect(Number((await db.query<{balance:string}>('select balance from public.charge_balances where id=$1',[charge])).rows[0].balance)).toBe(75);
 expect((await db.query('select id from public.charges')).rows).toHaveLength(2);
 expect(Number((await db.query<{earned:string}>('select earned from public.staff_activities where source_id=(select id from public.payments limit 1)')).rows[0].earned)).toBe(5);
 const line=(await db.query<{id:string}>('select id from public.sale_lines where sale_id=$1',[sale.id])).rows[0].id;await rpc(db,a,b,'return_sale',{line_id:line,quantity:1,reason:'Devolución'});
 expect(Number((await db.query<{earned:string}>('select sum(earned) earned from public.staff_activities')).rows[0].earned)).toBe(0);
 expect(Number((await db.query<{balance:string}>('select balance from public.account_balances where id=$1',[bank])).rows[0].balance)).toBe(25);
});
it('devolución al proveedor reduce existencias y obligación con ajuste histórico',async()=>{
 const supplier=await insert('suppliers',{academy_id:a,name:'Proveedor'});const purchase=await rpc(db,a,b,'purchase',{supplier_id:supplier,ordered_on:'2026-10-07',due_on:'2026-10-31',lines:[{variant_id:variant,quantity:2,unit_cost:'30.00'}]});const line=(await db.query<{id:string}>('select id from public.purchase_lines where purchase_id=$1',[purchase.id])).rows[0].id;
 await rpc(db,a,b,'receive_purchase',{line_id:line,quantity:2});await rpc(db,a,b,'return_purchase',{line_id:line,quantity:1,reason:'Producto dañado'});
 expect(Number((await db.query<{balance:string}>('select balance from public.expense_balances where id=$1',[purchase.id])).rows[0].balance)).toBe(30);expect(Number((await db.query<{amount:string}>('select amount from public.expenses where id=$1',[purchase.id])).rows[0].amount)).toBe(60);
 await expect(rpc(db,a,b,'return_purchase',{line_id:line,quantity:2,reason:'Exceso'})).rejects.toThrow('superior');
});
it('compra pagada admite devolución únicamente con dinero recibido confirmado',async()=>{
 const supplier=await insert('suppliers',{academy_id:a,name:'Proveedor pagado'});const purchase=await rpc(db,a,b,'purchase',{supplier_id:supplier,ordered_on:'2026-10-07',due_on:'2026-10-31',lines:[{variant_id:variant,quantity:2,unit_cost:'10.00'}]});const line=(await db.query<{id:string}>('select id from public.purchase_lines where purchase_id=$1',[purchase.id])).rows[0].id;
 await rpc(db,a,b,'receive_purchase',{line_id:line,quantity:2});await rpc(db,a,b,'approve_expense',{expense_id:purchase.id});await rpc(db,a,b,'pay_expense',{expense_id:purchase.id,account_id:bank,amount:'20.00'});
 await expect(rpc(db,a,b,'return_purchase',{line_id:line,quantity:1,reason:'Defecto'})).rejects.toThrow('recepción real');
 const before=Number((await db.query<{balance:string}>('select balance from public.account_balances where id=$1',[bank])).rows[0].balance);await rpc(db,a,b,'return_purchase',{line_id:line,quantity:1,reason:'Defecto',supplier_refund_confirmed:true,refund_account_id:bank,reference:'Transferencia recibida de prueba'});
 expect(Number((await db.query<{balance:string}>('select balance from public.account_balances where id=$1',[bank])).rows[0].balance)).toBe(before+10);expect(Number((await db.query<{balance:string}>('select balance from public.expense_balances where id=$1',[purchase.id])).rows[0].balance)).toBe(0);
});
it('beca completa genera cargos cero recurrentes sin deuda ni duplicados',async()=>{
 const student=await insert('students',{academy_id:a,branch_id:b,name:'Beca'});const plan=await insert('plans',{academy_id:a,name:'Beca completa',kind:'ilimitado'});const version=await rpc(db,a,b,'plan_version',{plan_id:plan,price:'50.00',months:1,valid_days:30,effective_on:'2026-01-01'});const membership=await rpc(db,a,b,'membership',{student_id:student,plan_version_id:version.id,starts_on:'2026-01-31',discount:'50.00'});
 await rpc(db,a,null,'billing_run',{cutoff:'2026-03-31'});await rpc(db,a,null,'billing_run',{cutoff:'2026-03-31'});const charges=(await db.query<{amount:string}>('select amount from public.charges where membership_id=$1',[membership.id])).rows;expect(charges).toHaveLength(3);expect(charges.every(c=>Number(c.amount)===0)).toBe(true);
});
it('archivos y reportes deniegan acceso entre academias con llamadas directas',async()=>{
 await db.exec('reset role');await db.query("insert into storage.objects(bucket_id,name) values('academy-private',$1)",[`${a}/${b}/privado.pdf`]);const other=crypto.randomUUID();await db.query('insert into auth.users(id,email) values($1,$2)',[other,'other-assets@test.invalid']);await db.query("select public.bootstrap_academy($1,'Otra','Prueba','USD','UTC')",[other]);await identity(db,other);
 expect((await db.query('select * from storage.objects')).rows).toHaveLength(0);await expect(db.query("select public.dashboard($1,$2,'2026-01-01','2026-12-31')",[a,b])).rejects.toThrow('permiso');expect((await db.query('select public.logo_path($1)',[a])).rows[0]).toEqual({logo_path:null});await identity(db,owner);
});
it('numeración conserva prefijo histórico y bloquea volver a números emitidos',async()=>{
 await rpc(db,a,b,'numbering',{kind:'recibo',next_number:100,prefix:'R-'});const payment=await rpc(db,a,b,'payment',{account_id:bank,method_id:method,amount:'1.00'});
 const p=(await db.query<{receipt_prefix:string;receipt_number:string}>('select receipt_prefix,receipt_number from public.payments where id=$1',[payment.id])).rows[0];expect(p.receipt_prefix).toBe('R-');expect(Number(p.receipt_number)).toBe(100);await expect(rpc(db,a,b,'numbering',{kind:'recibo',next_number:100,prefix:'X-'})).rejects.toThrow('superar');
});
it('cambio de producto revierte toda la devolución si falla la nueva venta',async()=>{
 const sale=await rpc(db,a,b,'sale',{due_on:'2026-10-07',lines:[{variant_id:variant,quantity:1}],payments:[{account_id:bank,method_id:method,amount:'50.00'}]});const line=(await db.query<{id:string}>('select id from public.sale_lines where sale_id=$1',[sale.id])).rows[0].id;
 const data={return:[{line_id:line,quantity:1,reason:'Cambio'}],sale:[{due_on:'2026-10-07',lines:[{variant_id:crypto.randomUUID(),quantity:1}],payments:[]}]};
 await expect(rpc(db,a,b,'exchange_sale',data)).rejects.toThrow('inválidos');expect(Number((await db.query<{returned:string}>('select returned from public.sale_lines where id=$1',[line])).rows[0].returned)).toBe(0);
 const result=await rpc(db,a,b,'exchange_sale',{...data,sale:[{due_on:'2026-10-07',lines:[{variant_id:variant,quantity:1}],payments:[{account_id:bank,method_id:method,amount:'50.00'}]}]});expect(result.sale).toBeTruthy();expect(Number((await db.query<{returned:string}>('select returned from public.sale_lines where id=$1',[line])).rows[0].returned)).toBe(1);
});
it('logotipo tiene acceso limitado al archivo asignado y el descuento máximo afecta la venta',async()=>{
 const document=await insert('documents',{academy_id:a,branch_id:b,title:'Logo',path:`${a}/${b}/logo.png`,mime_type:'image/png',size_bytes:100});await rpc(db,a,b,'academy_logo',{document_id:document});
 expect((await db.query<{path:string}>('select public.logo_path($1) path',[a])).rows[0].path).toContain('logo.png');
 const settings=(await db.query<Record<string,unknown>>('select * from public.academies where id=$1',[a])).rows[0];await rpc(db,a,b,'academy_settings',{...settings,max_discount_percent:5});
 await expect(rpc(db,a,b,'sale',{due_on:'2026-10-07',discount:'10.00',lines:[{variant_id:variant,quantity:1}],payments:[]})).rejects.toThrow('límite');
});
