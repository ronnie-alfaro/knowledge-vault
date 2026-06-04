# Knowledge Vault

Production-quality personal knowledge management app inspired by Notion, Obsidian, Pocket, and Linear. It showcases Supabase Auth, Postgres, RLS, Storage, Realtime, RPC functions, and Edge Functions with a React + TypeScript frontend.

## Stack

- React, TypeScript, Vite, TailwindCSS
- React Router and TanStack Query
- Supabase Auth, Database, Storage, Realtime, Edge Functions
- Vitest and Testing Library
- Deployable to Cloudflare Workers static assets

## Features

- Email/password auth, Google OAuth, GitHub OAuth, password reset, protected routes, persistent sessions
- Profiles with editable display name, bio, and avatar uploads
- Rich text notes with create, edit, delete, archive, favorite, search, and sorting
- Tags with note assignment, removal, and filtering
- File uploads for images, PDFs, and documents with metadata stored in Postgres
- Realtime note updates, presence, and activity-ready notifications
- Public read-only note sharing by secure token with optional expiration
- Dashboard metrics for notes, tags, files, activity, and tag usage
- PostgreSQL full-text search across title, content, and tags
- Strict Row Level Security for private user data
- `summarize_note` Edge Function with swappable AI provider architecture
- Responsive dark-mode UI with sidebar navigation

## Folder Structure

```text
src/
  features/
    auth/
    dashboard/
    files/
    notes/
    profile/
    realtime/
    sharing/
    tags/
  shared/
    components/
    layout/
    lib/
  test/
supabase/
  config.toml
  migrations/
  functions/
    summarize_note/
```

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start Supabase locally:

```bash
supabase start
supabase db reset
supabase functions serve summarize_note --env-file ./supabase/.env
```

4. Fill `.env` with the local Supabase URL and anon key printed by `supabase start`.

5. Start Vite:

```bash
npm run dev
```

## Supabase Setup

Apply `supabase/migrations/20260603000000_initial_schema.sql`. It creates the database schema, RLS policies, Storage buckets, full-text search, sharing RPC, dashboard view, and Realtime publications.

For hosted Supabase, configure Auth providers:

- Google OAuth redirect: `https://your-domain.com/auth/callback`
- GitHub OAuth redirect: `https://your-domain.com/auth/callback`
- Password reset redirect: `https://your-domain.com/update-password`

## Edge Function

`supabase/functions/summarize_note/index.ts` exposes `summarize_note`.

Input:

```json
{ "note_id": "uuid", "content": "note text" }
```

Output:

```json
{ "summary": "...", "keywords": ["..."], "suggested_tags": ["..."] }
```

The current provider is a local heuristic provider so the project runs without paid AI credentials. Swap `getProvider()` for OpenAI, Azure OpenAI, Anthropic, or another provider later without changing the app contract.

Deploy:

```bash
supabase functions deploy summarize_note
```

## Deployment

### Vercel

1. Import the repository.
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL`.
3. Build command: `npm run build`
4. Output directory: `dist`

### Cloudflare Workers

1. Connect the repository or deploy with Wrangler.
2. Build command: `pnpm build`
3. Deploy command: `pnpm deploy:worker`
4. Add Worker variables because this repo includes a minimal Worker script:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `APP_URL`

The deployed app reads `/api/config` at runtime. Local Vite development still reads `.env` values named `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL`.

For local Wrangler testing, copy `.dev.vars.example` to `.dev.vars` and set:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-publishable-key
APP_URL=http://localhost:8787
```

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```
