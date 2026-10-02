import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

const region = process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? "us-east-1";

export const bedrock = new BedrockRuntimeClient({ region });

export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-sonnet-4-5-20250929-v1:0";
