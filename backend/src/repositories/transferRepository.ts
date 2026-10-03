import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../aws/dynamo.js";
import type { ReviewStatus, Transfer } from "../types/index.js";

export class TransferRepository {
  async findAll(): Promise<Transfer[]> {
    const items: Transfer[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await dynamo.send(
        new ScanCommand({ TableName: TABLES.transfers, ExclusiveStartKey })
      );
      items.push(...((res.Items as Transfer[]) ?? []));
      ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);
    return items;
  }

  async findById(transferId: string): Promise<Transfer | null> {
    const res = await dynamo.send(
      new GetCommand({ TableName: TABLES.transfers, Key: { transferId } })
    );
    return (res.Item as Transfer) ?? null;
  }

  async findByClientId(clientId: string): Promise<Transfer[]> {
    const items: Transfer[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await dynamo.send(
        new ScanCommand({
          TableName: TABLES.transfers,
          FilterExpression: "clientId = :c",
          ExpressionAttributeValues: { ":c": clientId },
          ExclusiveStartKey,
        })
      );
      items.push(...((res.Items as Transfer[]) ?? []));
      ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);
    return items;
  }

  /**
   * Sets the shared review state on a transfer. Used by the "in progress"
   * workflow so advisors don't duplicate outreach. Returns the updated
   * transfer, or null if it doesn't exist.
   */
  async setReviewState(
    transferId: string,
    reviewStatus: ReviewStatus,
    addressedAt: string | null,
    addressedBy: string | null
  ): Promise<Transfer | null> {
    try {
      const res = await dynamo.send(
        new UpdateCommand({
          TableName: TABLES.transfers,
          Key: { transferId },
          // Only update an existing transfer; never create a stub row.
          ConditionExpression: "attribute_exists(transferId)",
          UpdateExpression:
            "SET reviewStatus = :s, addressedAt = :at, addressedBy = :by",
          ExpressionAttributeValues: {
            ":s": reviewStatus,
            ":at": addressedAt,
            ":by": addressedBy,
          },
          ReturnValues: "ALL_NEW",
        })
      );
      return (res.Attributes as Transfer) ?? null;
    } catch (err) {
      // Missing transfer -> treat as not found rather than a 500.
      if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
        return null;
      }
      throw err;
    }
  }
}
