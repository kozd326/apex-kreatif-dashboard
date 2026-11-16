begin;
-- Hosted defaults grant roles explicitly, independently of PUBLIC.
alter function public.apex_touch() set search_path = public;
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'apex_%' loop
  execute format('revoke execute on function %s from public,anon',f.sig);
 end loop;
end $$;
-- Trigger execution does not require the caller to hold EXECUTE.
revoke execute on function public.apex_touch(), public.apex_audit(), public.apex_invoice_document_saved(), public.apex_consistency() from authenticated;
commit;
