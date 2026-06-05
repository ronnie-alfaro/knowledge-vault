create or replace function public.get_llm_runtime_config(target_user_id uuid)
returns table (
  provider public.llm_provider,
  model text,
  api_key text
)
language sql
security definer
set search_path = ''
as $$
  select
    settings.provider,
    settings.model,
    extensions.pgp_sym_decrypt(settings.encrypted_api_key, private.llm_settings_encryption_key(settings.user_id)) as api_key
  from public.user_llm_settings settings
  where settings.user_id = target_user_id
    and settings.encrypted_api_key is not null;
$$;

revoke all on function public.get_llm_runtime_config(uuid) from public;
grant execute on function public.get_llm_runtime_config(uuid) to service_role;
