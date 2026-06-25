/**
 * Feature flags.
 *
 * AI_ENABLED — in-app AI generation. When false, the app hides every AI call
 * surface (module run, one-click document generation, AI chat, AI review) and
 * surfaces the copy-the-prompt / paste-the-result manual paths instead, so a
 * team can run prompts in an external LLM (ChatGPT/Claude/Gemini) rather than
 * spending API budget here.
 *
 * NEXT_PUBLIC_ so the identical value is inlined into client components (to
 * hide buttons) and available in server routes/actions (defense-in-depth).
 * Default ON — the flag must be explicitly set to the string "false" to turn
 * AI off, so a missing/unset var never breaks an existing deployment.
 */
export const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED !== "false";
