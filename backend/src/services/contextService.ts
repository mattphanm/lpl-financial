import { TransferService } from "./transferService.js";
import { RagService } from "./ragService.js";
import type { AnalysisContext } from "./aiContext.js";
import type { TransferDetail } from "../types/index.js";

/**
 * Assembles the `AnalysisContext` for a transfer: structured facts + computed
 * risk (via TransferService) combined with retrieved firm-procedure chunks
 * (via RagService). This is the only place DynamoDB facts and S3/KB rules meet
 * (architecture doc section 18) — they are never combined in storage.
 */
export class ContextService {
  constructor(
    private readonly transfers = new TransferService(),
    private readonly rag = new RagService()
  ) {}

  /** Build context for a transfer, or null if the transfer does not exist. */
  async build(transferId: string, topK = 4): Promise<AnalysisContext | null> {
    const detail = await this.transfers.getDetail(transferId);
    if (!detail) return null;

    const retrievalQuery = this.buildRetrievalQuery(detail);
    const knowledge = await this.rag.query(retrievalQuery, topK);

    return { detail, knowledge, retrievalQuery };
  }

  /**
   * Turn the transfer's situation into a natural-language KB query, emphasizing
   * the account type and the specific blocking/missing requirements so the KB
   * returns the governing procedure (e.g. the beneficiary-form rule).
   */
  private buildRetrievalQuery(detail: TransferDetail): string {
    const { account, transfer, requirements } = detail;
    const accountType = account?.accountType ?? "account";

    const blocking = requirements
      .filter((r) => r.required && r.status !== "COMPLETE" && r.status !== "VERIFIED")
      .map((r) => r.displayName);

    const parts = [
      `What is the firm procedure for a ${accountType} transfer`,
      `in status ${transfer.status} at the ${transfer.stage} stage`,
    ];
    if (blocking.length) {
      parts.push(`when the following requirements are outstanding: ${blocking.join(", ")}`);
    }
    parts.push("What is required for the transfer to proceed?");
    return parts.join(" ");
  }
}
