import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../aws/dynamo.js";
import type { Transfer } from "../types/index.js";

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
}
