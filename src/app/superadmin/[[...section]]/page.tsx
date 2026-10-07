import { redirect,notFound } from 'next/navigation';
import { platformContext } from '@/lib/platform';
import { PlatformWorkspace } from '@/components/platform-workspace';
export default async function Page({params,searchParams}:{params:Promise<{section?:string[]}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {mfaRequired}=await platformContext(false);if(mfaRequired)redirect('/superadmin/mfa');
 const segments=(await params).section??[];const section=segments[0]??'panorama';if(!['panorama','negocios','planes','cobros','ajustes','historial'].includes(section)||segments.length>2||(segments.length===2&&section!=='negocios'))notFound();
 return <PlatformWorkspace key={`${section}:${segments[1]??''}`} section={section} businessId={segments[1]} initialFilters={await searchParams}/>;
}
