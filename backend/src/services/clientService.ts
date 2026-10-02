import { ClientRepository } from "../repositories/clientRepository.js";
import { AccountRepository } from "../repositories/accountRepository.js";
import { TransferRepository } from "../repositories/transferRepository.js";
import { RequirementRepository } from "../repositories/requirementRepository.js";
import { InteractionRepository } from "../repositories/interactionRepository.js";
import { RiskService } from "./riskService.js";
import type {
  ClientDetail,
  ClientTransferSummary,
  RiskLevel,
} from "../types/index.js";

/**
 * Client-centric view (GET /api/clients/:id): the client profile plus all of
 * their accounts, transfers (each with computed risk), and recent interactions.
 * Reuses the existing repositories and the rules-based risk engine.
 */
export class ClientService {
  constructor(
    private readonly clients = new ClientRepository(),
    private readonly accounts = new AccountRepository(),
    private readonly transfers = new TransferRepository(),
    private readonly requirements = new RequirementRepository(),
    private readonly interactions = new InteractionRepository(),
    private readonly risk = new RiskService()
  ) {}

  /** Returns the full client detail, or null if the client does not exist. */
  async getDetail(clientId: string): Promise<ClientDetail | null> {
    const client = await this.clients.findById(clientId);
    if (!client) return null;

    const now = new Date();
    const [accounts, transfers, interactions] = await Promise.all([
      this.accounts.findByClientId(clientId),
      this.transfers.findByClientId(clientId),
      this.interactions.findByClientId(clientId),
    ]);

    const accountTypeById = new Map(
      accounts.map((a) => [a.accountId, a.accountType])
    );

    const summaries: ClientTransferSummary[] = [];
    for (const t of transfers) {
      const reqs = await this.requirements.findByTransferId(t.transferId);
      const acts = interactions.filter((i) => i.transferId === t.transferId);
      const risk = this.risk.score(t, reqs, acts, now);
      summaries.push({
        transfer: t,
        accountType: accountTypeById.get(t.accountId) ?? "Unknown",
        risk,
        daysSinceActivity: this.risk.daysSinceActivity(t, now),
      });
    }

    // Highest risk first for the advisor's view.
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    summaries.sort((a, b) => order[a.risk.level] - order[b.risk.level]);

    return {
      client,
      accounts,
      transfers: summaries,
      interactions,
      overallRisk: this.highestRisk(summaries),
    };
  }

  private highestRisk(summaries: ClientTransferSummary[]): RiskLevel {
    if (summaries.some((s) => s.risk.level === "HIGH")) return "HIGH";
    if (summaries.some((s) => s.risk.level === "MEDIUM")) return "MEDIUM";
    return "LOW";
  }
}
