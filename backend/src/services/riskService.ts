import type {
  Transfer,
  Requirement,
  Interaction,
  RiskResult,
  RiskLevel,
} from "../types/index.js";

/**
 * Rules-based risk engine (architecture doc section 11). Deterministic; does NOT
 * call Bedrock. Uses the explicit `hasUnresolvedClientQuestion` flag on the transfer.
 *
 *   Transfer COMPLETE ......................... LOW (short-circuit)
 *   Required document missing ................. +3
 *   Multiple missing requirements (>= 2) ...... +2
 *   No activity >= 10 days ..................... +3
 *   else No activity >= 5 days ................. +2
 *   Unresolved client question ................ +1
 *   Recent advisor contact (<= 1 day) ......... -1
 *
 *   0-1 = LOW, 2-3 = MEDIUM, 4+ = HIGH
 */
export class RiskService {
  daysSinceActivity(transfer: Transfer, now: Date = new Date()): number {
    const last = new Date(transfer.lastActivityAt).getTime();
    return Math.floor((now.getTime() - last) / (1000 * 60 * 60 * 24));
  }

  score(
    transfer: Transfer,
    requirements: Requirement[],
    interactions: Interaction[],
    now: Date = new Date()
  ): RiskResult {
    if (transfer.status === "COMPLETE") {
      return { level: "LOW", score: 0, reasons: ["Transfer complete"] };
    }

    let score = 0;
    const reasons: string[] = [];

    const missing = requirements.filter(
      (r) => r.required && r.status === "MISSING"
    );
    if (missing.length >= 1) {
      score += 3;
      reasons.push(
        `Required document missing: ${missing.map((m) => m.displayName).join(", ")}`
      );
      if (missing.some((m) => m.blocksNextStage)) {
        reasons.push("A missing form blocks the next stage");
      }
    }
    if (missing.length >= 2) {
      score += 2;
      reasons.push(`${missing.length} required documents are missing`);
    }

    const days = this.daysSinceActivity(transfer, now);
    if (days >= 10) {
      score += 3;
      reasons.push(`${days} days since last activity`);
    } else if (days >= 5) {
      score += 2;
      reasons.push(`${days} days since last activity`);
    }

    if (transfer.hasUnresolvedClientQuestion) {
      score += 1;
      reasons.push("Unresolved client question");
    }

    const recentAdvisor = interactions.some(
      (i) =>
        i.direction === "OUTBOUND" &&
        (i.type === "ADVISOR_EMAIL" ||
          i.type === "PHONE_CALL" ||
          i.type === "STATUS_UPDATE") &&
        Math.floor(
          (now.getTime() - new Date(i.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        ) <= 1
    );
    if (recentAdvisor) {
      score -= 1;
      reasons.push("Recent advisor contact");
    }

    let level: RiskLevel;
    if (score <= 1) level = "LOW";
    else if (score <= 3) level = "MEDIUM";
    else level = "HIGH";

    return { level, score, reasons };
  }
}
