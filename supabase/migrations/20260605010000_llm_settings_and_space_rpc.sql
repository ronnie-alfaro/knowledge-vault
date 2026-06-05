create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from anon, authenticated;

do $$
begin
  create type public.llm_provider as enum ('openai', 'anthropic', 'gemini');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_llm_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider public.llm_provider not null default 'openai',
  model text,
  encrypted_api_key bytea,
  api_key_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_llm_settings_model_length check (model is null or length(model) <= 120),
  constraint user_llm_settings_api_key_preview_length check (api_key_preview is null or length(api_key_preview) <= 32)
);

create trigger user_llm_settings_touch_updated_at
before update on public.user_llm_settings
for each row execute function public.touch_updated_at();

alter table public.user_llm_settings enable row level security;

drop policy if exists "llm_settings_select_own" on public.user_llm_settings;
drop policy if exists "llm_settings_insert_own" on public.user_llm_settings;
drop policy if exists "llm_settings_update_own" on public.user_llm_settings;
drop policy if exists "llm_settings_delete_own" on public.user_llm_settings;

create policy "llm_settings_select_own" on public.user_llm_settings for select using (user_id = (select auth.uid()));
create policy "llm_settings_insert_own" on public.user_llm_settings for insert with check (user_id = (select auth.uid()));
create policy "llm_settings_update_own" on public.user_llm_settings for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "llm_settings_delete_own" on public.user_llm_settings for delete using (user_id = (select auth.uid()));

revoke all on public.user_llm_settings from anon, authenticated;

create or replace function private.llm_settings_encryption_key()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  encryption_key text;
begin
  encryption_key := current_setting('app.settings_encryption_key', true);
  if encryption_key is null or length(encryption_key) < 32 then
    raise exception 'app.settings_encryption_key is not configured';
  end if;
  return encryption_key;
end;
$$;

create or replace function public.get_llm_settings()
returns table (
  provider public.llm_provider,
  model text,
  api_key_preview text,
  has_api_key boolean,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    settings.provider,
    settings.model,
    settings.api_key_preview,
    settings.encrypted_api_key is not null as has_api_key,
    settings.updated_at
  from public.user_llm_settings settings
  where settings.user_id = (select auth.uid());
$$;

create or replace function public.save_llm_settings(
  selected_provider public.llm_provider,
  api_key text default null,
  selected_model text default null
)
returns table (
  provider public.llm_provider,
  model text,
  api_key_preview text,
  has_api_key boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_user_id uuid := (select auth.uid());
  trimmed_key text := nullif(trim(coalesce(api_key, '')), '');
  encrypted_key bytea;
  key_preview text;
begin
  if active_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if trimmed_key is not null then
    encrypted_key := extensions.pgp_sym_encrypt(trimmed_key, private.llm_settings_encryption_key(), 'compress-algo=1, cipher-algo=aes256');
    key_preview := concat(left(trimmed_key, 4), '...', right(trimmed_key, 4));
  end if;

  insert into public.user_llm_settings (user_id, provider, model, encrypted_api_key, api_key_preview)
  values (active_user_id, selected_provider, nullif(trim(coalesce(selected_model, '')), ''), encrypted_key, key_preview)
  on conflict (user_id) do update
    set provider = excluded.provider,
        model = excluded.model,
        encrypted_api_key = coalesce(excluded.encrypted_api_key, public.user_llm_settings.encrypted_api_key),
        api_key_preview = coalesce(excluded.api_key_preview, public.user_llm_settings.api_key_preview),
        updated_at = now();

  return query select * from public.get_llm_settings();
end;
$$;

create or replace function public.clear_llm_api_key()
returns table (
  provider public.llm_provider,
  model text,
  api_key_preview text,
  has_api_key boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_user_id uuid := (select auth.uid());
begin
  if active_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.user_llm_settings
  set encrypted_api_key = null,
      api_key_preview = null,
      updated_at = now()
  where user_id = active_user_id;

  return query select * from public.get_llm_settings();
end;
$$;

create or replace function public.create_space(
  space_name text,
  parent_space_id uuid default null,
  space_color text default '#0f766e',
  space_icon text default 'folder'
)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_user_id uuid := (select auth.uid());
  created_space public.spaces;
  next_sort_order int;
begin
  if active_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(coalesce(space_name, '')), '') is null then
    raise exception 'Space name is required';
  end if;

  if parent_space_id is not null and not exists (
    select 1 from public.spaces parent
    where parent.id = parent_space_id and parent.user_id = active_user_id
  ) then
    raise exception 'Parent space not found';
  end if;

  select coalesce(max(sort_order), 0) + 10
  into next_sort_order
  from public.spaces
  where user_id = active_user_id
    and parent_id is not distinct from parent_space_id;

  insert into public.spaces (user_id, name, parent_id, color, icon, sort_order)
  values (active_user_id, trim(space_name), parent_space_id, coalesce(space_color, '#0f766e'), coalesce(space_icon, 'folder'), next_sort_order)
  returning * into created_space;

  return created_space;
end;
$$;

revoke all on function public.get_llm_settings() from public;
revoke all on function public.save_llm_settings(public.llm_provider, text, text) from public;
revoke all on function public.clear_llm_api_key() from public;
revoke all on function public.create_space(text, uuid, text, text) from public;

grant execute on function public.get_llm_settings() to authenticated;
grant execute on function public.save_llm_settings(public.llm_provider, text, text) to authenticated;
grant execute on function public.clear_llm_api_key() to authenticated;
grant execute on function public.create_space(text, uuid, text, text) to authenticated;
