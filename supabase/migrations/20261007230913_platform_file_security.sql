-- Never permit browser sessions to mint reusable signed links to private files.
-- API proxies check the current caller's RLS rows before narrowly scoped Storage access.
create policy private_files_proxy_guard on storage.objects as restrictive for all to authenticated
 using(bucket_id not in('academy-private','platform-private'))
 with check(bucket_id not in('academy-private','platform-private'));
revoke all on public.platform_charge_balances from public,anon,authenticated;
grant select on public.platform_charge_balances to authenticated;
create policy no_client_access on private.platform_admins as restrictive for all to authenticated using(false) with check(false);
create policy no_client_access on private.platform_operation_keys as restrictive for all to authenticated using(false) with check(false);
