import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";

const region =
  process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? "us-east-1";

/** Client for Bedrock Knowledge Base retrieval (RAG). */
export const bedrockAgent = new BedrockAgentRuntimeClient({ region });

/** The TransferReady Knowledge Base id (S3-backed firm procedure docs). */
export const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID ?? "ITCRFI9EKJ";
