import type { Transfer } from "../types/index.js";

/**
 * Data access for transfers. Backed by DynamoDB in production;
 * returns an empty set until wired to a live table.
 */
export class TransferRepository {
  async findAll(): Promise<Transfer[]> {
    // TODO: query DynamoDB transfers table
    return [];
  }

  async findById(_id: string): Promise<Transfer | null> {
    // TODO: get item from DynamoDB transfers table
    return null;
  }
}
