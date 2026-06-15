create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_email text := 'anonymous-' || new.id::text || '@knowledge-vault.local';
  is_guest boolean := coalesce((new.raw_app_meta_data ->> 'provider') = 'anonymous', false)
    or coalesce((new.raw_user_meta_data ->> 'is_anonymous')::boolean, false)
    or new.email is null;
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, fallback_email),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      case when is_guest then 'Guest Vault' else split_part(coalesce(new.email, fallback_email), '@', 1) end
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;
