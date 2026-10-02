import type { AnalysisContext, RagChunk } from "../services/aiContext.js";
import type { TransferDetail } from "../types/index.js";

/**
 * Prompt templates for the Bedrock-backed AI services.
 *
 * Design: the model is given (1) structured facts from DynamoDB, (2) the
 * rules-based risk result, and (3) retrieved firm-procedure chunks (RAG). It is
 * instructed to ground every claim in those inputs and to cite the procedure
 * chunks, then return JSON matching the schema in `schemas/ai.ts`.
 */

/* --------------------------- Formatters -------------------------- */

function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

/** Render DynamoDB facts + risk as a compact, model-friendly block. */
export function formatFacts(detail: TransferDetail): string {
  const { client, account, transfer, requirements, interactions, risk } =
    detail;

  const reqLines = requirements.length
    ? requirements
        .map(
          (r) =>
            `  - ${r.displayName} [${r.type}]: ${r.status}` +
            `${r.required ? " (required)" : ""}` +
            `${r.blocksNextStage ? " (BLOCKS next stage)" : ""}`
        )
        .join("\n")
    : "  (none on record)";

  const actLines = interactions.length
    ? interactions
        .slice(-6)
        .map(
          (i) =>
            `  - ${i.timestamp} ${i.direction} ${i.type}: ${i.summary}`
        )
        .join("\n")
    : "  (none on record)";

  return [
    `CLIENT: ${client?.name ?? "Unknown"} (${client?.email ?? "no email"}, ` +
      `prefers ${client?.preferredContactMethod ?? "EMAIL"})`,
    client?.relationshipNotes
      ? `RELATIONSHIP NOTES: ${client.relationshipNotes}`
      : null,
    `ACCOUNT: ${account?.accountType ?? "Unknown"} at ` +
      `${account?.institution ?? "Unknown"}, est. assets ` +
      `$${(account?.estimatedAssets ?? 0).toLocaleString()}`,
    `TRANSFER: id=${transfer.transferId} amount=$${transfer.transferAmount.toLocaleString()} ` +
      `status=${transfer.status} stage=${transfer.stage} ` +
      `completion=${transfer.completionPercent}%`,
    `ACTIVITY: ${daysSince(transfer.lastActivityAt)} days since last activity; ` +
      `unresolvedClientQuestion=${transfer.hasUnresolvedClientQuestion}`,
    `RISK: ${risk.level} (score ${risk.score})`,
    `RISK REASONS:\n${risk.reasons.map((r) => `  - ${r}`).join("\n")}`,
    `REQUIREMENTS:\n${reqLines}`,
    `RECENT INTERACTIONS:\n${actLines}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Render retrieved firm-procedure chunks with stable [S1], [S2] refs. */
export function formatKnowledge(chunks: RagChunk[]): string {
  if (!chunks.length) {
    return "(no firm-procedure documents retrieved)";
  }
  return chunks
    .map(
      (c, i) =>
        `[S${i + 1}] source=${c.source}\n"""${c.text.trim()}"""`
    )
    .join("\n\n");
}

/* ----------------------------- Analyze --------------------------- */

export const ANALYZE_SYSTEM = [
  "You are a compliance-aware operations assistant for a financial advisory firm.",
  "You help advisors understand why an account transfer is at risk and what to do next.",
  "Ground every statement ONLY in the FACTS and FIRM PROCEDURES provided.",
  "Do not invent policies, numbers, dates, or client details.",
  "When you rely on a firm procedure, cite it using its [S#] reference.",
  "If the procedures do not cover something, say so rather than guessing.",
  "Respond with a SINGLE JSON object and no other text.",
].join(" ");

export function buildAnalyzeUser(ctx: AnalysisContext): string {
  return [
    "FACTS (from system of record):",
    formatFacts(ctx.detail),
    "",
    "FIRM PROCEDURES (retrieved; cite with [S#]):",
    formatKnowledge(ctx.knowledge),
    "",
    "TASK: Explain the risk and recommend the next action for the advisor.",
    "Return JSON with EXACTLY these fields:",
    "{",
    '  "summary": string,            // one line: who and why',
    '  "riskExplanation": string,    // plain English, grounded in facts + procedures',
    '  "recommendedAction": string,  // the single most important next action',
    '  "nextSteps": string[],        // 1-6 concrete steps, most important first',
    '  "citations": [ { "ref": "S1", "source": string, "quote": string } ]',
    "}",
    "Use the exact [S#] refs from the FIRM PROCEDURES section for citations.",
  ].join("\n");
}

/* ---------------------------- Follow-up -------------------------- */

export const FOLLOWUP_SYSTEM = [
  "You draft concise, professional client-facing follow-up messages for a financial advisor.",
  "The advisor will review and send the message; never claim it was already sent.",
  "Be warm but direct. Clearly state what the client must do and why it matters.",
  "Ground the ask ONLY in the FACTS and FIRM PROCEDURES provided; do not invent requirements.",
  "Do not include legal/tax advice. Do not promise specific completion dates.",
  "Respond with a SINGLE JSON object and no other text.",
].join(" ");

export function buildFollowUpUser(ctx: AnalysisContext): string {
  const name = ctx.detail.client?.name ?? "the client";
  const channel = ctx.detail.client?.preferredContactMethod ?? "EMAIL";
  return [
    "FACTS (from system of record):",
    formatFacts(ctx.detail),
    "",
    "FIRM PROCEDURES (for grounding the ask):",
    formatKnowledge(ctx.knowledge),
    "",
    `TASK: Draft a ${channel} follow-up to ${name} that moves this transfer forward.`,
    "Focus on the specific blocking item(s) and the exact action needed from the client.",
    "Return JSON with EXACTLY these fields:",
    "{",
    '  "subject": string,   // concise subject line',
    '  "body": string,      // full message, addressed to the client, signed by their advisor',
    '  "channel": "EMAIL" | "PHONE"',
    "}",
    `Set "channel" to "${channel}".`,
  ].join("\n");
}
