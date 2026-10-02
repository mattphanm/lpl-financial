import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION ?? "us-east-1";
const endpoint = process.env.DYNAMODB_ENDPOINT || undefined;

const baseClient = new DynamoDBClient({ region, endpoint });

export const dynamo = DynamoDBDocumentClient.from(baseClient);
