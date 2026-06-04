create table public.knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  description text,
  source_note_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.node_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_node_id uuid not null references public.knowledge_nodes(id) on delete cascade,
  target_node_id uuid not null references public.knowledge_nodes(id) on delete cascade,
  relation_type text not null,
  strength numeric default 1,
  description text,
  created_at timestamptz default now()
);

create table public.node_note_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id uuid not null references public.knowledge_nodes(id) on delete cascade,
  note_id uuid not null,
  link_type text default 'mentions',
  created_at timestamptz default now()
);

create trigger knowledge_nodes_touch_updated_at
before update on public.knowledge_nodes
for each row execute function public.touch_updated_at();

create index knowledge_nodes_user_id_idx on public.knowledge_nodes(user_id);
create index knowledge_nodes_type_idx on public.knowledge_nodes(type);
create index knowledge_nodes_source_note_id_idx on public.knowledge_nodes(source_note_id);
create index node_relations_user_id_idx on public.node_relations(user_id);
create index node_relations_source_node_id_idx on public.node_relations(source_node_id);
create index node_relations_target_node_id_idx on public.node_relations(target_node_id);
create index node_note_links_user_id_idx on public.node_note_links(user_id);
create index node_note_links_note_id_idx on public.node_note_links(note_id);
create index node_note_links_node_id_idx on public.node_note_links(node_id);
create unique index node_note_links_node_note_type_idx on public.node_note_links(node_id, note_id, link_type);

alter table public.knowledge_nodes enable row level security;
alter table public.node_relations enable row level security;
alter table public.node_note_links enable row level security;

create policy "knowledge_nodes_select_own" on public.knowledge_nodes for select using (auth.uid() = user_id);
create policy "knowledge_nodes_insert_own" on public.knowledge_nodes for insert with check (auth.uid() = user_id);
create policy "knowledge_nodes_update_own" on public.knowledge_nodes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "knowledge_nodes_delete_own" on public.knowledge_nodes for delete using (auth.uid() = user_id);

create policy "node_relations_select_own" on public.node_relations for select using (auth.uid() = user_id);
create policy "node_relations_insert_own" on public.node_relations for insert with check (auth.uid() = user_id);
create policy "node_relations_update_own" on public.node_relations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "node_relations_delete_own" on public.node_relations for delete using (auth.uid() = user_id);

create policy "node_note_links_select_own" on public.node_note_links for select using (auth.uid() = user_id);
create policy "node_note_links_insert_own" on public.node_note_links for insert with check (auth.uid() = user_id);
create policy "node_note_links_update_own" on public.node_note_links for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "node_note_links_delete_own" on public.node_note_links for delete using (auth.uid() = user_id);
