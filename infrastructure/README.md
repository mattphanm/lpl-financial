# Infrastructure

Deployment assets for Transfer-Ready. The reference deployment runs the backend and
frontend on a single EC2 instance with an IAM role granting Bedrock, DynamoDB, and S3 access.

## Contents
- `ec2/` — instance bootstrap (user-data) scripts
- `iam/` — IAM policy documents
- `scripts/` — deploy / provision helpers

## Deploy (reference)
1. Create the IAM role from `iam/instance-role-policy.json`.
2. Launch an EC2 instance (Amazon Linux 2023, t3.small+) with that role and `ec2/user-data.sh`.
3. Run `scripts/deploy.sh` to pull, build, and restart the services.
