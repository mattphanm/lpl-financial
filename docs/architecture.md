# Architecture

```
┌────────────┐      HTTP       ┌─────────────┐     AWS SDK      ┌──────────────┐
│  Frontend  │ ─────────────▶  │   Backend   │ ───────────────▶ │   Bedrock    │
│ React/Vite │   /api/*        │ Express/TS  │                  │ (LLM review) │
└────────────┘ ◀───────────── └─────────────┘ ◀─────────────── └──────────────┘
                                     │  │
                           DynamoDB  │  │  S3
                        (transfers,  │  │ (documents)
                          accounts)  ▼  ▼
                               ┌───────────────┐
                               │  AWS Storage  │
                               └───────────────┘
```

## Layers (backend)
- **routes/** — HTTP surface; validation + delegation only.
- **services/** — business logic (transfer lifecycle, review orchestration).
- **repositories/** — data access over DynamoDB.
- **aws/** — SDK clients (Bedrock, DynamoDB, S3).
- **prompts/** + **schemas/** — LLM input templates and structured output contracts.
- **types/** — shared domain types.

## Request flow (review)
1. Client submits/opens a transfer via the frontend.
2. Backend loads the transfer + relevant knowledge (requirements, escalation).
3. A Bedrock prompt is built and invoked; output is validated against the Zod schema.
4. Result is persisted and returned; status transitions per `knowledge/procedures.md`.
