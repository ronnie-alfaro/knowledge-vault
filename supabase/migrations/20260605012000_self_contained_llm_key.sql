create or replace function private.llm_settings_encryption_key(target_user_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to('knowledge-vault:llm-settings:' || target_user_id::text || ':' || current_database(), 'utf8'),
      'sha256'
    ),
    'hex'
  );
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
    encrypted_key := extensions.pgp_sym_encrypt(trimmed_key, private.llm_settings_encryption_key(active_user_id), 'compress-algo=1, cipher-algo=aes256');
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
