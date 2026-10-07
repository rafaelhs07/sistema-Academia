import { redirect,notFound } from 'next/navigation';
import { getContext,requirePermission,BusinessServiceError } from '@/lib/context';
import { configured } from '@/lib/supabase/server';
import { modules } from '@/domains/catalog';
import { Workspace } from '@/components/workspace';
import Link from 'next/link';
import type { AppContext } from '@/lib/context';
export const dynamic='force-dynamic';
export default async function Panel({params,searchParams}:{params:Promise<{module:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 if(!configured())redirect('/login');
 const {module:id}=await params;const section=modules.find(m=>m.id===id);if(!section)notFound();
 const search=await searchParams;
 let context:AppContext|undefined;
 try{const result=await getContext(search.academy,search.branch);requirePermission(result.context,section.permission);context=result.context;}
 catch(error){if(error instanceof BusinessServiceError)redirect(`/servicio?academy=${error.academyId}`);if(String(error).includes('AUTH_REQUIRED'))redirect('/login');if(String(error).includes('ACCESS_REQUIRED'))redirect('/access');}
 if(!context)return <main className="standalone"><div className="card"><h1>Acceso no disponible</h1><p>No tienes permiso para esta sección o la conexión no está disponible.</p><Link className="btn" href="/panel/inicio">Volver al inicio</Link></div></main>;
 return <Workspace key={`${id}:${context.academy.id}:${context.branch}:${search.student??''}`} context={context} moduleId={id} initialResource={search.tab} studentId={search.student}/>;
}
