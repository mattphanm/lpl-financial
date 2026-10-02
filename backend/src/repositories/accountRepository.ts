import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLES } from "../aws/dynamo.js";
import type { Account } from "../types/index.js";

export class AccountRepository {
  async findById(accountId: string): Promise<Account | null> {
    const res = await dynamo.send(
      new GetCommand({ TableName: TABLES.accounts, Key: { accountId } })
    );
    return (res.Item as Account) ?? null;
  }

  async findByClientId(clientId: string): Promise<Account[]> {
    return this.scanFiltered("clientId", clientId);
  }

  async findAll(): Promise<Account[]> {
    return this.scanFiltered();
  }

  private async scanFiltered(field?: string, value?: string): Promise<Account[]> {
    const items: Account[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await dynamo.send(
        new ScanCommand({
          TableName: TABLES.accounts,
          ExclusiveStartKey,
          ...(field && value
            ? {
                FilterExpression: "#f = :v",
                ExpressionAttributeNames: { "#f": field },
                ExpressionAttributeValues: { ":v": value },
              }
            : {}),
        })
      );
      items.push(...((res.Items as Account[]) ?? []));
      ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);
    return items;
  }
}
