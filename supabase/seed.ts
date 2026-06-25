/**
 * Seed system modules into the database.
 * Run:  npm run seed   (reads .env.local for service-role key)
 * Idempotent — safe to re-run; it upserts modules / templates / version 1.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { allModules, type SeedModule } from "@/core/modules";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function upsertModule(m: SeedModule) {
  // 1) module (system, keyed by `key`)
  const { data: existing } = await supabase
    .from("modules")
    .select("id")
    .eq("key", m.key)
    .eq("visibility", "system")
    .maybeSingle();

  let moduleId = existing?.id as string | undefined;
  const moduleRow = {
    category: m.category,
    name: m.name,
    description: m.description,
    icon: m.icon ?? null,
    task_class: m.task_class,
  };

  if (moduleId) {
    await supabase.from("modules").update(moduleRow).eq("id", moduleId);
  } else {
    const { data, error } = await supabase
      .from("modules")
      .insert({ key: m.key, visibility: "system", workspace_id: null, ...moduleRow })
      .select("id")
      .single();
    if (error) throw error;
    moduleId = data.id;
  }

  // 2) template (one per module)
  const { data: tpl } = await supabase
    .from("prompt_templates")
    .select("id")
    .eq("module_id", moduleId)
    .maybeSingle();

  let templateId = tpl?.id as string | undefined;
  if (!templateId) {
    const { data, error } = await supabase
      .from("prompt_templates")
      .insert({ module_id: moduleId, workspace_id: null, output_kind: m.output_kind })
      .select("id")
      .single();
    if (error) throw error;
    templateId = data.id;
  } else {
    await supabase
      .from("prompt_templates")
      .update({ output_kind: m.output_kind })
      .eq("id", templateId);
  }

  // 3) version 1 (documents stash their sections in output_format)
  const outputFormat =
    m.category === "document"
      ? { kind: "document", sections: m.doc_sections ?? [] }
      : (m.output_format ?? {});

  const { data: ver, error: verErr } = await supabase
    .from("prompt_versions")
    .upsert(
      {
        prompt_template_id: templateId,
        workspace_id: null,
        version: 1,
        system_prompt: m.system_prompt,
        instructions: m.instructions,
        variables: m.variables,
        output_format: outputFormat,
        examples: m.examples ?? [],
        model_policy: { task_class: m.task_class },
      },
      { onConflict: "prompt_template_id,version" },
    )
    .select("id")
    .single();
  if (verErr) throw verErr;

  await supabase
    .from("prompt_templates")
    .update({ current_version_id: ver.id })
    .eq("id", templateId);
}

async function main() {
  console.log(`Seeding ${allModules.length} system modules…`);
  for (const m of allModules) {
    await upsertModule(m);
    process.stdout.write(".");
  }
  console.log(`\n✓ Done — ${allModules.length} modules seeded.`);
}

main().catch((e) => {
  console.error("\nSeed failed:", e);
  process.exit(1);
});
