import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION ?? "us-east-1";
// Only set a custom endpoint for local DynamoDB; empty => real AWS service.
const endpoint = process.env.DYNAMODB_ENDPOINT || undefined;

const baseClient = new DynamoDBClient({ region, endpoint });

export const dynamo = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: { removeUndefinedValues: true },
});

/** Live table names (us-east-1). Overridable via env; defaults are the real tables. */
export const TABLES = {
  clients: process.env.CLIENTS_TABLE ?? "TransferReadyClients",
  accounts: process.env.ACCOUNTS_TABLE ?? "TransferReadyAccounts",
  transfers: process.env.TRANSFERS_TABLE ?? "TransferReadyTransfers",
  requirements: process.env.REQUIREMENTS_TABLE ?? "TransferReadyRequirements",
  interactions: process.env.INTERACTIONS_TABLE ?? "TransferReadyInteractions",
} as const;
