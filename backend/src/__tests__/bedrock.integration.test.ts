import "dotenv/config";
import { test, before } from "node:test";
import assert from "node:assert/strict";

import { ContextService } from "../services/contextService.js";
import { AiService } from "../services/aiService.js";
import { TransferRepository } from "../repositories/transferRepository.js";
import {
  AnalyzeResultSchema,
  FollowUpResultSchema,
} from "../schemas/ai.js";

/**
 * Integration test for Part A (AWS Bedrock) against the synthetic DynamoDB data
 * and the live Knowledge Base. Validates that, for a representative spread of
 * transfer states, the pipeline:
 *   1. builds an AnalysisContext (facts + risk + RAG),
 *   2. produces schema-valid analyze output,
 *   3. produces schema-valid follow-up output,
 *   4. grounds citations in actually-retrieved sources.
 *
 * These calls hit real Bedrock, so each case is given a generous timeout.
 */

const context = new ContextService();
const ai = new AiService();

// Representative sample across statuses/stages (see synthetic data):
//   #014 WAITING_ON_CLIENT / DOCUMENTATION  (HIGH: missing blocking form, idle)
//   #001 WAITING_ON_CLIENT + unresolved question
//   #006 IN_PROGRESS / DOCUMENTATION
//   #002 CUSTODIAN_PROCESSING / CUSTODIAN
//   #003 COMPLETE / COMPLETION               (LOW short-circuit)
const SAMPLE_IDS = [
  "TRANSFER#014",
  "TRANSFER#001",
  "TRANSFER#006",
  "TRANSFER#002",
  "TRANSFER#003",
];

const CASE_TIMEOUT_MS = 60_000;

before(async () => {
  // Guard: ensure the synthetic data is actually present before testing.
  const transfers = await new TransferRepository().findAll();
  assert.ok(
    transfers.length > 0,
    "No transfers found in DynamoDB — seed synthetic data first"
  );
});

for (const id of SAMPLE_IDS) {
  test(`analyze: ${id}`, { timeout: CASE_TIMEOUT_MS }, async () => {
    const ctx = await context.build(id);
    assert.ok(ctx, `context should build for ${id}`);

    // Facts + risk are present and well-formed.
    assert.equal(ctx.detail.transfer.transferId, id);
    assert.ok(
      ["LOW", "MEDIUM", "HIGH"].includes(ctx.detail.risk.level),
      "risk level should be a valid enum value"
    );
    assert.ok(
      Array.isArray(ctx.detail.risk.reasons),
      "risk reasons should be an array"
    );

    // AI analyze output validates against the schema.
    const result = await ai.analyzeTransfer(ctx);
    const parsed = AnalyzeResultSchema.safeParse(result);
    assert.ok(
      parsed.success,
      `analyze output must match schema: ${parsed.success ? "" : parsed.error.message}`
    );
    assert.ok(result.summary.length > 0, "summary non-empty");
    assert.ok(result.recommendedAction.length > 0, "recommendedAction non-empty");
    assert.ok(
      result.nextSteps.length >= 1 && result.nextSteps.length <= 6,
      "nextSteps within 1..6"
    );

    // Grounding: any citation must reference a source that was actually retrieved.
    const retrievedSources = new Set(ctx.knowledge.map((k) => k.source));
    if (ctx.knowledge.length > 0) {
      for (const c of result.citations) {
        assert.ok(
          retrievedSources.has(c.source),
          `citation source "${c.source}" must be one of the retrieved sources ` +
            `[${[...retrievedSources].join(", ")}]`
        );
      }
    }
  });

  test(`follow-up: ${id}`, { timeout: CASE_TIMEOUT_MS }, async () => {
    const ctx = await context.build(id);
    assert.ok(ctx, `context should build for ${id}`);

    const result = await ai.generateFollowUp(ctx);
    const parsed = FollowUpResultSchema.safeParse(result);
    assert.ok(
      parsed.success,
      `follow-up output must match schema: ${parsed.success ? "" : parsed.error.message}`
    );
    assert.ok(result.subject.length > 0, "subject non-empty");
    assert.ok(result.body.length > 0, "body non-empty");

    // Channel should match the client's preference when a client is on record.
    const pref = ctx.detail.client?.preferredContactMethod;
    if (pref) {
      assert.equal(result.channel, pref, "channel should match client preference");
    }
  });
}
