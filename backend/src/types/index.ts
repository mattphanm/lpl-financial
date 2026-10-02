export type TransferStatus =
  | "received"
  | "in_review"
  | "needs_info"
  | "escalated"
  | "ready"
  | "completed"
  | "rejected";

export interface Transfer {
  id: string;
  accountId: string;
  deliveringFirm: string;
  receivingFirm: string;
  assetValue: number;
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  ownerName: string;
  accountType: string;
  openedAt: string;
}

export interface TransferReview {
  ready: boolean;
  missingRequirements: string[];
  escalationReasons: string[];
  summary: string;
}
