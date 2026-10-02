import {
  RetrieveCommand,
  type RetrieveCommandOutput,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { bedrockAgent, KNOWLEDGE_BASE_ID } from "../aws/bedrockAgent.js";
import { logger } from "../utils/logger.js";
import type { RagChunk } from "./aiContext.js";

/**
 * RAG over the TransferReady Knowledge Base (S3-backed firm procedure docs).
 * Returns source-cited chunks the AI uses to ground its answers. Retrieval
 * failures are non-fatal: we log and return [] so analysis can still proceed
 * (ungrounded), matching the "guardrails" posture (architecture doc section 21).
 */
export class RagService {
  constructor(
    private readonly knowledgeBaseId: string = KNOWLEDGE_BASE_ID,
    private readonly client = bedrockAgent
  ) {}

  /**
   * Semantic search against the KB.
   * @param query natural-language description of the situation
   * @param topK  number of chunks to return (default 4)
   */
  async query(query: string, topK = 4): Promise<RagChunk[]> {
    try {
      const out: RetrieveCommandOutput = await this.client.send(
        new RetrieveCommand({
          knowledgeBaseId: this.knowledgeBaseId,
          retrievalQuery: { text: query },
          retrievalConfiguration: {
            vectorSearchConfiguration: { numberOfResults: topK },
          },
        })
      );

      const results = out.retrievalResults ?? [];
      return results.map((r) => ({
        text: r.content?.text ?? "",
        source: extractSource(r.location),
        score: r.score,
      }));
    } catch (err) {
      logger.warn("RAG retrieval failed; proceeding without knowledge", {
        knowledgeBaseId: this.knowledgeBaseId,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }
}

/** Pull a human-readable source (S3 URI or doc name) from a retrieval location. */
function extractSource(location: unknown): string {
  const loc = location as
    | { s3Location?: { uri?: string }; type?: string }
    | undefined;
  if (loc?.s3Location?.uri) {
    const uri = loc.s3Location.uri;
    // Prefer the trailing filename for readability, keep full uri as fallback.
    const name = uri.split("/").pop();
    return name && name.length > 0 ? name : uri;
  }
  return loc?.type ?? "knowledge-base";
}
