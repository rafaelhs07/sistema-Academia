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
const admin=crypto.randomUUID(),factor=crypto.randomUUID();
await db.query('insert into auth.users(id,email) values($1,$2)',[admin,'admin@test.invalid']);
await db.query("select public.bootstrap_superadmin($1,'Nombramiento autorizado en fixture')",[admin]);
await db.query("insert into auth.mfa_factors(id,user_id,status) values($1,$2,'verified')",[factor,admin]);
const users=new Map(),invites=new Map(),files=new Map();
function token(uid=owner,aal='aal1'){const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const payload=Buffer.from(JSON.stringify({sub:uid,aal,amr:[{method:aal==='aal2'?'totp':'password',timestamp:Math.floor(Date.now()/1000)}],aud:'authenticated',role:'authenticated',email:users.get(uid)?.email??'owner@test.invalid',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,iss:'http://127.0.0.1:54321/auth/v1',session_id:crypto.randomUUID()})).toString('base64url');return `${header}.${payload}.${createHmac('sha256','isolated-test-key').update(`${header}.${payload}`).digest('base64url')}`;}
const user={id:owner,aud:'authenticated',role:'authenticated',email:'owner@test.invalid',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{},user_metadata:{}};
users.set(owner,user);users.set(admin,{...user,id:admin,email:'admin@test.invalid',factors:[{id:factor,factor_type:'totp',status:'verified',friendly_name:'Prueba aislada',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}]});
function claims(req){const jwt=req.headers.authorization?.replace(/^Bearer /,'')??'';const parts=jwt.split('.');if(parts.length!==3||createHmac('sha256','isolated-test-key').update(parts[0]+'.'+parts[1]).digest('base64url')!==parts[2])return null;const payload=JSON.parse(Buffer.from(parts[1],'base64url'));return users.has(payload.sub)&&payload.exp>Date.now()/1000?payload:null;}
function session(uid,aal='aal1'){return {access_token:token(uid,aal),refresh_token:'test-refresh-'+uid+'-'+aal,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:users.get(uid)};}
const tables=new Set((await db.query("select table_name from information_schema.tables where table_schema='public'")).rows.map(r=>r.table_name));
const columns=new Map();for(const row of (await db.query("select table_name,column_name from information_schema.columns where table_schema='public'")).rows){if(!columns.has(row.table_name))columns.set(row.table_name,new Set());columns.get(row.table_name).add(row.column_name);}
const ident=name=>{if(!/^[a-z_][a-z0-9_]*$/.test(name))throw Error('Invalid identifier');return '"'+name+'"';};
const requireColumn=(table,column)=>{if(!columns.get(table)?.has(column))throw Error('Unknown column');return ident(column);};
async function rest(req,url,body){
 const parts=url.pathname.split('/');if(parts[3]==='rpc'){
  const fn=parts[4];const available=new Set(['operate','my_permissions','dashboard','instructor_directory','collection_breakdown','platform_identity','academy_service','platform_operate','platform_data','platform_logo','academy_recovery','academy_resume','platform_finish_invitation']);if(!available.has(fn))throw Error('Unavailable RPC');
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
 const url=new URL(req.url,'http://127.0.0.1:54321');const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'http://localhost:3100','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'};
 if(req.method==='OPTIONS'){res.writeHead(200,headers);res.end();return;}
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks),raw=bytes.toString();const body=raw&&String(req.headers['content-type']).includes('json')?JSON.parse(raw):{};
 if(url.pathname==='/health'){res.writeHead(200,headers);res.end(JSON.stringify({ok:true}));return;}
 if(url.pathname==='/test/context'){res.writeHead(200,headers);res.end(JSON.stringify({academy:a,branch,student:person,account,method,tariff}));return;}
 if(url.pathname==='/auth/v1/token'){const account=[...users.values()].find(u=>u.email===body.email);const refreshed=body.refresh_token?.match(/^test-refresh-(.{36})-(aal[12])$/);if(account&&body.password==='test-only-password-123'||refreshed&&users.has(refreshed[1])){res.writeHead(200,headers);res.end(JSON.stringify(session(account?.id??refreshed[1],refreshed?.[2]??'aal1')));}else{res.writeHead(400,headers);res.end(JSON.stringify({msg:'Invalid credentials',code:'invalid_credentials'}));}return;}
 if(url.pathname==='/auth/v1/user'){const jwt=claims(req);if(jwt){res.writeHead(200,headers);res.end(JSON.stringify(users.get(jwt.sub)));}else{res.writeHead(401,headers);res.end(JSON.stringify({msg:'No session'}));}return;}
 if(url.pathname==='/auth/v1/logout'){res.writeHead(204,headers);res.end();return;}
 const jwt=claims(req);const privileged=req.headers.authorization==='Bearer test-only-admin';
 if(url.pathname.startsWith('/storage/v1/object/')){const segments=url.pathname.slice('/storage/v1/object/'.length).split('/');if(['authenticated','sign'].includes(segments[0]))segments.shift();const bucket=segments.shift(),path=decodeURIComponent(segments.join('/')),fileKey=bucket+'/'+path;const task=queue.then(async()=>{try{await db.exec('begin');if(!jwt&&!privileged)throw Error('No session');if(!privileged){await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.aal',$2,true)",[jwt.sub,jwt.aal]);await db.exec('set local role authenticated');}if(req.method==='POST'&&!url.pathname.includes('/sign/')){await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',[bucket,path]);files.set(fileKey,{bytes,mime:req.headers['content-type']});await db.exec('commit');res.writeHead(200,headers);res.end(JSON.stringify({Id:crypto.randomUUID(),Key:fileKey}));}else{const visible=await db.query('select id from storage.objects where bucket_id=$1 and name=$2',[bucket,path]);if(!visible.rows.length||!files.has(fileKey))throw Error('Storage denied');const file=files.get(fileKey);await db.exec('commit');res.writeHead(200,{...headers,'Content-Type':file.mime});res.end(file.bytes);}}catch{await db.exec('rollback');res.writeHead(403,headers);res.end(JSON.stringify({error:'Storage access denied'}));}});queue=task.catch(()=>{});return;}
 if(url.pathname==='/auth/v1/admin/users'&&privileged){res.writeHead(200,headers);res.end(JSON.stringify({users:[...users.values()],aud:'authenticated',total:users.size,next_page:null,last_page:1}));return;}
 if(url.pathname.match(/^\/auth\/v1\/factors\/[^/]+\/challenge$/)&&jwt?.sub===admin){res.writeHead(200,headers);res.end(JSON.stringify({id:'test-challenge',expires_at:Math.floor(Date.now()/1000)+300}));return;}
 if(url.pathname.match(/^\/auth\/v1\/factors\/[^/]+\/verify$/)&&jwt?.sub===admin){res.writeHead(body.code==='111111'?200:400,headers);res.end(JSON.stringify(body.code==='111111'?session(admin,'aal2'):{msg:'Invalid test code',code:'mfa_verification_failed'}));return;}
 if(url.pathname==='/auth/v1/invite'&&privileged){const attempts=invites.get(body.email)??0;invites.set(body.email,attempts+1);if(body.email.startsWith('fallo')&&attempts===0){res.writeHead(500,headers);res.end(JSON.stringify({msg:'SMTP test unavailable',code:'unexpected_failure'}));return;}const task=queue.then(async()=>{const existing=[...users.values()].find(u=>u.email===body.email);const id=existing?.id??crypto.randomUUID();if(!existing){await db.query('insert into auth.users(id,email) values($1,$2)',[id,body.email]);users.set(id,{...user,id,email:body.email,email_confirmed_at:null});}res.writeHead(200,headers);res.end(JSON.stringify(users.get(id)));});queue=task.catch(()=>{});return;}
 if(!url.pathname.startsWith('/rest/v1/')){res.writeHead(404,headers);res.end('{}');return;}
 // Single connection transactions prevent request identity from interleaving.
 const task=queue.then(async()=>{try{
  await db.exec('begin');if(!jwt&&!privileged)throw Error('No session');await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.aal',$2,true)",[jwt?.sub??'',jwt?.aal??'aal1']);if(!privileged)await db.exec('set local role authenticated');const result=await rest(req,url,body);await db.exec('commit');res.writeHead(result.status,{...headers,...(result.range?{'Content-Range':result.range}:{})});res.end(JSON.stringify(result.body));
 }catch(error){await db.exec('rollback');res.writeHead(400,headers);res.end(JSON.stringify({message:error.message,code:error.code??'TEST_ERROR'}));}});
 queue=task.catch(()=>{});
});
server.listen(54321,'127.0.0.1',()=>console.log('Supabase test adapter: http://127.0.0.1:54321'));
process.on('SIGTERM',()=>server.close(async()=>{await db.close();process.exit();}));
