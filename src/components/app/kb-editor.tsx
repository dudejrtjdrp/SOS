"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LightbulbIcon } from "lucide-react";
import { KB_FIELDS, kbCompleteness } from "@/core/schemas/kb";
import { docsUsingKBField } from "@/core/modules/guide";
import { updateKnowledgeFields, addKnowledgeEntry } from "@/server/actions/knowledge";
import { KBFormatTools } from "@/components/app/kb-format-tools";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function KBEditor({
  projectId,
  initial,
}: {
  projectId: string;
  initial: Record<string, string>;
}) {
  const [fields, setFields] = React.useState<Record<string, string>>(initial);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [openExample, setOpenExample] = React.useState<Record<string, boolean>>({});
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const completeness = kbCompleteness(fields);

  function onChange(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(key, value), 800);
  }

  async function save(key: string, value: string) {
    setSaving(true);
    const r = await updateKnowledgeFields({ projectId, fields: { [key]: value } });
    setSaving(false);
    if (!r.ok) toast.error(r.error.message);
    else setSavedAt(Date.now());
  }

  /** Bulk-apply fields parsed from a pasted format: reflect locally + persist. */
  async function applyParsed(parsed: Record<string, string>) {
    const keys = Object.keys(parsed);
    if (keys.length === 0) return;
    setFields((f) => ({ ...f, ...parsed }));
    setSaving(true);
    const r = await updateKnowledgeFields({ projectId, fields: parsed });
    setSaving(false);
    if (!r.ok) return toast.error(r.error.message);
    setSavedAt(Date.now());
    toast.success(`${keys.length}개 항목을 채웠습니다.`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${completeness}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">
            {completeness}% 완성 {saving ? "· 저장 중…" : savedAt ? "· 저장됨" : ""}
          </span>
        </div>
        <KBFormatTools current={fields} onApply={applyParsed} />
      </div>

      <div className="space-y-5">
        {KB_FIELDS.map((f) => {
          const exampleOpen = openExample[f.key] ?? false;
          const usedDocs = docsUsingKBField(f.key);
          return (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.example && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenExample((s) => ({ ...s, [f.key]: !exampleOpen }))
                    }
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    aria-expanded={exampleOpen}
                  >
                    <LightbulbIcon className="size-3.5" />
                    {exampleOpen ? "예시 닫기" : "예시 보기"}
                  </button>
                )}
              </div>
              {f.description && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              )}
              {f.type === "text" ? (
                <Input
                  id={f.key}
                  value={fields[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
              ) : (
                <Textarea
                  id={f.key}
                  value={fields[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
              )}
              {usedDocs.length > 0 && (
                <p className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="text-foreground/60">쓰이는 문서</span>
                  {usedDocs.slice(0, 4).map((n) => (
                    <span key={n} className="rounded bg-muted px-1.5 py-0.5">
                      {n}
                    </span>
                  ))}
                  {usedDocs.length > 4 && <span>외 {usedDocs.length - 4}</span>}
                </p>
              )}
              {exampleOpen && f.example && (
                <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium text-muted-foreground">예시</span>
                    <button
                      type="button"
                      onClick={() => onChange(f.key, f.example!)}
                      className="text-primary transition-opacity hover:opacity-70"
                    >
                      이 예시로 채우기
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                    {f.example}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AddKnowledgeEntry({ projectId }: { projectId: string }) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function submit() {
    if (!body.trim()) return;
    setLoading(true);
    const r = await addKnowledgeEntry({ projectId, title: title || undefined, body });
    setLoading(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("자료를 추가했습니다.");
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목 (선택)"
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="메모·리서치 자료를 붙여넣으세요. RAG 검색에 활용됩니다."
      />
      <Button size="sm" onClick={submit} disabled={loading || !body.trim()}>
        자료 추가
      </Button>
    </div>
  );
}
