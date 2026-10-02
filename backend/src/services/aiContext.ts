import type { TransferDetail } from "../types/index.js";

/** A single source-cited chunk returned from the Knowledge Base (RAG). */
export interface RagChunk {
  /** The chunk text content. */
  text: string;
  /** Source location of the chunk (S3 URI or document name). */
  source: string;
  /** Retrieval relevance score (higher = more relevant), when available. */
  score?: number;
}

/**
 * Everything the AI needs to reason about one transfer: the structured facts
 * (DynamoDB) + computed risk + the retrieved firm procedure chunks (RAG).
 * Built by `ContextService`, consumed by `AiService`.
 */
export interface AnalysisContext {
  detail: TransferDetail;
  /** Retrieved firm-procedure chunks relevant to this transfer's situation. */
  knowledge: RagChunk[];
  /** The natural-language query used to retrieve `knowledge` (for debugging). */
  retrievalQuery: string;
}
