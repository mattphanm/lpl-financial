/**
 * TransferReady domain types — the single source of truth, matching the live
 * DynamoDB tables (TransferReadyClients/Accounts/Transfers/Requirements/Interactions)
 * in us-east-1. Enums mirror the architecture doc sections 5-11.
 */

/* ----------------------------- Enums ----------------------------- */

export type PreferredContactMethod = "EMAIL" | "PHONE";

export type TransferStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING_ON_CLIENT"
  | "INTERNAL_REVIEW"
  | "CUSTODIAN_PROCESSING"
  | "COMPLETE";

export type TransferStage =
  | "INITIATION"
  | "DOCUMENTATION"
  | "REVIEW"
  | "CUSTODIAN"
  | "COMPLETION";

export type RequirementType =
  | "BENEFICIARY_FORM"
  | "SIGNATURE"
  | "IDENTITY_VERIFICATION"
  | "TRANSFER_FORM"
  | "ACCOUNT_STATEMENT"
  | "CUSTODIAN_APPROVAL"
  | "INTERNAL_REVIEW";

export type RequirementStatus =
  | "NOT_REQUIRED"
  | "MISSING"
  | "REQUESTED"
  | "RECEIVED"
  | "VERIFIED"
  | "COMPLETE";

export type InteractionType =
  | "CLIENT_EMAIL"
  | "ADVISOR_EMAIL"
  | "PHONE_CALL"
  | "DOCUMENT_REQUEST"
  | "DOCUMENT_RECEIVED"
  | "STATUS_UPDATE"
  | "INTERNAL_NOTE";

export type InteractionDirection = "INBOUND" | "OUTBOUND";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/* --------------------------- Entities ---------------------------- */

export interface Client {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  advisorId: string;
  preferredContactMethod: PreferredContactMethod;
  communicationPreference: string;
  relationshipNotes: string;
  createdAt: string;
}

export interface Account {
  accountId: string;
  clientId: string;
  accountType: string;
  estimatedAssets: number;
  institution: string;
  createdAt: string;
}

export interface Transfer {
  transferId: string;
  clientId: string;
  accountId: string;
  status: TransferStatus;
  stage: TransferStage;
  startedAt: string;
  lastActivityAt: string;
  completionPercent: number;
  transferAmount: number;
  assignedAdvisorId: string;
  /**
   * Explicit flag for the risk engine's "unresolved client question" rule (+1).
   * Stored on the transfer so scoring is deterministic rather than inferred
   * from interaction free-text.
   */
  hasUnresolvedClientQuestion: boolean;
}

export interface Requirement {
  requirementId: string;
  transferId: string;
  type: RequirementType;
  displayName: string;
  status: RequirementStatus;
  required: boolean;
  blocksNextStage: boolean;
  requestedAt: string;
  completedAt: string | null;
}

export interface Interaction {
  interactionId: string;
  clientId: string;
  transferId: string;
  timestamp: string;
  type: InteractionType;
  direction: InteractionDirection;
  summary: string;
  createdBy: string;
}

/* --------------------------- Derived ----------------------------- */

export interface RiskResult {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

/** Row shape for the dashboard list (GET /api/transfers). */
export interface DashboardTransfer {
  transferId: string;
  clientName: string;
  accountType: string;
  transferAmount: number;
  status: TransferStatus;
  riskLevel: RiskLevel;
  riskReasons: string[];
  daysSinceActivity: number;
}

/** Full detail payload (GET /api/transfers/:id). */
export interface TransferDetail {
  client: Client | null;
  account: Account | null;
  transfer: Transfer;
  requirements: Requirement[];
  interactions: Interaction[];
  risk: RiskResult;
}
