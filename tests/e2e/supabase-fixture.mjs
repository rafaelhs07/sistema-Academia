// Isolated test service. Never imported by application code or deployed.
// Auth is simulated; every REST operation uses PostgreSQL roles, RLS and the
// exact production migrations. This is not a replacement for hosted Auth tests.
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { database } from '../db-harness.ts';
const db=await database();const owner=crypto.randomUUID();
await db.query('insert into auth.users(id,email) values($1,$2)',[owner,'owner@test.invalid']);
const a=(await db.query("select public.bootstrap_academy($1,'Renegades pruebas','País ficticio','USD','America/Guatemala') a",[owner])).rows[0].a;
await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);`);
const branch=(await db.query("insert into public.branches(academy_id,name) values($1,'Central de prueba') returning id",[a])).rows[0].id;
const account=(await db.query("insert into public.accounts(academy_id,branch_id,name,kind) values($1,$2,'Caja recepción','recepcion') returning id",[a,branch])).rows[0].id;
const method=(await db.query("insert into public.payment_methods(academy_id,name,kind) values($1,'Efectivo','efectivo') returning id",[a])).rows[0].id;
await db.query("select public.operate($1,$2,'open_cash',$3::jsonb,$4)",[a,branch,JSON.stringify({account_id:account,opening_amount:'200.00'}),crypto.randomUUID()]);
const plan=(await db.query("insert into public.plans(academy_id,name,kind) values($1,'Mensual de prueba','ilimitado') returning id",[a])).rows[0].id;
const tariff=(await db.query("select public.operate($1,$2,'plan_version',$3::jsonb,$4) result",[a,branch,JSON.stringify({plan_id:plan,price:'100.00',months:1,valid_days:30,effective_on:'2026-01-01'}),crypto.randomUUID()])).rows[0].result.id;
const person=(await db.query("insert into public.students(academy_id,branch_id,name,phone,joined_on) values($1,$2,'Ana Martínez','8888 1111','2026-10-01') returning id",[a,branch])).rows[0].id;
await db.query("select public.operate($1,$2,'membership',$3::jsonb,$4)",[a,branch,JSON.stringify({student_id:person,plan_version_id:tariff,starts_on:'2026-10-01'}),crypto.randomUUID()]);
function token(){const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const payload=Buffer.from(JSON.stringify({sub:owner,aud:'authenticated',role:'authenticated',email:'owner@test.invalid',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,iss:'http://127.0.0.1:54321/auth/v1',session_id:crypto.randomUUID()})).toString('base64url');return `${header}.${payload}.${createHmac('sha256','isolated-test-key').update(`${header}.${payload}`).digest('base64url')}`;}
const user={id:owner,aud:'authenticated',role:'authenticated',email:'owner@test.invalid',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{},user_metadata:{}};
const tables=new Set((await db.query("select table_name from information_schema.tables where table_schema='public'")).rows.map(r=>r.table_name));
const columns=new Map();for(const row of (await db.query("select table_name,column_name from information_schema.columns where table_schema='public'")).rows){if(!columns.has(row.table_name))columns.set(row.table_name,new Set());columns.get(row.table_name).add(row.column_name);}
const ident=name=>{if(!/^[a-z_][a-z0-9_]*$/.test(name))throw Error('Invalid identifier');return '"'+name+'"';};
const requireColumn=(table,column)=>{if(!columns.get(table)?.has(column))throw Error('Unknown column');return ident(column);};
async function rest(req,url,body){
 const parts=url.pathname.split('/');if(parts[3]==='rpc'){
  const fn=parts[4];const available=new Set(['operate','my_permissions','dashboard','instructor_directory','collection_breakdown']);if(!available.has(fn))throw Error('Unavailable RPC');
  const args=Object.entries(body);const call=`public.${ident(fn)}(${args.map(([key],i)=>`${ident(key)}=>$${i+1}`).join(',')})`;const listed=['instructor_directory','collection_breakdown'].includes(fn);const result=await db.query(listed?`select to_jsonb(t) result from ${call} t`:`select ${call} result`,args.map(([,value])=>value&&typeof value==='object'?JSON.stringify(value):value));
  return {body:['instructor_directory','collection_breakdown'].includes(fn)?result.rows.map(row=>row.result):result.rows[0]?.result,status:200};
 }
 const table=parts[3];if(!tables.has(table))throw Error('Unknown table');const values=[],filters=[];
 for(const [field,expression] of url.searchParams){if(['select','order','limit','offset','on_conflict'].includes(field))continue;if(field==='or'){const parts=expression.replace(/^\(|\)$/g,'').split(',').map(part=>{const match=part.match(/^([a-z_]+)\.ilike\.(.*)$/);if(!match)throw Error('Invalid OR');values.push(match[2]);return `${requireColumn(table,match[1])} ilike $${values.length}`;});filters.push('('+parts.join(' or ')+')');continue;}const column=requireColumn(table,field);const dot=expression.indexOf('.');const operation=expression.slice(0,dot),value=expression.slice(dot+1);if(operation==='in'){const list=value.replace(/^\(|\)$/g,'').split(',');filters.push(`${column} in (${list.map(v=>{values.push(v);return '$'+values.length;}).join(',')})`);}else{const operators={eq:'=',gte:'>=',lte:'<=',gt:'>',lt:'<',ilike:'ilike',neq:'<>'};if(!operators[operation])throw Error('Invalid filter');values.push(value);filters.push(`${column} ${operators[operation]} $${values.length}`);}}
 const where=filters.length?' where '+filters.join(' and '):'';
 if(req.method==='GET'){
  const selection=url.searchParams.get('select')??'*';const selected=selection==='*'?'*':selection.split(',').map(column=>requireColumn(table,column)).join(',');
  const order=url.searchParams.get('order')?.split('.');const ordering=order?` order by ${requireColumn(table,order[0])} ${order[1]==='desc'?'desc':'asc'}`:'';
  const range=String(req.headers.range??'0-49').split('-').map(Number);const offset=Number(url.searchParams.get('offset')??range[0]);const limit=Math.min(10000,Number(url.searchParams.get('limit')??((range[1]??49)-range[0]+1)));
  const result=await db.query(`select ${selected} from public.${ident(table)}${where}${ordering} limit ${limit} offset ${offset}`,values);const count=(await db.query(`select count(*)::int count from public.${ident(table)}${where}`,values)).rows[0].count;
  return {body:req.headers.accept?.includes('vnd.pgrst.object')?result.rows[0]??null:result.rows,status:200,range:`${offset}-${offset+result.rows.length-1}/${count}`};
 }
 if(!['POST','PATCH'].includes(req.method))throw Error('Unavailable method');const entries=Object.entries(body);const keys=entries.map(([key])=>requireColumn(table,key));const dataValues=entries.map(([,value])=>value);
 let result;if(req.method==='POST')result=await db.query(`insert into public.${ident(table)}(${keys.join(',')}) values(${entries.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,dataValues);
 else result=await db.query(`update public.${ident(table)} set ${keys.map((key,i)=>`${key}=$${values.length+i+1}`).join(',')}${where} returning *`,[...values,...dataValues]);
 return {body:req.headers.accept?.includes('vnd.pgrst.object')?result.rows[0]:result.rows,status:201};
}
let queue=Promise.resolve();
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:54321');const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'http://localhost:3100','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'};
 if(req.method==='OPTIONS'){res.writeHead(200,headers);res.end();return;}
 let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};
 if(url.pathname==='/health'){res.writeHead(200,headers);res.end(JSON.stringify({ok:true}));return;}
 if(url.pathname==='/test/context'){res.writeHead(200,headers);res.end(JSON.stringify({academy:a,branch,student:person,account,method,tariff}));return;}
 if(url.pathname==='/auth/v1/token'){if(body.email==='owner@test.invalid'&&body.password==='test-only-password-123'||body.refresh_token){res.writeHead(200,headers);res.end(JSON.stringify({access_token:token(),refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user}));}else{res.writeHead(400,headers);res.end(JSON.stringify({msg:'Invalid credentials',code:'invalid_credentials'}));}return;}
 if(url.pathname==='/auth/v1/user'){if(req.headers.authorization?.startsWith('Bearer ey')){res.writeHead(200,headers);res.end(JSON.stringify(user));}else{res.writeHead(401,headers);res.end(JSON.stringify({msg:'No session'}));}return;}
 if(url.pathname==='/auth/v1/logout'){res.writeHead(204,headers);res.end();return;}
 if(!url.pathname.startsWith('/rest/v1/')){res.writeHead(404,headers);res.end('{}');return;}
 // Single connection transactions prevent request identity from interleaving.
 const task=queue.then(async()=>{try{
  await db.exec('begin');if(!req.headers.authorization?.startsWith('Bearer ey'))throw Error('No session');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);await db.exec('set local role authenticated');const result=await rest(req,url,body);await db.exec('commit');res.writeHead(result.status,{...headers,...(result.range?{'Content-Range':result.range}:{})});res.end(JSON.stringify(result.body));
 }catch(error){await db.exec('rollback');res.writeHead(400,headers);res.end(JSON.stringify({message:error.message,code:error.code??'TEST_ERROR'}));}});
 queue=task.catch(()=>{});
});
server.listen(54321,'127.0.0.1',()=>console.log('Supabase test adapter: http://127.0.0.1:54321'));
process.on('SIGTERM',()=>server.close(async()=>{await db.close();process.exit();}));
