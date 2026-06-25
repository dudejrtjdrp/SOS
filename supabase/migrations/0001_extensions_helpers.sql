-- ════════════════════════════════════════════════════════════════
-- 0001 · Extensions & generic helpers
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- gen_random_uuid / gen_random_bytes
create extension if not exists "vector";      -- pgvector (RAG, halfvec)

-- Generic updated_at trigger function (attached per-table below).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
