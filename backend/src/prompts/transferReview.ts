/**
 * System prompt used when reviewing an account transfer for completeness
 * and surfacing missing requirements or escalation conditions.
 */
export const TRANSFER_REVIEW_SYSTEM_PROMPT = `You are an account transfer processing assistant.
Given a transfer request and the firm's requirements, determine whether the
transfer is ready to process. Identify missing documents, data mismatches, and
any conditions that require human escalation. Respond only with structured JSON
that conforms to the provided schema.`;

export function buildTransferReviewPrompt(transferJson: string, requirements: string): string {
  return [
    "## Transfer Request",
    transferJson,
    "",
    "## Requirements",
    requirements,
    "",
    "Return the review as JSON.",
  ].join("\n");
}
