/**
 * Seeds synthetic accounts and transfers into DynamoDB (or a local endpoint).
 * Run with: node data/seed.mjs
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadJson(name) {
  const raw = await readFile(join(__dirname, name), "utf8");
  return JSON.parse(raw);
}

async function main() {
  const accounts = await loadJson("accounts.json");
  const transfers = await loadJson("transfers.json");

  console.log(`Loaded ${accounts.length} accounts and ${transfers.length} transfers.`);
  console.log("TODO: write items to DynamoDB using @aws-sdk/lib-dynamodb BatchWrite.");

  // Placeholder: iterate and PutItem per record once table names are configured.
  for (const a of accounts) console.log(`  account ${a.id} (${a.ownerName})`);
  for (const t of transfers) console.log(`  transfer ${t.id} -> ${t.status}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
