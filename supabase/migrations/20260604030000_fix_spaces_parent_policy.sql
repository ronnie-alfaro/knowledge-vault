drop policy if exists "spaces_insert_own" on public.spaces;
drop policy if exists "spaces_update_own" on public.spaces;

create policy "spaces_insert_own" on public.spaces for insert with check (
  user_id = (select auth.uid())
  and (
    public.spaces.parent_id is null
    or exists (
      select 1
      from public.spaces parent
      where parent.id = public.spaces.parent_id
        and parent.user_id = (select auth.uid())
    )
  )
);

create policy "spaces_update_own" on public.spaces for update using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (
    public.spaces.parent_id is null
    or exists (
      select 1
      from public.spaces parent
      where parent.id = public.spaces.parent_id
        and parent.user_id = (select auth.uid())
    )
  )
);
