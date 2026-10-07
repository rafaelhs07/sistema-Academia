import 'server-only';
import { createClient } from '@supabase/supabase-js';
export function adminClient() {
 if(!process.env.SUPABASE_SECRET_KEY)throw Error('Esta función requiere configurar la clave de servidor.');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
