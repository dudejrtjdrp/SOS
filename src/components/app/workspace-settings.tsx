"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { updateWorkspace } from "@/server/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Plan = "free" | "pro" | "team";

/** Owner-only form to edit a workspace's name, plan and monthly token budget. */
export function WorkspaceSettings({
  workspaceId,
  name: initialName,
  plan: initialPlan,
  tokenBudgetMonthly: initialBudget,
}: {
  workspaceId: string;
  name: string;
  plan: Plan;
  tokenBudgetMonthly: number;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [plan, setPlan] = React.useState<Plan>(initialPlan);
  const [budget, setBudget] = React.useState(String(initialBudget));
  const [busy, setBusy] = React.useState(false);

  const budgetNum = Number(budget.replace(/[,\s]/g, ""));
  const budgetValid = Number.isInteger(budgetNum) && budgetNum >= 0;
  const dirty =
    name.trim() !== initialName ||
    plan !== initialPlan ||
    (budgetValid && budgetNum !== initialBudget);
  const canSave = dirty && name.trim().length > 0 && budgetValid && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    const r = await updateWorkspace({
      workspaceId,
      name: name.trim(),
      plan,
      tokenBudgetMonthly: budgetNum,
    });
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success("워크스페이스 설정을 저장했습니다.");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">워크스페이스 설정</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        이름과 요금제, 월 토큰 예산을 관리합니다. 소유자만 수정할 수 있습니다.
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ws-name">이름</Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="워크스페이스 이름"
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ws-plan">요금제</Label>
            <Select
              id="ws-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
            >
              <option value="free">무료 (Free)</option>
              <option value="pro">프로 (Pro)</option>
              <option value="team">팀 (Team)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ws-budget">월 토큰 예산</Label>
            <Input
              id="ws-budget"
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="2000000"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <p className="text-[11px] text-muted-foreground">
              {budgetValid
                ? `${budgetNum.toLocaleString("ko-KR")} 토큰 / 월`
                : "0 이상의 숫자를 입력하세요."}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={!canSave}>
            {busy && <Loader2Icon className="size-4 animate-spin" />}
            저장
          </Button>
        </div>
      </div>
    </section>
  );
}
