import {
  ConverseCommand,
  type ConverseCommandOutput,
  type Message,
} from "@aws-sdk/client-bedrock-runtime";
import { bedrock, BEDROCK_MODEL_ID } from "../aws/bedrock.js";
import { logger } from "../utils/logger.js";
import {
  AnalyzeResultSchema,
  FollowUpResultSchema,
  parseModelJson,
  type AnalyzeResult,
  type FollowUpResult,
} from "../schemas/ai.js";
import {
  ANALYZE_SYSTEM,
  FOLLOWUP_SYSTEM,
  buildAnalyzeUser,
  buildFollowUpUser,
} from "../prompts/transferPrompts.js";
import type { AnalysisContext } from "./aiContext.js";
import type { z } from "zod";

/**
 * Bedrock-backed AI service (architecture doc sections 20-21).
 *
 * - Calls the model via the Converse API with a system prompt that enforces
 *   grounding + JSON-only output.
 * - Validates the response against a Zod schema (structured output).
 * - Guardrail: on invalid JSON, retries once with a corrective instruction,
 *   then fails loudly rather than returning an unvalidated payload.
 */
export class AiService {
  constructor(
    private readonly client = bedrock,
    private readonly modelId = BEDROCK_MODEL_ID
  ) {}

  /** Explain the risk and recommend the next action, grounded in firm procedure. */
  async analyzeTransfer(ctx: AnalysisContext): Promise<AnalyzeResult> {
    return this.invokeStructured(
      ANALYZE_SYSTEM,
      buildAnalyzeUser(ctx),
      AnalyzeResultSchema,
      { maxTokens: 1200, temperature: 0.2 }
    );
  }

  /** Draft an advisor-reviewed client follow-up message. */
  async generateFollowUp(ctx: AnalysisContext): Promise<FollowUpResult> {
    return this.invokeStructured(
      FOLLOWUP_SYSTEM,
      buildFollowUpUser(ctx),
      FollowUpResultSchema,
      { maxTokens: 900, temperature: 0.4 }
    );
  }

  /* ------------------------- internals ------------------------- */

  private async invokeStructured<S extends z.ZodTypeAny>(
    system: string,
    user: string,
    schema: S,
    cfg: { maxTokens: number; temperature: number }
  ): Promise<z.output<S>> {
    const messages: Message[] = [
      { role: "user", content: [{ text: user }] },
    ];

    const first = await this.converse(system, messages, cfg);
    try {
      return parseModelJson(schema, first);
    } catch (err) {
      logger.warn("AI output failed validation; retrying once", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Guardrail retry: feed back the invalid output and demand strict JSON.
    const retryMessages: Message[] = [
      ...messages,
      { role: "assistant", content: [{ text: first }] },
      {
        role: "user",
        content: [
          {
            text:
              "Your previous response was not valid JSON matching the required " +
              "schema. Respond again with ONLY the JSON object, no prose, no " +
              "markdown fences.",
          },
        ],
      },
    ];
    const second = await this.converse(system, retryMessages, cfg);
    return parseModelJson(schema, second);
  }

  private async converse(
    system: string,
    messages: Message[],
    cfg: { maxTokens: number; temperature: number }
  ): Promise<string> {
    const out: ConverseCommandOutput = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: system }],
        messages,
        inferenceConfig: {
          maxTokens: cfg.maxTokens,
          temperature: cfg.temperature,
        },
      })
    );

    const text = out.output?.message?.content
      ?.map((b) => ("text" in b ? b.text : ""))
      .join("")
      .trim();

    if (!text) {
      throw new Error("Model returned an empty response");
    }
    return text;
  }
}
