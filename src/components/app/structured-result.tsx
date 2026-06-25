import { CheckIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";

function humanize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Generic renderer for any module's structured output (covers all 52 modules). */
export function StructuredResult({ content }: { content: unknown }) {
  if (content == null) return null;
  if (typeof content !== "object") return <p className="text-sm">{String(content)}</p>;
  const obj = content as Record<string, unknown>;
  if ("markdown" in obj) return <Markdown>{String(obj.markdown ?? "")}</Markdown>;

  return (
    <div className="space-y-4">
      {Object.entries(obj)
        .filter(([k]) => !k.startsWith("__"))
        .map(([k, v]) => (
          <Field key={k} label={humanize(k)} value={v} />
        ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === "") return null;

  if (isClaim(value)) {
    return (
      <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <ClaimValue claim={value} />
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm">{value}</p>
      </div>
    );
  }
  if (typeof value === "number") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge>{value}</Badge>
      </div>
    );
  }
  if (Array.isArray(value)) {
    const claimItems = value.length > 0 && isClaim(value[0]);
    const objectItems = !claimItems && value.length > 0 && typeof value[0] === "object";
    return (
      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
        {claimItems ? (
          <div className="space-y-1.5">
            {value.map((it, i) => (
              <ClaimValue key={i} claim={it as Claim} />
            ))}
          </div>
        ) : objectItems ? (
          <div className="space-y-2">
            {value.map((it, i) => (
              <div key={i} className="rounded-lg border border-border p-3 text-sm">
                <KeyVals obj={it as Record<string, unknown>} />
              </div>
            ))}
          </div>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {value.map((v, i) => (
              <li key={i}>{String(v)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
        <div className="rounded-lg border border-border p-3 text-sm">
          <KeyVals obj={value as Record<string, unknown>} />
        </div>
      </div>
    );
  }
  return null;
}

function KeyVals({ obj }: { obj: Record<string, unknown> }) {
  return (
    <div className="space-y-1">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="shrink-0 text-muted-foreground">{humanize(k)}:</span>
          <span className="whitespace-pre-wrap">
            {Array.isArray(v) ? v.join(", ") : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Human-in-the-Loop: verifiable claims (docs/08 §6) ───────────────
type Claim = {
  value: string;
  confidence: "fact" | "estimate";
  source?: string;
  verified?: boolean; // human-added later, stored alongside in content
};

function isClaim(v: unknown): v is Claim {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.value === "string" &&
    (o.confidence === "fact" || o.confidence === "estimate")
  );
}

/** Renders a claim's value with a trust badge. An unverified estimate shows
 *  "확인 필요" — the visible boundary between AI output and human-checked fact. */
function ClaimValue({ claim }: { claim: Claim }) {
  const needsCheck = claim.confidence === "estimate" && !claim.verified;
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
      <span>{claim.value}</span>
      {claim.verified ? (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <CheckIcon className="size-3" />
          검증됨
        </Badge>
      ) : needsCheck ? (
        <Badge className="gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
          <TriangleAlertIcon className="size-3" />
          확인 필요
        </Badge>
      ) : null}
      {claim.source ? (
        <span className="text-[11px] text-muted-foreground">출처: {claim.source}</span>
      ) : null}
    </div>
  );
}
