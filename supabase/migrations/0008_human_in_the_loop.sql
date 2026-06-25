-- ════════════════════════════════════════════════════════════════
-- 0008 · Human-in-the-Loop — Decision Gate, Founder's Take, Verification
-- Implements design principle #7 "Human Decides" (see docs/08-human-in-the-loop.md).
--
-- Additive only: new columns with safe defaults. Existing rows are
-- backfilled by the column default, so no data migration is required.
-- No RLS changes: new columns inherit the existing table policies (0007).
-- ════════════════════════════════════════════════════════════════

-- ── artifacts: the human decision state ──────────────────────────
-- verification_status is the trust gate. Nothing is promoted to the
-- Knowledge Base, finalized into a document, or committed as the next
-- workflow node until a human moves it to 'human_verified'.
alter table public.artifacts
  add column if not exists verification_status text not null default 'ai_draft'
    check (verification_status in ('ai_draft','needs_review','human_verified','rejected')),
  add column if not exists founder_take text,                 -- 창업자의 판단 한 줄
  add column if not exists verified_by  uuid references auth.users(id),
  add column if not exists verified_at  timestamptz;

-- Human review queue: artifacts waiting on a person, newest first (per project).
create index if not exists idx_artifacts_needs_review
  on public.artifacts(project_id, created_at desc)
  where verification_status = 'needs_review';

-- ── knowledge_entries: carry trust + provenance when promoted ────
-- Manual notes default to 'human_verified' (a human wrote them).
-- Promotion from an artifact copies the artifact's status + id (app layer),
-- so an unverified AI estimate never silently becomes KB "truth".
alter table public.knowledge_entries
  add column if not exists verification_status text not null default 'human_verified'
    check (verification_status in ('ai_draft','needs_review','human_verified','rejected')),
  add column if not exists source_artifact_id uuid references public.artifacts(id) on delete set null;

create index if not exists idx_entries_source_artifact
  on public.knowledge_entries(source_artifact_id)
  where source_artifact_id is not null;
