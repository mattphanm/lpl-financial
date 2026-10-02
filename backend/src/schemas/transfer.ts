import { z } from "zod";

export const transferStatusSchema = z.enum([
  "received",
  "in_review",
  "needs_info",
  "escalated",
  "ready",
  "completed",
  "rejected",
]);

export const transferSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  deliveringFirm: z.string(),
  receivingFirm: z.string(),
  assetValue: z.number().nonnegative(),
  status: transferStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TransferInput = z.infer<typeof transferSchema>;

/** Structured output expected back from the LLM transfer review. */
export const transferReviewSchema = z.object({
  ready: z.boolean(),
  missingRequirements: z.array(z.string()),
  escalationReasons: z.array(z.string()),
  summary: z.string(),
});

export type TransferReview = z.infer<typeof transferReviewSchema>;
