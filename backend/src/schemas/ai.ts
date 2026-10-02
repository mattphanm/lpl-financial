import { z } from "zod";

/**
 * Structured-output contracts for the Bedrock-backed AI services.
 *
 * The model is instructed to return JSON matching these shapes. We validate the
 * response with Zod so routes always emit a well-formed payload (architecture
 * doc sections 20-21: structured output + guardrails).
 */

/* --------------------------- Citations --------------------------- */

/** A single source-cited chunk retrieved from the Knowledge Base (RAG). */
export const CitationSchema = z.object({
  /** Short label the model used to reference this source, e.g. "S1". */
  ref: z.string().min(1),
  /** The firm document the chunk came from (S3 URI or filename). */
  source: z.string().min(1),
  /** The quoted/paraphrased policy text used to ground the answer. */
  quote: z.string().min(1),
});
export type Citation = z.infer<typeof CitationSchema>;

/* ----------------------------- Analyze --------------------------- */

/**
 * Result of POST /api/transfers/:id/analyze — a plain-English explanation of the
 * risk plus a concrete recommended action, grounded in firm procedure.
 */
export const AnalyzeResultSchema = z.object({
  /** One-line summary of the situation (who/why). */
  summary: z.string().min(1),
  /** Why the transfer is at risk, in plain English, grounded in the facts. */
  riskExplanation: z.string().min(1),
  /** The single most important next action the advisor should take. */
  recommendedAction: z.string().min(1),
  /** Ordered, concrete next steps (most important first). */
  nextSteps: z.array(z.string().min(1)).min(1).max(6),
  /** Firm-procedure sources the explanation is grounded in. May be empty. */
  citations: z.array(CitationSchema).default([]),
});
export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;

/* ---------------------------- Follow-up -------------------------- */

/**
 * Result of POST /api/transfers/:id/follow-up — a draft client email for the
 * advisor to review and send. Advisor review is required before sending.
 */
export const FollowUpResultSchema = z.object({
  /** Email subject line. */
  subject: z.string().min(1),
  /** Full email body (plain text), addressed to the client. */
  body: z.string().min(1),
  /** The channel this draft is intended for. */
  channel: z.enum(["EMAIL", "PHONE"]).default("EMAIL"),
});
export type FollowUpResult = z.infer<typeof FollowUpResultSchema>;

/* --------------------------- Parse helpers ----------------------- */

/**
 * Extract the first JSON object from a model response that may contain stray
 * prose or markdown code fences, then validate it against `schema`.
 * Throws if no valid JSON object can be parsed/validated.
 */
export function parseModelJson<S extends z.ZodTypeAny>(
  schema: S,
  raw: string
): z.output<S> {
  const cleaned = stripToJsonObject(raw);
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error("Model did not return valid JSON");
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Model JSON failed schema validation: ${result.error.message}`
    );
  }
  return result.data;
}

/** Remove markdown fences and isolate the outermost {...} JSON object. */
function stripToJsonObject(raw: string): string {
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return s.slice(start, end + 1);
  }
  return s;
}
