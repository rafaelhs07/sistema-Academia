import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
 testDir:'tests/e2e',testMatch:'**/*.spec.ts',fullyParallel:false,workers:1,timeout:60000,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://localhost:3100',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}],
 webServer:[
  {command:'node tests/e2e/supabase-fixture.mjs',url:'http://127.0.0.1:54321/health',reuseExistingServer:!process.env.CI,timeout:90000},
  {command:'npx next dev -p 3100',url:'http://localhost:3100/login',reuseExistingServer:!process.env.CI,timeout:90000,env:{ACADEMIA_E2E:'true',SUPABASE_SECRET_KEY:'test-only-admin',CRON_SECRET:'',ENABLE_BILLING_CRON:'false',ENABLE_PLATFORM_BILLING_CRON:'false',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-only-publishable',NEXT_PUBLIC_APP_URL:'http://localhost:3100'}},
 ],
});
