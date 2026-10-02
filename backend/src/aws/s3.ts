import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION ?? "us-east-1";

export const s3 = new S3Client({ region });

export const DOCUMENTS_BUCKET =
  process.env.S3_KNOWLEDGE_BUCKET ??
  process.env.S3_BUCKET_DOCUMENTS ??
  "transferready-knowledge-156749151879";
