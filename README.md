# Transfer-Ready

An AI-assisted account transfer processing platform. This monorepo contains the frontend, backend, AI prompt/schema assets, synthetic data, domain knowledge, and infrastructure needed to run and demo the system.

## Repository Structure

```
lpl-financial/
├── frontend/          # React + TypeScript + Vite UI
├── backend/           # Node + TypeScript API
│   └── src/
│       ├── routes/        # HTTP route handlers
│       ├── services/      # Business logic
│       ├── repositories/  # Data access layer
│       ├── aws/           # AWS SDK clients (Bedrock, DynamoDB, S3)
│       ├── prompts/       # LLM prompt templates
│       ├── schemas/       # Request/response + LLM output schemas
│       └── types/         # Shared TypeScript types
├── data/              # Synthetic data + seed scripts
├── knowledge/         # Domain procedures, requirements, escalation rules
├── infrastructure/    # EC2 / IAM / deploy scripts
├── docs/              # Architecture, API, data model, demo guides
├── scripts/           # setup / seed / demo helper scripts
├── README.md
├── .gitignore
└── .env.example
```

## Quick Start

```bash
# 1. Install dependencies (root + workspaces)
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Seed synthetic data
./scripts/seed.sh

# 4. Run the dev stack (frontend + backend)
npm run dev
```

## Prerequisites

- Node.js >= 20
- npm >= 10
- AWS credentials configured (for Bedrock / DynamoDB access)

## Documentation

See the [`docs/`](./docs) directory for architecture, API reference, data model, and demo walkthroughs.
