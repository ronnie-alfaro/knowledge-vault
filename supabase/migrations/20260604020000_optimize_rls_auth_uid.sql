alter table public.knowledge_nodes
  add constraint knowledge_nodes_source_note_id_fkey
  foreign key (source_note_id) references public.notes(id) on delete set null not valid;

alter table public.node_note_links
  add constraint node_note_links_note_id_fkey
  foreign key (note_id) references public.notes(id) on delete cascade not valid;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;
drop policy if exists "tags_select_own" on public.tags;
drop policy if exists "tags_insert_own" on public.tags;
drop policy if exists "tags_update_own" on public.tags;
drop policy if exists "tags_delete_own" on public.tags;
drop policy if exists "note_tags_select_own" on public.note_tags;
drop policy if exists "note_tags_insert_own" on public.note_tags;
drop policy if exists "note_tags_delete_own" on public.note_tags;
drop policy if exists "attachments_select_own" on public.attachments;
drop policy if exists "attachments_insert_own" on public.attachments;
drop policy if exists "attachments_delete_own" on public.attachments;
drop policy if exists "shared_notes_select_own" on public.shared_notes;
drop policy if exists "shared_notes_insert_own" on public.shared_notes;
drop policy if exists "shared_notes_update_own" on public.shared_notes;
drop policy if exists "shared_notes_delete_own" on public.shared_notes;
drop policy if exists "ai_select_own" on public.note_ai_metadata;
drop policy if exists "ai_insert_own" on public.note_ai_metadata;
drop policy if exists "ai_update_own" on public.note_ai_metadata;
drop policy if exists "activity_select_own" on public.activity_events;
drop policy if exists "activity_insert_own" on public.activity_events;
drop policy if exists "knowledge_nodes_select_own" on public.knowledge_nodes;
drop policy if exists "knowledge_nodes_insert_own" on public.knowledge_nodes;
drop policy if exists "knowledge_nodes_update_own" on public.knowledge_nodes;
drop policy if exists "knowledge_nodes_delete_own" on public.knowledge_nodes;
drop policy if exists "node_relations_select_own" on public.node_relations;
drop policy if exists "node_relations_insert_own" on public.node_relations;
drop policy if exists "node_relations_update_own" on public.node_relations;
drop policy if exists "node_relations_delete_own" on public.node_relations;
drop policy if exists "node_note_links_select_own" on public.node_note_links;
drop policy if exists "node_note_links_insert_own" on public.node_note_links;
drop policy if exists "node_note_links_update_own" on public.node_note_links;
drop policy if exists "node_note_links_delete_own" on public.node_note_links;
drop policy if exists "spaces_select_own" on public.spaces;
drop policy if exists "spaces_insert_own" on public.spaces;
drop policy if exists "spaces_update_own" on public.spaces;
drop policy if exists "spaces_delete_own" on public.spaces;
drop policy if exists "note_spaces_select_own" on public.note_spaces;
drop policy if exists "note_spaces_insert_own" on public.note_spaces;
drop policy if exists "note_spaces_delete_own" on public.note_spaces;

create policy "profiles_select_own" on public.profiles for select using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "notes_select_own" on public.notes for select using (user_id = (select auth.uid()));
create policy "notes_insert_own" on public.notes for insert with check (user_id = (select auth.uid()));
create policy "notes_update_own" on public.notes for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notes_delete_own" on public.notes for delete using (user_id = (select auth.uid()));

create policy "tags_select_own" on public.tags for select using (user_id = (select auth.uid()));
create policy "tags_insert_own" on public.tags for insert with check (user_id = (select auth.uid()));
create policy "tags_update_own" on public.tags for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tags_delete_own" on public.tags for delete using (user_id = (select auth.uid()));

create policy "note_tags_select_own" on public.note_tags for select using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);
create policy "note_tags_insert_own" on public.note_tags for insert with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid())) and
  exists (select 1 from public.tags t where t.id = tag_id and t.user_id = (select auth.uid()))
);
create policy "note_tags_delete_own" on public.note_tags for delete using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);

create policy "attachments_select_own" on public.attachments for select using (uploaded_by = (select auth.uid()));
create policy "attachments_insert_own" on public.attachments for insert with check (uploaded_by = (select auth.uid()));
create policy "attachments_delete_own" on public.attachments for delete using (uploaded_by = (select auth.uid()));

create policy "shared_notes_select_own" on public.shared_notes for select using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);
create policy "shared_notes_insert_own" on public.shared_notes for insert with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);
create policy "shared_notes_update_own" on public.shared_notes for update using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);
create policy "shared_notes_delete_own" on public.shared_notes for delete using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);

create policy "ai_select_own" on public.note_ai_metadata for select using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);
create policy "ai_insert_own" on public.note_ai_metadata for insert with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);
create policy "ai_update_own" on public.note_ai_metadata for update using (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
);

create policy "activity_select_own" on public.activity_events for select using (user_id = (select auth.uid()));
create policy "activity_insert_own" on public.activity_events for insert with check (user_id = (select auth.uid()));

create policy "knowledge_nodes_select_own" on public.knowledge_nodes for select using (user_id = (select auth.uid()));
create policy "knowledge_nodes_insert_own" on public.knowledge_nodes for insert with check (
  user_id = (select auth.uid())
  and (
    source_note_id is null
    or exists (select 1 from public.notes n where n.id = source_note_id and n.user_id = (select auth.uid()))
  )
);
create policy "knowledge_nodes_update_own" on public.knowledge_nodes for update using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (
    source_note_id is null
    or exists (select 1 from public.notes n where n.id = source_note_id and n.user_id = (select auth.uid()))
  )
);
create policy "knowledge_nodes_delete_own" on public.knowledge_nodes for delete using (user_id = (select auth.uid()));

create policy "node_relations_select_own" on public.node_relations for select using (user_id = (select auth.uid()));
create policy "node_relations_insert_own" on public.node_relations for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.knowledge_nodes source where source.id = source_node_id and source.user_id = (select auth.uid()))
  and exists (select 1 from public.knowledge_nodes target where target.id = target_node_id and target.user_id = (select auth.uid()))
);
create policy "node_relations_update_own" on public.node_relations for update using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.knowledge_nodes source where source.id = source_node_id and source.user_id = (select auth.uid()))
  and exists (select 1 from public.knowledge_nodes target where target.id = target_node_id and target.user_id = (select auth.uid()))
);
create policy "node_relations_delete_own" on public.node_relations for delete using (user_id = (select auth.uid()));

create policy "node_note_links_select_own" on public.node_note_links for select using (user_id = (select auth.uid()));
create policy "node_note_links_insert_own" on public.node_note_links for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.knowledge_nodes node where node.id = node_id and node.user_id = (select auth.uid()))
  and exists (select 1 from public.notes note where note.id = note_id and note.user_id = (select auth.uid()))
);
create policy "node_note_links_update_own" on public.node_note_links for update using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.knowledge_nodes node where node.id = node_id and node.user_id = (select auth.uid()))
  and exists (select 1 from public.notes note where note.id = note_id and note.user_id = (select auth.uid()))
);
create policy "node_note_links_delete_own" on public.node_note_links for delete using (user_id = (select auth.uid()));

create policy "spaces_select_own" on public.spaces for select using (user_id = (select auth.uid()));
create policy "spaces_insert_own" on public.spaces for insert with check (
  user_id = (select auth.uid())
  and (
    parent_id is null
    or exists (select 1 from public.spaces parent where parent.id = parent_id and parent.user_id = (select auth.uid()))
  )
);
create policy "spaces_update_own" on public.spaces for update using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (
    parent_id is null
    or exists (select 1 from public.spaces parent where parent.id = parent_id and parent.user_id = (select auth.uid()))
  )
);
create policy "spaces_delete_own" on public.spaces for delete using (user_id = (select auth.uid()));

create policy "note_spaces_select_own" on public.note_spaces for select using (user_id = (select auth.uid()));
create policy "note_spaces_insert_own" on public.note_spaces for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.notes note where note.id = note_id and note.user_id = (select auth.uid()))
  and exists (select 1 from public.spaces space where space.id = space_id and space.user_id = (select auth.uid()))
);
create policy "note_spaces_delete_own" on public.note_spaces for delete using (user_id = (select auth.uid()));

drop policy if exists "avatar_own_upload" on storage.objects;
drop policy if exists "avatar_own_update" on storage.objects;
drop policy if exists "attachment_own_read" on storage.objects;
drop policy if exists "attachment_own_upload" on storage.objects;
drop policy if exists "attachment_own_delete" on storage.objects;

create policy "avatar_own_upload" on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar_own_update" on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachment_own_read" on storage.objects for select using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachment_own_upload" on storage.objects for insert with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachment_own_delete" on storage.objects for delete using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
