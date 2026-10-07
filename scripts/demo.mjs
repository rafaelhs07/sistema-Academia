// Explicit isolated demonstration: no application/production credentials.
import { spawn } from 'node:child_process';
const env={...process.env,ACADEMIA_E2E:'true',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-only-publishable',NEXT_PUBLIC_APP_URL:'http://localhost:3100',SUPABASE_SECRET_KEY:'',CRON_SECRET:'',ENABLE_BILLING_CRON:'false'};
const fixture=spawn(process.execPath,['tests/e2e/supabase-fixture.mjs'],{stdio:'inherit',env});
let app;
const stop=()=>{fixture.kill();app?.kill();};process.on('SIGINT',stop);process.on('SIGTERM',stop);
let ready=false;
for(let i=0;i<60;i++){if(fixture.exitCode!==null)throw Error('No se pudo iniciar la base ficticia.');try{const response=await fetch('http://127.0.0.1:54321/health');if(response.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
if(!ready){stop();throw Error('La base ficticia no respondió a tiempo.');}
app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p','3100'],{stdio:'inherit',env});app.on('exit',stop);
console.log('Demostración aislada: http://localhost:3100 · owner@test.invalid · test-only-password-123');
