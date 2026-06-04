create extension if not exists vector;

create table public.content_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('note', 'node')),
  source_id uuid not null,
  content text not null,
  content_hash text not null,
  embedding vector(1536),
  embedding_model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create trigger content_embeddings_touch_updated_at
before update on public.content_embeddings
for each row execute function public.touch_updated_at();

create index content_embeddings_user_source_idx on public.content_embeddings(user_id, source_type, source_id);
create index content_embeddings_hash_idx on public.content_embeddings(user_id, source_type, source_id, content_hash);
create index content_embeddings_embedding_idx on public.content_embeddings using hnsw (embedding vector_cosine_ops);

alter table public.content_embeddings enable row level security;

create policy "content_embeddings_select_own" on public.content_embeddings for select using (user_id = (select auth.uid()));
create policy "content_embeddings_insert_own" on public.content_embeddings for insert with check (user_id = (select auth.uid()));
create policy "content_embeddings_update_own" on public.content_embeddings for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "content_embeddings_delete_own" on public.content_embeddings for delete using (user_id = (select auth.uid()));

create or replace function public.match_similar_notes(target_note_id uuid, match_count integer default 10)
returns table(note_id uuid, title text, content text, updated_at timestamptz, score double precision)
language sql
stable
security invoker
set search_path = public
as $$
  with target as (
    select embedding
    from public.content_embeddings
    where source_type = 'note'
      and source_id = target_note_id
      and user_id = (select auth.uid())
      and embedding is not null
    limit 1
  )
  select notes.id, notes.title, notes.content, notes.updated_at,
    greatest(0, 1 - (embeddings.embedding <=> target.embedding))::double precision as score
  from target
  join public.content_embeddings embeddings on embeddings.user_id = (select auth.uid())
  join public.notes notes on notes.id = embeddings.source_id and notes.user_id = (select auth.uid())
  where embeddings.source_type = 'note'
    and embeddings.source_id <> target_note_id
    and embeddings.embedding is not null
    and notes.archived = false
  order by embeddings.embedding <=> target.embedding
  limit match_count;
$$;

create or replace function public.match_similar_nodes(target_node_id uuid, match_count integer default 10)
returns table(node_id uuid, title text, type text, description text, score double precision)
language sql
stable
security invoker
set search_path = public
as $$
  with target as (
    select embedding
    from public.content_embeddings
    where source_type = 'node'
      and source_id = target_node_id
      and user_id = (select auth.uid())
      and embedding is not null
    limit 1
  )
  select nodes.id, nodes.title, nodes.type, nodes.description,
    greatest(0, 1 - (embeddings.embedding <=> target.embedding))::double precision as score
  from target
  join public.content_embeddings embeddings on embeddings.user_id = (select auth.uid())
  join public.knowledge_nodes nodes on nodes.id = embeddings.source_id and nodes.user_id = (select auth.uid())
  where embeddings.source_type = 'node'
    and embeddings.source_id <> target_node_id
    and embeddings.embedding is not null
  order by embeddings.embedding <=> target.embedding
  limit match_count;
$$;

create or replace function public.semantic_search_content(query_embedding vector(1536), match_count integer default 20)
returns table(source_type text, source_id uuid, title text, preview text, score double precision)
language sql
stable
security invoker
set search_path = public
as $$
  select ranked.source_type, ranked.source_id, ranked.title, ranked.preview, ranked.score
  from (
    select embeddings.source_type, embeddings.source_id, notes.title,
      left(regexp_replace(notes.content, '<[^>]+>', ' ', 'g'), 240) as preview,
      greatest(0, 1 - (embeddings.embedding <=> query_embedding))::double precision as score
    from public.content_embeddings embeddings
    join public.notes notes on notes.id = embeddings.source_id and notes.user_id = (select auth.uid())
    where embeddings.user_id = (select auth.uid())
      and embeddings.source_type = 'note'
      and embeddings.embedding is not null
      and notes.archived = false
    union all
    select embeddings.source_type, embeddings.source_id, nodes.title,
      coalesce(nodes.description, nodes.type) as preview,
      greatest(0, 1 - (embeddings.embedding <=> query_embedding))::double precision as score
    from public.content_embeddings embeddings
    join public.knowledge_nodes nodes on nodes.id = embeddings.source_id and nodes.user_id = (select auth.uid())
    where embeddings.user_id = (select auth.uid())
      and embeddings.source_type = 'node'
      and embeddings.embedding is not null
  ) ranked
  order by ranked.score desc
  limit match_count;
$$;

create or replace function public.suggested_node_connections(similarity_threshold double precision default 0.85, match_count integer default 30)
returns table(source_node_id uuid, source_title text, target_node_id uuid, target_title text, score double precision, suggested_relation text)
language sql
stable
security invoker
set search_path = public
as $$
  select source_nodes.id, source_nodes.title, target_nodes.id, target_nodes.title,
    greatest(0, 1 - (source_embeddings.embedding <=> target_embeddings.embedding))::double precision as score,
    case
      when greatest(0, 1 - (source_embeddings.embedding <=> target_embeddings.embedding)) >= 0.92 then 'related_to'
      else 'similar_to'
    end as suggested_relation
  from public.content_embeddings source_embeddings
  join public.content_embeddings target_embeddings
    on target_embeddings.user_id = source_embeddings.user_id
    and target_embeddings.source_type = 'node'
    and source_embeddings.source_id < target_embeddings.source_id
  join public.knowledge_nodes source_nodes on source_nodes.id = source_embeddings.source_id and source_nodes.user_id = (select auth.uid())
  join public.knowledge_nodes target_nodes on target_nodes.id = target_embeddings.source_id and target_nodes.user_id = (select auth.uid())
  where source_embeddings.user_id = (select auth.uid())
    and source_embeddings.source_type = 'node'
    and source_embeddings.embedding is not null
    and target_embeddings.embedding is not null
    and not exists (
      select 1
      from public.node_relations relations
      where relations.user_id = (select auth.uid())
        and (
          (relations.source_node_id = source_nodes.id and relations.target_node_id = target_nodes.id)
          or (relations.source_node_id = target_nodes.id and relations.target_node_id = source_nodes.id)
        )
    )
    and greatest(0, 1 - (source_embeddings.embedding <=> target_embeddings.embedding)) >= similarity_threshold
  order by score desc
  limit match_count;
$$;
