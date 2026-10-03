import { TransferRepository } from "../repositories/transferRepository.js";
import { ClientRepository } from "../repositories/clientRepository.js";
import { AccountRepository } from "../repositories/accountRepository.js";
import { RequirementRepository } from "../repositories/requirementRepository.js";
import { InteractionRepository } from "../repositories/interactionRepository.js";
import { RiskService } from "./riskService.js";
import type {
  DashboardTransfer,
  ReviewStatus,
  Transfer,
  TransferDetail,
} from "../types/index.js";

export class TransferService {
  constructor(
    private readonly transfers = new TransferRepository(),
    private readonly clients = new ClientRepository(),
    private readonly accounts = new AccountRepository(),
    private readonly requirements = new RequirementRepository(),
    private readonly interactions = new InteractionRepository(),
    private readonly risk = new RiskService()
  ) {}

  /** GET /api/transfers — dashboard rows with risk computed per transfer. */
  async listDashboard(): Promise<DashboardTransfer[]> {
    const now = new Date();
    const [transfers, clients, accounts] = await Promise.all([
      this.transfers.findAll(),
      this.clients.findAll(),
      this.accounts.findAll(),
    ]);
    const clientById = new Map(clients.map((c) => [c.clientId, c]));
    const accountById = new Map(accounts.map((a) => [a.accountId, a]));

    const rows: DashboardTransfer[] = [];
    for (const t of transfers) {
      const reqs = await this.requirements.findByTransferId(t.transferId);
      const acts = await this.interactions.findByTransferId(t.transferId);
      const risk = this.risk.score(t, reqs, acts, now);
      rows.push({
        transferId: t.transferId,
        clientName: clientById.get(t.clientId)?.name ?? "Unknown",
        accountType: accountById.get(t.accountId)?.accountType ?? "Unknown",
        transferAmount: t.transferAmount,
        status: t.status,
        riskLevel: risk.level,
        riskReasons: risk.reasons,
        daysSinceActivity: this.risk.daysSinceActivity(t, now),
        reviewStatus: t.reviewStatus ?? "ACTIVE",
        addressedAt: t.addressedAt ?? null,
        addressedBy: t.addressedBy ?? null,
      });
    }
    // Highest risk first for the advisor dashboard.
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    rows.sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);
    return rows;
  }

  /** GET /api/transfers/:id — full detail payload. */
  async getDetail(transferId: string): Promise<TransferDetail | null> {
    const transfer = await this.transfers.findById(transferId);
    if (!transfer) return null;

    const [client, account, requirements, interactions] = await Promise.all([
      this.clients.findById(transfer.clientId),
      this.accounts.findById(transfer.accountId),
      this.requirements.findByTransferId(transferId),
      this.interactions.findByTransferId(transferId),
    ]);

    const risk = this.risk.score(transfer, requirements, interactions);
    const normalizedTransfer: Transfer = {
      ...transfer,
      reviewStatus: transfer.reviewStatus ?? "ACTIVE",
      addressedAt: transfer.addressedAt ?? null,
      addressedBy: transfer.addressedBy ?? null,
    };
    return {
      client,
      account,
      transfer: normalizedTransfer,
      requirements,
      interactions,
      risk,
    };
  }

  /**
   * PATCH /api/transfers/:id/progress — marks a transfer in progress (or
   * returns it to active). Shared state so advisors avoid duplicate outreach.
   * `addressedBy` is required when marking in progress for real attribution.
   * Returns the updated transfer, or null if it doesn't exist.
   */
  async setProgress(
    transferId: string,
    reviewStatus: ReviewStatus,
    addressedBy?: string | null
  ): Promise<Transfer | null> {
    if (reviewStatus === "IN_PROGRESS") {
      const by = addressedBy?.trim();
      if (!by) {
        throw new Error("addressedBy is required when marking in progress");
      }
      return this.transfers.setReviewState(
        transferId,
        "IN_PROGRESS",
        new Date().toISOString(),
        by
      );
    }

    // Returning to active clears the attribution.
    return this.transfers.setReviewState(transferId, "ACTIVE", null, null);
  }
}
