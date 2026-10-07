import 'server-only';
import { createSupabase } from './supabase/server';
import { allowed } from './money';
import { uuid } from './validation';
import type { Database } from './supabase/database.types';
export type Academy={id:string;name:string;country:string;currency:string;timezone:string;primary_color:string;contact:string|null;receipt_footer:string|null;grace_days:number;expense_approval_limit:number;collection_template:string;proration_policy:string;pause_policy:string;cancel_policy:string;locale:string;logo_document_id:string|null;reservation_hours:number;max_discount_percent:number};
export type Branch=Pick<Database['public']['Tables']['branches']['Row'],'id'|'name'>;
export type AppContext={academy:Academy;academies:Academy[];branches:Branch[];branch:string|null;permissions:string[];user:{id:string;email?:string};name:string};
export async function getContext(academyId?:string|null,branchId?:string|null) {
 const client=await createSupabase();const {data:{user},error}=await client.auth.getUser();
 if(error||!user)throw Error('AUTH_REQUIRED');
 const members=await client.from('internal_members').select('academy_id,name,all_branches,branch_ids').eq('user_id',user.id).eq('active',true);
 if(members.error)throw Error(members.error.message);
 if(!members.data?.length)throw Error('ACCESS_REQUIRED');
 const academy=academyId?uuid.parse(academyId):members.data[0].academy_id;
 const member=members.data.find(m=>m.academy_id===academy);if(!member)throw Error('No tienes acceso a esta academia.');
 const [a,p,b]=await Promise.all([client.from('academies').select('*').in('id',members.data.map(m=>m.academy_id)),client.rpc('my_permissions',{p_academy:academy}),client.from('branches').select('id,name').eq('academy_id',academy).eq('active',true).order('name')]);
 if(a.error||p.error||b.error)throw Error(a.error?.message??p.error?.message??b.error?.message);
 const selected=(a.data as Academy[]).find(x=>x.id===academy);if(!selected)throw Error('ACCESS_REQUIRED');
 const branches=(b.data as Branch[]).filter(x=>member.all_branches||(member.branch_ids as string[]).includes(x.id));
 const branch=branchId==='all'?null:branchId?uuid.parse(branchId):(branches[0]?.id??null);
 if(branch&&!branches.some(b=>b.id===branch))throw Error('Sucursal no autorizada.');
 const context:AppContext={academy:selected,academies:a.data as Academy[],branches,branch,permissions:p.data as string[],user:{id:user.id,email:user.email},name:member.name};
 return {client,context};
}
export function requirePermission(context:AppContext,permission:string) {if(!allowed(context.permissions,permission))throw Error('No tienes permiso para esta operación.');}
