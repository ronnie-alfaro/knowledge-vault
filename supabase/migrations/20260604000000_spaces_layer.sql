create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.spaces(id) on delete cascade,
  icon text not null default 'folder',
  color text not null default '#0f766e',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spaces_name_not_empty check (length(trim(name)) > 0)
);

create table public.note_spaces (
  note_id uuid not null references public.notes(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, space_id)
);

create trigger spaces_touch_updated_at
before update on public.spaces
for each row execute function public.touch_updated_at();

create unique index spaces_user_parent_lower_name_idx on public.spaces(user_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index spaces_user_parent_sort_idx on public.spaces(user_id, parent_id, sort_order, name);
create index note_spaces_user_space_idx on public.note_spaces(user_id, space_id);
create index note_spaces_user_note_idx on public.note_spaces(user_id, note_id);

alter table public.spaces enable row level security;
alter table public.note_spaces enable row level security;

create policy "spaces_select_own" on public.spaces for select using (user_id = auth.uid());
create policy "spaces_insert_own" on public.spaces for insert with check (
  user_id = auth.uid()
  and (
    parent_id is null
    or exists (select 1 from public.spaces parent where parent.id = parent_id and parent.user_id = auth.uid())
  )
);
create policy "spaces_update_own" on public.spaces for update using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and (
    parent_id is null
    or exists (select 1 from public.spaces parent where parent.id = parent_id and parent.user_id = auth.uid())
  )
);
create policy "spaces_delete_own" on public.spaces for delete using (user_id = auth.uid());

create policy "note_spaces_select_own" on public.note_spaces for select using (user_id = auth.uid());
create policy "note_spaces_insert_own" on public.note_spaces for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.notes note where note.id = note_id and note.user_id = auth.uid())
  and exists (select 1 from public.spaces space where space.id = space_id and space.user_id = auth.uid())
);
create policy "note_spaces_delete_own" on public.note_spaces for delete using (user_id = auth.uid());

create or replace function public.create_default_space_for_user(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inbox_id uuid;
begin
  insert into public.spaces (user_id, name, icon, color, sort_order)
  values (target_user_id, 'Inbox', 'inbox', '#0f766e', 0)
  on conflict (user_id, (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)), (lower(name)))
  do update set name = excluded.name
  returning id into inbox_id;

  return inbox_id;
end;
$$;

create or replace function public.create_default_space_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_default_space_for_user(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created_default_space
after insert on auth.users
for each row execute function public.create_default_space_for_new_user();

insert into public.spaces (user_id, name, icon, color, sort_order)
select users.id, 'Inbox', 'inbox', '#0f766e', 0
from auth.users users
where not exists (
  select 1 from public.spaces spaces
  where spaces.user_id = users.id and spaces.parent_id is null and lower(spaces.name) = 'inbox'
);

drop function if exists public.search_notes(text, uuid, boolean);

create or replace function public.search_notes(search_query text, tag_filter uuid default null, include_archived boolean default false, space_filter uuid default null)
returns table(id uuid, title text, content text, updated_at timestamptz, favorite boolean, archived boolean, rank real)
language sql stable security invoker as $$
  select n.id, n.title, n.content, n.updated_at, n.favorite, n.archived,
    case when trim(search_query) = '' then 0 else ts_rank(n.search_vector, websearch_to_tsquery('english', search_query)) end as rank
  from public.notes n
  where n.user_id = auth.uid()
    and (include_archived or n.archived = false)
    and (
      trim(search_query) = ''
      or n.search_vector @@ websearch_to_tsquery('english', search_query)
      or n.title ilike '%' || search_query || '%'
      or regexp_replace(n.content, '<[^>]+>', ' ', 'g') ilike '%' || search_query || '%'
      or exists (
        select 1 from public.note_tags nt join public.tags t on t.id = nt.tag_id
        where nt.note_id = n.id and t.name ilike '%' || search_query || '%'
      )
    )
    and (tag_filter is null or exists (select 1 from public.note_tags nt where nt.note_id = n.id and nt.tag_id = tag_filter))
    and (space_filter is null or exists (select 1 from public.note_spaces ns where ns.note_id = n.id and ns.space_id = space_filter and ns.user_id = auth.uid()))
  order by rank desc, n.updated_at desc;
$$;
