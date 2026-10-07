import 'server-only';
import { adminClient } from './supabase/admin';
// Call only after checking the caller's live service/MFA and selecting the exact
// document or logo with their RLS client. Paths never come from download queries.
// Clients cannot mint signed URLs; every download rechecks the current access.
export function privateFiles(){return adminClient().storage;}
export function validateAcademyFile(path:string,academy:string,branch?:string){
 const parts=path.split('/');
 if(parts.length!==3||parts[0]!==academy||(branch&&parts[1]!==branch)||!/^[a-f0-9-]{36}$/.test(parts[1])||!/^[a-f0-9-]{36}\.(png|jpg|pdf)$/.test(parts[2]))throw Error('Archivo fuera del ámbito autorizado.');
}
