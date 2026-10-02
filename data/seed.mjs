/**
 * TransferReady — DynamoDB seed loader (ESM). Idempotent (PutRequest overwrites).
 * Usage: AWS_PROFILE=hackathon AWS_REGION=us-east-1 node data/seed.mjs
 */
import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  clients,
  accounts,
  transfers,
  requirements,
  interactions,
} from "./seedData.mjs";

const REGION = process.env.AWS_REGION || "us-east-1";
const client = new DynamoDBClient({ region: REGION });

const TABLES = {
  TransferReadyClients: clients,
  TransferReadyAccounts: accounts,
  TransferReadyTransfers: transfers,
  TransferReadyRequirements: requirements,
  TransferReadyInteractions: interactions,
};

const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) =>
    arr.slice(i * n, i * n + n)
  );

async function writeBatch(table, items) {
  let requestItems = {
    [table]: items.map((item) => ({
      PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) },
    })),
  };
  let attempt = 0;
  while (Object.keys(requestItems).length > 0) {
    const res = await client.send(
      new BatchWriteItemCommand({ RequestItems: requestItems })
    );
    const un = res.UnprocessedItems || {};
    if (!un[table] || un[table].length === 0) break;
    if (++attempt > 5) throw new Error(`unprocessed items remain in ${table}`);
    await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    requestItems = un;
  }
}

async function main() {
  console.log(`Seeding TransferReady tables in ${REGION}...`);
  for (const [table, items] of Object.entries(TABLES)) {
    for (const batch of chunk(items, 25)) await writeBatch(table, batch);
    console.log(`  ✓ ${table}: ${items.length} items`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
