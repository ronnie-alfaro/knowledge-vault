create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite boolean not null default false,
  archived boolean not null default false,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g')), 'B')
  ) stored
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#0f766e',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index tags_user_lower_name_idx on public.tags(user_id, lower(name));

create table public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  file_size bigint not null check (file_size >= 0),
  mime_type text,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  share_token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.note_ai_metadata (
  note_id uuid primary key references public.notes(id) on delete cascade,
  summary text not null,
  keywords text[] not null default '{}',
  suggested_tags text[] not null default '{}',
  generated_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  subject_id uuid,
  subject_title text,
  created_at timestamptz not null default now()
);

create index notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index notes_search_idx on public.notes using gin(search_vector);
create index tags_user_name_idx on public.tags(user_id, name);
create index attachments_user_idx on public.attachments(uploaded_by, created_at desc);
create index shared_notes_token_idx on public.shared_notes(share_token);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_touch_updated_at
before update on public.notes
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace view public.dashboard_stats as
select
  users.id as user_id,
  coalesce(count(distinct notes.id), 0)::int as total_notes,
  coalesce(count(distinct tags.id), 0)::int as total_tags,
  coalesce(count(distinct attachments.id), 0)::int as total_files
from auth.users users
left join public.notes on notes.user_id = users.id and notes.archived = false
left join public.tags on tags.user_id = users.id
left join public.attachments on attachments.uploaded_by = users.id
group by users.id;

create or replace function public.search_notes(search_query text, tag_filter uuid default null, include_archived boolean default false)
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
  order by rank desc, n.updated_at desc;
$$;

create or replace function public.get_shared_note(token text)
returns table(id uuid, title text, content text, updated_at timestamptz, owner_name text)
language sql stable security definer set search_path = public as $$
  select n.id, n.title, n.content, n.updated_at, p.display_name
  from public.shared_notes s
  join public.notes n on n.id = s.note_id
  left join public.profiles p on p.id = n.user_id
  where s.share_token = token
    and (s.expires_at is null or s.expires_at > now())
    and n.archived = false
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.attachments enable row level security;
alter table public.shared_notes enable row level security;
alter table public.note_ai_metadata enable row level security;
alter table public.activity_events enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "notes_select_own" on public.notes for select using (user_id = auth.uid());
create policy "notes_insert_own" on public.notes for insert with check (user_id = auth.uid());
create policy "notes_update_own" on public.notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notes_delete_own" on public.notes for delete using (user_id = auth.uid());

create policy "tags_select_own" on public.tags for select using (user_id = auth.uid());
create policy "tags_insert_own" on public.tags for insert with check (user_id = auth.uid());
create policy "tags_update_own" on public.tags for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tags_delete_own" on public.tags for delete using (user_id = auth.uid());

create policy "note_tags_select_own" on public.note_tags for select using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
create policy "note_tags_insert_own" on public.note_tags for insert with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid()) and
  exists (select 1 from public.tags t where t.id = tag_id and t.user_id = auth.uid())
);
create policy "note_tags_delete_own" on public.note_tags for delete using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);

create policy "attachments_select_own" on public.attachments for select using (uploaded_by = auth.uid());
create policy "attachments_insert_own" on public.attachments for insert with check (uploaded_by = auth.uid());
create policy "attachments_delete_own" on public.attachments for delete using (uploaded_by = auth.uid());

create policy "shared_notes_select_own" on public.shared_notes for select using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
create policy "shared_notes_insert_own" on public.shared_notes for insert with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
create policy "shared_notes_update_own" on public.shared_notes for update using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
create policy "shared_notes_delete_own" on public.shared_notes for delete using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);

create policy "ai_select_own" on public.note_ai_metadata for select using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
create policy "ai_insert_own" on public.note_ai_metadata for insert with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
create policy "ai_update_own" on public.note_ai_metadata for update using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
) with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);

create policy "activity_select_own" on public.activity_events for select using (user_id = auth.uid());
create policy "activity_insert_own" on public.activity_events for insert with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']),
  ('attachments', 'attachments', false, 26214400, array['image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain','text/markdown','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "avatar_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar_own_upload" on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar_own_update" on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachment_own_read" on storage.objects for select using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachment_own_upload" on storage.objects for insert with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachment_own_delete" on storage.objects for delete using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.activity_events;
