import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { database,identity,rpc } from './db-harness';
import type { PGlite } from '@electric-sql/pglite';
let db:PGlite,a:string,a2:string,b:string,student:string,student2:string,plan:string,version:string,account:string,bank:string,cash:string,transfer:string;
const owner=crypto.randomUUID(),owner2=crypto.randomUUID();
async function insert(table:string,values:Record<string,unknown>) {
 const entries=Object.entries(values); const result=await db.query<{id:string}>(`insert into public.${table}(${entries.map(([k])=>k).join(',')}) values(${entries.map((_,i)=>`$${i+1}`).join(',')}) returning id`,entries.map(([,v])=>v)); return result.rows[0].id;
}
beforeAll(async()=>{
 db=await database();
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[owner,'owner@test.invalid',owner2,'other@test.invalid']);
 const result=await db.query<{a:string,a2:string}>(`select public.bootstrap_academy($1,'Renegades prueba','País de prueba','USD','America/Guatemala') a,public.bootstrap_academy($2,'Academia dos','País de prueba','USD','UTC') a2`,[owner,owner2]);a=result.rows[0].a;a2=result.rows[0].a2;
 await identity(db,owner);
 b=await insert('branches',{academy_id:a,name:'Central'});
 student=await insert('students',{academy_id:a,branch_id:b,name:'Ana Prueba'}); student2=await insert('students',{academy_id:a,branch_id:b,name:'Bruno Prueba'});
 plan=await insert('plans',{academy_id:a,name:'Mensual',kind:'ilimitado'});
 version=(await rpc(db,a,b,'plan_version',{plan_id:plan,price:'100.00',months:1,valid_days:30,effective_on:'2026-01-01'})).id as string;
 account=await insert('accounts',{academy_id:a,branch_id:b,name:'Recepción',kind:'recepcion'});bank=await insert('accounts',{academy_id:a,branch_id:b,name:'Banco',kind:'banco'});
 cash=await insert('payment_methods',{academy_id:a,name:'Efectivo',kind:'efectivo'});transfer=await insert('payment_methods',{academy_id:a,name:'Transferencia',kind:'transferencia',requires_verification:true});
 await rpc(db,a,b,'open_cash',{account_id:account,opening_amount:'500.00'});
});
afterAll(async()=>{await db?.close();});
describe('instalación, cobranza e integridad',()=>{
 it('instala todas las migraciones y activa RLS en todas las tablas públicas',async()=>{
  const r=await db.query<{count:number}>('select count(*)::int count from pg_tables where schemaname=\'public\' and not rowsecurity');expect(r.rows[0].count).toBe(0);
 });
 it('inscribe, asigna plan, genera cargo y recibe abono',async()=>{
  await rpc(db,a,b,'membership',{student_id:student,plan_version_id:version,starts_on:'2026-01-31'});
  const charge=(await db.query<{id:string}>('select id from public.charges where student_id=$1',[student])).rows[0].id;
  await rpc(db,a,b,'payment',{student_id:student,account_id:account,method_id:cash,amount:'40.00',applications:[{charge_id:charge,amount:'40.00'}]});
  const r=await db.query<{balance:string}>('select balance from public.charge_balances where id=$1',[charge]);expect(Number(r.rows[0].balance)).toBe(60);
 });
 it('liquida saldo restante; reintentar no duplica cobros',async()=>{
  const charge=(await db.query<{id:string}>('select id from public.charges where student_id=$1',[student])).rows[0].id;const key=crypto.randomUUID();
  const data={account_id:account,method_id:cash,amount:'60.00',applications:[{charge_id:charge,amount:'60.00'}]};
  const first=await rpc(db,a,b,'payment',data,key);const again=await rpc(db,a,b,'payment',data,key);expect(again.id).toBe(first.id);
  expect(Number((await db.query<{balance:string}>('select balance from public.charge_balances where id=$1',[charge])).rows[0].balance)).toBe(0);
  await expect(rpc(db,a,b,'payment',{...data,amount:'61.00'},key)).rejects.toThrow('reintento');
 });
 it('pago familiar distribuido sin exceder pago o deuda',async()=>{
  const c1=(await rpc(db,a,b,'charge',{student_id:student,description:'Familiar A',amount:'25.00',due_on:'2026-02-01'})).id;
  const c2=(await rpc(db,a,b,'charge',{student_id:student2,description:'Familiar B',amount:'35.00',due_on:'2026-02-01'})).id;
  await rpc(db,a,b,'payment',{account_id:account,method_id:cash,amount:'60.00',applications:[{charge_id:c1,amount:'25.00'},{charge_id:c2,amount:'35.00'}]});
  const r=await db.query<{balance:string}>('select balance from public.charge_balances where id=$1 or id=$2',[c1,c2]);expect(r.rows.every(x=>Number(x.balance)===0)).toBe(true);
  await expect(rpc(db,a,b,'payment',{account_id:account,method_id:cash,amount:'1.00',applications:[{charge_id:c1,amount:'1.00'}]})).rejects.toThrow('saldo');
 });
 it('transferencia pendiente mantiene deuda; confirmación registra dinero una vez',async()=>{
  const c=(await rpc(db,a,b,'charge',{student_id:student,description:'Transferencia',amount:'80.00',due_on:'2026-02-01'})).id;
  const p=await rpc(db,a,b,'payment',{account_id:bank,method_id:transfer,amount:'80.00',reference:'BAN-01',applications:[{charge_id:c,amount:'80.00'}]});
  expect(Number((await db.query<{balance:string}>('select balance from public.charge_balances where id=$1',[c])).rows[0].balance)).toBe(80);
  await rpc(db,a,b,'confirm_payment',{payment_id:p.id});await rpc(db,a,b,'confirm_payment',{payment_id:p.id});
  expect(Number((await db.query<{balance:string}>('select balance from public.charge_balances where id=$1',[c])).rows[0].balance)).toBe(0);
  expect(Number((await db.query<{balance:string}>('select balance from public.account_balances where id=$1',[bank])).rows[0].balance)).toBe(80);
 });
 it('recupera períodos, respeta fin de mes y no duplica; nuevas tarifas conservan historial',async()=>{
  await rpc(db,a,null,'billing_run',{cutoff:'2026-04-30'});await rpc(db,a,null,'billing_run',{cutoff:'2026-04-30'});
  const r=await db.query<{period_on:string,amount:string}>('select period_on::text,amount from public.charges where membership_id is not null order by period_on');
  expect(r.rows.map(x=>x.period_on)).toEqual(['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
  await rpc(db,a,b,'plan_version',{plan_id:plan,price:'120.00',months:1,valid_days:30,effective_on:'2026-05-01'});await rpc(db,a,null,'billing_run',{cutoff:'2026-05-31'});
  const next=await db.query<{amount:string}>('select amount from public.charges where membership_id is not null order by period_on');expect(next.rows.map(x=>Number(x.amount))).toEqual([100,100,100,100,120]);
 });
 it('transferencia interna tiene dos lados y no aumenta ingresos',async()=>{
  await rpc(db,a,b,'transfer',{from_account_id:account,to_account_id:bank,amount:'50.00',reason:'Depósito'});
  const r=await db.query<{sum:string,count:number}>("select sum(amount)::text,count(*)::int from public.account_movements where kind='transferencia'");expect(Number(r.rows[0].sum)).toBe(0);expect(r.rows[0].count).toBe(2);
 });
 it('gasto pendiente no mueve saldo; aprobación y pagos parciales no duplican egresos',async()=>{
  const e=await rpc(db,a,b,'expense',{description:'Renta',category:'Local',amount:'60.00',due_on:'2026-02-01',incurred_on:'2026-02-01'});
  await expect(rpc(db,a,b,'pay_expense',{expense_id:e.id,account_id:account,amount:'10.00'})).rejects.toThrow('aprobación');
  await rpc(db,a,b,'approve_expense',{expense_id:e.id});await rpc(db,a,b,'pay_expense',{expense_id:e.id,account_id:account,amount:'10.00'});await rpc(db,a,b,'pay_expense',{expense_id:e.id,account_id:account,amount:'50.00'});
  expect(Number((await db.query<{balance:string}>('select balance from public.expense_balances where id=$1',[e.id])).rows[0].balance)).toBe(0);
  await expect(rpc(db,a,b,'pay_expense',{expense_id:e.id,account_id:account,amount:'1.00'})).rejects.toThrow('saldo');
 });
 it('impide escrituras financieras directas, lecturas cruzadas y cambios de academia',async()=>{
  await expect(db.query('update public.payments set amount=1')).rejects.toThrow('permission denied');
  await identity(db,owner2);expect((await db.query('select * from public.students where academy_id=$1',[a])).rows).toHaveLength(0);
  await expect(rpc(db,a,b,'charge',{amount:'1.00',description:'Intrusión',due_on:'2026-01-01'})).rejects.toThrow('permiso');
  const b2=await insert('branches',{academy_id:a2,name:'Otra'});
  await expect(insert('students',{academy_id:a2,branch_id:b,name:'Cruce'})).rejects.toThrow();
  const other=await insert('students',{academy_id:a2,branch_id:b2,name:'Otro'});
  await expect(db.query('update public.students set academy_id=$1 where id=$2',[a,other])).rejects.toThrow('academia');
  await identity(db,owner);
 });
});
describe('ventas, inventario, clases y personal',()=>{
 let variant:string,line:string,sale:string,employee:string,room:string,discipline:string,classId:string,packageMember:string;
 it('venta recalcula precios, registra caja, costo y existencias; el cambio no es ingreso',async()=>{
  const product=await insert('products',{academy_id:a,name:'Kimono',kind:'venta'});
  variant=await insert('product_variants',{academy_id:a,product_id:product,name:'A2 blanco',code:'GI-A2',price:'50.00',min_stock:'1'});
  await rpc(db,a,b,'inventory_adjustment',{variant_id:variant,quantity:3,unit_cost:'20.00',reason:'Saldo inicial'});
  const r=await rpc(db,a,b,'sale',{student_id:student,due_on:'2026-10-07',lines:[{variant_id:variant,quantity:1}],payments:[{account_id:account,method_id:cash,amount:'50.00',tendered:'100.00'}]});sale=r.id as string;
  const stock=(await db.query<{quantity:string,average_cost:string}>('select quantity,average_cost from public.stock where variant_id=$1',[variant])).rows[0];expect(Number(stock.quantity)).toBe(2);expect(Number(stock.average_cost)).toBe(20);
  line=(await db.query<{id:string}>('select id from public.sale_lines where sale_id=$1',[sale])).rows[0].id;
  const payment=(await db.query<{amount:string,tendered:string}>('select p.amount,p.tendered from public.payments p join public.payment_applications pa on pa.payment_id=p.id where pa.charge_id=$1',[sale])).rows[0];expect(Number(payment.amount)).toBe(50);expect(Number(payment.tendered)).toBe(100);
 });
 it('devolución ajusta inventario, cargo y dinero en una sola transacción',async()=>{
  const before=Number((await db.query<{balance:string}>('select balance from public.account_balances where id=$1',[account])).rows[0].balance);
  await rpc(db,a,b,'return_sale',{line_id:line,quantity:1,reason:'Cambio de talla'});
  expect(Number((await db.query<{quantity:string}>('select quantity from public.stock where variant_id=$1',[variant])).rows[0].quantity)).toBe(3);
  expect(Number((await db.query<{balance:string}>('select balance from public.account_balances where id=$1',[account])).rows[0].balance)).toBe(before-50);
  expect(Number((await db.query<{balance:string}>('select balance from public.charge_balances where id=$1',[sale])).rows[0].balance)).toBe(0);
  await expect(rpc(db,a,b,'return_sale',{line_id:line,quantity:1,reason:'Repetida'})).rejects.toThrow('vendido');
 });
 it('dos solicitudes por la última unidad producen una venta y un rechazo',async()=>{
  await rpc(db,a,b,'inventory_adjustment',{variant_id:variant,quantity:-2,unit_cost:'20.00',reason:'Conteo físico'});
  const data={due_on:'2026-10-07',lines:[{variant_id:variant,quantity:1}],payments:[]};
  const outcomes=await Promise.allSettled([rpc(db,a,b,'sale',data),rpc(db,a,b,'sale',data)]);expect(outcomes.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(x=>x.status==='rejected')).toHaveLength(1);
  expect(Number((await db.query<{quantity:string}>('select quantity from public.stock where variant_id=$1',[variant])).rows[0].quantity)).toBe(0);
 });
 it('compra y recepciones parciales usan promedio ponderado',async()=>{
  const supplier=await insert('suppliers',{academy_id:a,name:'Proveedor de prueba'});
  const purchase=await rpc(db,a,b,'purchase',{supplier_id:supplier,ordered_on:'2026-10-01',due_on:'2026-10-31',lines:[{variant_id:variant,quantity:4,unit_cost:'30.00'}]});
  const pLine=(await db.query<{id:string}>('select id from public.purchase_lines where purchase_id=$1',[purchase.id])).rows[0].id;
  await rpc(db,a,b,'receive_purchase',{line_id:pLine,quantity:2});expect((await db.query<{status:string}>('select status from public.purchases where id=$1',[purchase.id])).rows[0].status).toBe('parcial');
  await rpc(db,a,b,'receive_purchase',{line_id:pLine,quantity:2});expect((await db.query<{status:string}>('select status from public.purchases where id=$1',[purchase.id])).rows[0].status).toBe('recibido');
  expect(Number((await db.query<{average_cost:string}>('select average_cost from public.stock where variant_id=$1',[variant])).rows[0].average_cost)).toBe(30);
 });
 it('conflictos de clases, capacidad y consumo único de paquete',async()=>{
  employee=await insert('employees',{academy_id:a,branch_id:b,name:'Instructor de prueba',position:'Instructor'});
  room=await insert('rooms',{academy_id:a,branch_id:b,name:'Tatami',capacity:10});discipline=await insert('disciplines',{academy_id:a,name:'Jiu jitsu'});
  classId=(await rpc(db,a,b,'class',{name:'Fundamentos',discipline_id:discipline,room_id:room,instructor_id:employee,starts_at:'2026-10-07T18:00:00Z',ends_at:'2026-10-07T19:00:00Z',capacity:1})).id as string;
  await expect(rpc(db,a,b,'class',{name:'Conflicto',discipline_id:discipline,room_id:room,instructor_id:employee,starts_at:'2026-10-07T18:30:00Z',ends_at:'2026-10-07T19:30:00Z',capacity:1})).rejects.toThrow('Conflicto');
  const pack=await insert('plans',{academy_id:a,name:'Dos clases',kind:'paquete'});const pv=(await rpc(db,a,b,'plan_version',{plan_id:pack,price:'40.00',months:1,valid_days:30,class_count:2,effective_on:'2026-10-01',renewable:false})).id;
  packageMember=(await rpc(db,a,b,'membership',{student_id:student2,plan_version_id:pv,starts_on:'2026-10-01'})).id as string;
  await rpc(db,a,b,'reservation',{class_id:classId,student_id:student2});await rpc(db,a,b,'reservation',{class_id:classId,student_id:student});
  const wait=(await db.query<{status:string}>('select status from public.reservations where student_id=$1 and class_id=$2',[student,classId])).rows[0];expect(wait.status).toBe('espera');
  const attendance={class_id:classId,student_id:student2,reason:'Excepción autorizada por deuda'};const first=await rpc(db,a,b,'attendance',attendance);expect((await rpc(db,a,b,'attendance',attendance)).id).toBe(first.id);
  expect(Number((await db.query<{remaining_classes:number}>('select remaining_classes from public.memberships where id=$1',[packageMember])).rows[0].remaining_classes)).toBe(1);
  await expect(rpc(db,a,b,'attendance',{class_id:classId,student_id:student,reason:'Excepción'})).rejects.toThrow('llena');
 });
 it('liquidación con condiciones históricas y pago no duplicado',async()=>{
  await rpc(db,a,b,'compensation',{employee_id:employee,effective_on:'2026-10-01',fixed_amount:'100.00',hourly_rate:'10.00',class_rate:'20.00',sale_percent:5,private_percent:10,accrual:'cobro'});
  const activity=await rpc(db,a,b,'staff_activity',{employee_id:employee,kind:'hora',units:2,activity_on:'2026-10-07'});await rpc(db,a,b,'approve_activity',{activity_id:activity.id});
  const settlement=await rpc(db,a,b,'settlement',{employee_id:employee,from_on:'2026-10-01',to_on:'2026-10-31'});
  expect(Number((await db.query<{total:string}>('select total from public.settlements where id=$1',[settlement.id])).rows[0].total)).toBe(120);
  await rpc(db,a,b,'approve_settlement',{settlement_id:settlement.id});const data={expense_id:settlement.id,account_id:account,amount:'120.00'};const key=crypto.randomUUID();await rpc(db,a,b,'pay_expense',data,key);await rpc(db,a,b,'pay_expense',data,key);
  await expect(rpc(db,a,b,'settlement',{employee_id:employee,from_on:'2026-10-07',to_on:'2026-10-31'})).rejects.toThrow('solapado');
 });
 it('permisos y desactivación se verifican aun con el mismo token',async()=>{
  const user=crypto.randomUUID();await db.exec('reset role');await db.query('insert into auth.users(id,email) values($1,$2)',[user,'instructor@test.invalid']);await identity(db,owner);
  const role=(await db.query<{id:string}>("select id from public.roles where academy_id=$1 and name='Instructor'",[a])).rows[0].id;
  await rpc(db,a,b,'user_access',{user_id:user,name:'Instructor',active:true,all_branches:false,branch_ids:[b],role_ids:[role]});
  await identity(db,user);await expect(rpc(db,a,b,'charge',{amount:'1.00',description:'Sin permiso',due_on:'2026-10-01'})).rejects.toThrow('permiso');
  await expect(rpc(db,a,b,'user_access',{user_id:user,name:'Auto ascenso',active:true,all_branches:true,branch_ids:[],role_ids:[]})).rejects.toThrow('permiso');
  expect((await db.query('select id from public.students')).rows.length).toBeGreaterThan(0);
  await identity(db,owner);await rpc(db,a,b,'user_access',{user_id:user,name:'Instructor',active:false,all_branches:false,branch_ids:[b],role_ids:[role]});
  await identity(db,user);expect((await db.query('select id from public.students')).rows).toHaveLength(0);await expect(rpc(db,a,b,'attendance',{class_id:classId,student_id:student})).rejects.toThrow('permiso');await identity(db,owner);
 });
 it('configuración real afecta aprobaciones y bloquea cambio de moneda',async()=>{
  const data={name:'Renegades prueba',country:'País de prueba',currency:'USD',timezone:'America/Guatemala',primary_color:'#215c50',grace_days:5,expense_approval_limit:'50.00',collection_template:'Hola {nombre}: {saldo}'};
  await rpc(db,a,null,'academy_settings',data);const e=await rpc(db,a,b,'expense',{description:'Gasto pequeño',category:'Prueba',amount:'10.00',incurred_on:'2026-10-07',due_on:'2026-10-07'});expect((await db.query<{status:string}>('select status from public.expenses where id=$1',[e.id])).rows[0].status).toBe('aprobado');
  await expect(rpc(db,a,null,'academy_settings',{...data,currency:'EUR'})).rejects.toThrow('moneda');
 });
 it('cierre con diferencia requiere justificación y no admite nuevos cobros',async()=>{
  const session=(await db.query<{id:string}>('select id from public.cash_sessions where account_id=$1 and closed_at is null',[account])).rows[0].id;
  await expect(rpc(db,a,b,'close_cash',{session_id:session,counted:'1.00'})).rejects.toThrow('Justifica');await rpc(db,a,b,'close_cash',{session_id:session,counted:'1.00',reason:'Diferencia de prueba'});
  await expect(rpc(db,a,b,'payment',{account_id:account,method_id:cash,amount:'1.00'})).rejects.toThrow('Abre tu sesión');
  await rpc(db,a,b,'approve_difference',{session_id:session,reason:'Aprobación de diferencia'});
  expect(Number((await db.query<{balance:string}>('select balance from public.account_balances where id=$1',[account])).rows[0].balance)).toBe(1);
 });
});
