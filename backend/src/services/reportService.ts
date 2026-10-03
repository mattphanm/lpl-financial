import { TransferRepository } from "../repositories/transferRepository.js";
import { ClientRepository } from "../repositories/clientRepository.js";
import { AccountRepository } from "../repositories/accountRepository.js";
import { RequirementRepository } from "../repositories/requirementRepository.js";
import { InteractionRepository } from "../repositories/interactionRepository.js";
import { RiskService } from "./riskService.js";
import type {
  DashboardTransfer,
  ReportsSummary,
  RiskLevel,
  TransferStatus,
} from "../types/index.js";

/**
 * Portfolio-wide metrics (GET /api/reports, architecture doc section 13).
 * Aggregates every transfer with its computed risk into counts, totals, and a
 * prioritized "attention needed" list. Reuses the repositories + risk engine.
 */
export class ReportService {
  constructor(
    private readonly transfers = new TransferRepository(),
    private readonly clients = new ClientRepository(),
    private readonly accounts = new AccountRepository(),
    private readonly requirements = new RequirementRepository(),
    private readonly interactions = new InteractionRepository(),
    private readonly risk = new RiskService()
  ) {}

  async build(): Promise<ReportsSummary> {
    const now = new Date();
    const [transfers, clients, accounts, allReqs] = await Promise.all([
      this.transfers.findAll(),
      this.clients.findAll(),
      this.accounts.findAll(),
      this.requirements.findAll(),
    ]);

    const clientById = new Map(clients.map((c) => [c.clientId, c]));
    const accountById = new Map(accounts.map((a) => [a.accountId, a]));
    const reqsByTransfer = new Map<string, typeof allReqs>();
    for (const r of allReqs) {
      const list = reqsByTransfer.get(r.transferId) ?? [];
      list.push(r);
      reqsByTransfer.set(r.transferId, list);
    }

    const byStatus = emptyStatusCounts();
    const byRisk: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };

    let blockedCount = 0;
    let stalledCount = 0;
    let totalTransferAmount = 0;
    let atRiskTransferAmount = 0;
    let idleSum = 0;
    let idleCount = 0;
    let completeCount = 0;

    const rows: DashboardTransfer[] = [];

    for (const t of transfers) {
      const reqs = reqsByTransfer.get(t.transferId) ?? [];
      const acts = await this.interactions.findByTransferId(t.transferId);
      const risk = this.risk.score(t, reqs, acts, now);
      const days = this.risk.daysSinceActivity(t, now);

      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      byRisk[risk.level] += 1;

      totalTransferAmount += t.transferAmount;
      if (risk.level === "HIGH") atRiskTransferAmount += t.transferAmount;

      const isBlocked = reqs.some(
        (r) => r.required && r.status === "MISSING" && r.blocksNextStage
      );
      if (isBlocked) blockedCount += 1;

      if (t.status !== "COMPLETE") {
        if (days >= 5) stalledCount += 1;
        idleSum += days;
        idleCount += 1;
      } else {
        completeCount += 1;
      }

      rows.push({
        transferId: t.transferId,
        clientName: clientById.get(t.clientId)?.name ?? "Unknown",
        accountType: accountById.get(t.accountId)?.accountType ?? "Unknown",
        transferAmount: t.transferAmount,
        status: t.status,
        riskLevel: risk.level,
        riskReasons: risk.reasons,
        daysSinceActivity: days,
        reviewStatus: t.reviewStatus ?? "ACTIVE",
        addressedAt: t.addressedAt ?? null,
        addressedBy: t.addressedBy ?? null,
      });
    }

    // Attention list: HIGH/MEDIUM first, then most-idle first.
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    const attentionNeeded = rows
      .filter((r) => r.riskLevel !== "LOW")
      .sort(
        (a, b) =>
          order[a.riskLevel] - order[b.riskLevel] ||
          b.daysSinceActivity - a.daysSinceActivity
      )
      .slice(0, 10);

    return {
      totalTransfers: transfers.length,
      byStatus,
      byRisk,
      blockedCount,
      stalledCount,
      totalTransferAmount,
      atRiskTransferAmount,
      avgDaysSinceActivity: idleCount ? round1(idleSum / idleCount) : 0,
      completionRate: transfers.length
        ? round2(completeCount / transfers.length)
        : 0,
      attentionNeeded,
    };
  }
}

function emptyStatusCounts(): Record<TransferStatus, number> {
  return {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    WAITING_ON_CLIENT: 0,
    INTERNAL_REVIEW: 0,
    CUSTODIAN_PROCESSING: 0,
    COMPLETE: 0,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
