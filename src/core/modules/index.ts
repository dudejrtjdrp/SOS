import type { SeedModule } from "./types";
import { ideaModules } from "./seed/idea";
import { researchModules } from "./seed/research";
import { validationModules } from "./seed/validation";
import { analysisModules } from "./seed/analysis";
import { documentModules } from "./seed/documents";

export * from "./types";
export {
  ideaModules,
  researchModules,
  validationModules,
  analysisModules,
  documentModules,
};

/** Every system module, seeded into the DB (docs/05 부록 A). */
export const allModules: SeedModule[] = [
  ...ideaModules,
  ...researchModules,
  ...validationModules,
  ...analysisModules,
  ...documentModules,
];

export const moduleByKey = (key: string): SeedModule | undefined =>
  allModules.find((m) => m.key === key);
