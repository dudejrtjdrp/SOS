-- ════════════════════════════════════════════════════════════════
-- 0006 · RAG (embeddings), Knowledge Graph, Reviews
-- ════════════════════════════════════════════════════════════════

-- Unified embeddings table (polymorphic source). halfvec(1536) — 2026 best practice.
create table public.embeddings (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  source_type  text not null check (source_type in ('knowledge_entry','artifact','document')),
  source_id    uuid not null,
  chunk_index  int not null default 0,
  content      text not null,             -- chunk text (512 tokens / 50 overlap)
  embedding    halfvec(1536) not null,
  created_at   timestamptz not null default now()
);
-- HNSW + cosine: p99 < 10ms up to ~5M vectors.
create index idx_embeddings_hnsw on public.embeddings
  using hnsw (embedding halfvec_cosine_ops);
create index idx_embeddings_source on public.embeddings(project_id, source_type, source_id);

-- Knowledge Graph: provenance / context edges between entities.
create table public.graph_edges (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  from_type    text not null,             -- run / artifact / document / knowledge_entry / kb
  from_id      uuid not null,
  to_type      text not null,
  to_id        uuid not null,
  relation     text not null,             -- derived_from / cites / part_of / reviews
  weight       real not null default 1.0,
  created_at   timestamptz not null default now()
);
create index idx_edges_from on public.graph_edges(project_id, from_id);
create index idx_edges_to on public.graph_edges(project_id, to_id);

-- AI Reviewer output (multi-persona evaluation).
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  artifact_id  uuid references public.artifacts(id) on delete cascade,
  document_id  uuid references public.documents(id) on delete cascade,
  persona      text not null check (persona in ('investor','judge','customer','competitor')),
  score        numeric(4,2),              -- 0..10
  strengths    jsonb not null default '[]'::jsonb,
  weaknesses   jsonb not null default '[]'::jsonb,
  suggestions  jsonb not null default '[]'::jsonb,
  run_id       uuid references public.runs(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_reviews_artifact on public.reviews(artifact_id);
create index idx_reviews_document on public.reviews(document_id);

-- ── RAG retrieval RPC (RLS-aware: caller only sees their rows) ───
create or replace function public.match_chunks(
  p_project uuid,
  p_query   halfvec(1536),
  p_k       int default 8
)
returns table (
  source_type text,
  source_id   uuid,
  content     text,
  similarity  float
)
language sql stable
as $$
  select e.source_type, e.source_id, e.content,
         1 - (e.embedding <=> p_query) as similarity
  from public.embeddings e
  where e.project_id = p_project
  order by e.embedding <=> p_query
  limit p_k;
$$;
