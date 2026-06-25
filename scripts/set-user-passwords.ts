/**
 * 기존 사용자에게 비밀번호를 설정한다 (이메일 발송 없음).
 *
 * 매직링크(OTP)로만 만든 계정은 비밀번호가 없어 새 이메일+비밀번호 로그인으로는
 * 들어갈 수 없다. 이 스크립트는 계정과 데이터를 그대로 둔 채, Admin API로
 * 비밀번호만 심어 password 로그인이 되도록 전환한다.
 *
 * 준비
 *   1) .env.local 에 다음이 있어야 한다 (seed 와 동일):
 *        NEXT_PUBLIC_SUPABASE_URL
 *        SUPABASE_SERVICE_ROLE_KEY      ← 서버 비밀 키 (절대 커밋 금지)
 *        NEXT_PUBLIC_SUPABASE_ANON_KEY  ← (선택) 로그인 검증용
 *   2) scripts/users.local.json 생성 — scripts/users.local.json.example 참고
 *        [{ "email": "you@startup.com", "password": "최소6자" }, ...]
 *      이 파일은 .gitignore 에 의해 커밋되지 않는다.
 *
 * 실행
 *   npm run set-passwords              # 미리보기: 무엇을 바꿀지 출력만, 변경 없음
 *   npm run set-passwords -- --apply   # 실제 적용 + 각 계정 로그인까지 검증
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type Entry = { email: string; password: string };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const apply = process.argv.includes("--apply");

function die(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function loadEntries(): Entry[] {
  let raw: string;
  try {
    raw = readFileSync("scripts/users.local.json", "utf8");
  } catch {
    return die(
      "scripts/users.local.json 를 읽을 수 없습니다. scripts/users.local.json.example 를 복사해 만드세요.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return die("users.local.json 이 올바른 JSON 이 아닙니다.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return die("users.local.json 에 [{ email, password }] 항목이 최소 1개 필요합니다.");
  }
  for (const e of parsed as Entry[]) {
    if (!e?.email || !e?.password) die(`각 항목에 email 과 password 가 모두 필요합니다: ${JSON.stringify(e)}`);
    if (e.password.length < 6) die(`비밀번호는 6자 이상이어야 합니다: ${e.email}`);
  }
  return parsed as Entry[];
}

async function main() {
  if (!url || !serviceKey) {
    die(".env.local 에 NEXT_PUBLIC_SUPABASE_URL 와 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  const entries = loadEntries();

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 이메일 → user id 매핑 (페이지네이션)
  const idByEmail = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) die(`사용자 목록 조회 실패: ${error.message}`);
    for (const u of data.users) if (u.email) idByEmail.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }

  console.log(
    apply
      ? "▶ 적용 모드 (--apply): 비밀번호를 설정하고 로그인까지 검증합니다.\n"
      : "▶ 미리보기 모드: 아무것도 변경하지 않습니다. 실제 적용은 `-- --apply`.\n",
  );

  let ok = 0;
  let fail = 0;
  for (const { email, password } of entries) {
    const id = idByEmail.get(email.toLowerCase());
    if (!id) {
      console.log(`✗ ${email} — 해당 이메일의 사용자가 없습니다`);
      fail++;
      continue;
    }
    if (!apply) {
      console.log(`· ${email} — 비밀번호 설정 예정 (id ${id})`);
      continue;
    }

    const { error: upErr } = await admin.auth.admin.updateUserById(id, {
      password,
      email_confirm: true,
    });
    if (upErr) {
      console.log(`✗ ${email} — 설정 실패: ${upErr.message}`);
      fail++;
      continue;
    }

    // Admin 으로 비번을 심어도 password 로그인이 실제로 되는지 anon 키로 검증
    let verdict = "검증 건너뜀 (NEXT_PUBLIC_SUPABASE_ANON_KEY 없음)";
    if (anonKey) {
      const probe = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: inErr } = await probe.auth.signInWithPassword({ email, password });
      verdict = inErr ? `⚠ 로그인 검증 실패: ${inErr.message}` : "로그인 검증 OK ✓";
    }
    console.log(`✓ ${email} — 비밀번호 설정됨 · ${verdict}`);
    ok++;
  }

  console.log(`\n완료: 성공 ${ok}, 실패 ${fail}${apply ? "" : " (미리보기)"}`);
  if (apply && fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\n실패:", e);
  process.exit(1);
});
