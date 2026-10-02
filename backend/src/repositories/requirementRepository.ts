import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../aws/dynamo.js";
import type { Requirement } from "../types/index.js";

export class RequirementRepository {
  async findByTransferId(transferId: string): Promise<Requirement[]> {
    const items: Requirement[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await dynamo.send(
        new ScanCommand({
          TableName: TABLES.requirements,
          FilterExpression: "transferId = :t",
          ExpressionAttributeValues: { ":t": transferId },
          ExclusiveStartKey,
        })
      );
      items.push(...((res.Items as Requirement[]) ?? []));
      ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);
    return items;
  }

  async findAll(): Promise<Requirement[]> {
    const items: Requirement[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await dynamo.send(
        new ScanCommand({ TableName: TABLES.requirements, ExclusiveStartKey })
      );
      items.push(...((res.Items as Requirement[]) ?? []));
      ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);
    return items;
  }
}
