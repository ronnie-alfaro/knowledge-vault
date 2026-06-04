drop view if exists public.dashboard_stats;

create or replace function public.get_dashboard_stats()
returns table(total_notes integer, total_tags integer, total_files integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*)::int from public.notes where user_id = auth.uid() and archived = false) as total_notes,
    (select count(*)::int from public.tags where user_id = auth.uid()) as total_tags,
    (select count(*)::int from public.attachments where uploaded_by = auth.uid()) as total_files;
$$;
