import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../aws/dynamo.js";
import type { Interaction } from "../types/index.js";

export class InteractionRepository {
  async findByTransferId(transferId: string): Promise<Interaction[]> {
    return this.scanFiltered("transferId", transferId);
  }

  async findByClientId(clientId: string): Promise<Interaction[]> {
    return this.scanFiltered("clientId", clientId);
  }

  private async scanFiltered(field: string, value: string): Promise<Interaction[]> {
    const items: Interaction[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await dynamo.send(
        new ScanCommand({
          TableName: TABLES.interactions,
          FilterExpression: "#f = :v",
          ExpressionAttributeNames: { "#f": field },
          ExpressionAttributeValues: { ":v": value },
          ExclusiveStartKey,
        })
      );
      items.push(...((res.Items as Interaction[]) ?? []));
      ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);
    // newest first
    return items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }
}
