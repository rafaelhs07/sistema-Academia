insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-private','academy-private',false,5242880,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do nothing;
-- Object paths are academy/branch/random-file. Invalid paths simply deny access.
create function private.storage_access(path text,permission text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare a uuid; b uuid; begin
 a:=split_part(path,'/',1)::uuid; b:=split_part(path,'/',2)::uuid;
 return exists(select 1 from public.branches where academy_id=a and id=b) and private.has_permission(a,b,permission);
exception when invalid_text_representation then return false;
end $$;
revoke all on function private.storage_access(text,text) from public,anon;
grant execute on function private.storage_access(text,text) to authenticated;
create policy academy_files_read on storage.objects for select to authenticated using(bucket_id='academy-private' and private.storage_access(name,'documents.read'));
create policy academy_files_insert on storage.objects for insert to authenticated with check(bucket_id='academy-private' and private.storage_access(name,'documents.write'));
-- Files use immutable random paths: no silent replacement or client deletion.
