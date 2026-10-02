import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../aws/dynamo.js";
import type { Client } from "../types/index.js";

export class ClientRepository {
  async findAll(): Promise<Client[]> {
    const items: Client[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await dynamo.send(
        new ScanCommand({ TableName: TABLES.clients, ExclusiveStartKey })
      );
      items.push(...((res.Items as Client[]) ?? []));
      ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);
    return items;
  }

  async findById(clientId: string): Promise<Client | null> {
    const res = await dynamo.send(
      new GetCommand({ TableName: TABLES.clients, Key: { clientId } })
    );
    return (res.Item as Client) ?? null;
  }
}
