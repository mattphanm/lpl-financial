# TransferReady — Specification

The stable "what the system does and what the contracts are" reference. Operational
state (who's doing what, what's done) lives in [`STATUS.md`](./STATUS.md); this
document describes the intended behavior and contracts.

> Source of truth: the TypeScript in `backend/src/` is authoritative. This spec is
> derived from `backend/src/types/index.ts`, `backend/src/schemas/ai.ts`,
> `backend/src/routes/`, and `backend/src/services/riskService.ts`. If code and
> spec disagree, the code wins and this doc should be updated.

---

## 1. Purpose

TransferReady is an AI-assisted platform that helps advisors manage inbound account
transfers. For every transfer it answers three questions: **who needs attention,
why, and what to do next.**

It combines two independent sources:

- **DynamoDB — the facts.** Structured client/account/transfer/requirement/interaction
  data (what is true about each client).
- **S3 + Bedrock Knowledge Base — the rules.** The firm's procedure documents,
  semantically searchable (what we are supposed to do).

A deterministic risk engine scores each transfer. On demand, Bedrock (Claude Sonnet 4.5)
produces a grounded, source-cited risk explanation and a draft client follow-up for
advisor review.

## 2. Goals / Non-Goals

**Goals**
- Surface at-risk transfers with explainable, rules-based risk scores.
- Ground AI explanations in the firm's own written procedures (RAG), with citations.
- Draft advisor-reviewable client communications.
- Reduce manual triage time while keeping a human in the loop.

**Non-Goals**
- Executing the actual ACATS/custodian submission (downstream systems own this).
- Serving as the system of record for client accounts.
- Sending client communications automatically — **advisor review is required**
  before any AI-drafted message is sent.
- Using AI to compute risk — risk is deterministic and never calls Bedrock.

## 3. Architecture

```
┌────────────┐    HTTP /api/*    ┌──────────────┐
│  Frontend  │ ────────────────▶ │   Backend     │
│ React/Vite │ ◀──────────────── │  Express/TS   │
└────────────┘                   └──────┬───────┘
                                        │
              ┌─────────────────────────┼───────────────────────────┐
              ▼                         ▼                           ▼
      ┌───────────────┐        ┌─────────────────┐         ┌─────────────────┐
      │   DynamoDB    │        │  S3 + Bedrock   │         │  Bedrock (LLM)  │
      │   (facts)     │        │  Knowledge Base │         │  Sonnet 4.5     │
      │ 5 tables      │        │  (rules / RAG)  │         │  Converse API   │
      └───────────────┘        └─────────────────┘         └─────────────────┘
```

Flow: `DynamoDB facts + risk score + KB retrieval → Bedrock → explanation + email`

### Backend layers
- **routes/** — HTTP surface; validation + delegation only.
- **services/** — business logic: `transferService` (lifecycle/dashboard),
  `riskService` (scoring), `ragService` (KB retrieval), `contextService` (bundling),
  `aiService` (Bedrock calls).
- **repositories/** — DynamoDB data access (client/account/transfer/requirement/interaction).
- **aws/** — SDK clients (Bedrock, Bedrock Agent/KB, DynamoDB, S3).
- **prompts/** + **schemas/** — LLM input templates and Zod output contracts.
- **types/** — shared domain types (authoritative).

## 4. Deployment / Resources (reference)

| Item     | Value |
|----------|-------|
| Region   | `us-east-1` |
| Profile  | `hackathon` |
| Tables   | `TransferReadyClients`, `TransferReadyAccounts`, `TransferReadyTransfers`, `TransferReadyRequirements`, `TransferReadyInteractions` |
| S3       | `transferready-knowledge-156749151879` |
| KB id    | `ITCRFI9EKJ` |
| Model    | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |

All config is read from `.env`.

---

## 5. Domain Model

Authoritative definitions: `backend/src/types/index.ts`.

### Enums

| Enum | Values |
|------|--------|
| `PreferredContactMethod` | `EMAIL`, `PHONE` |
| `TransferStatus` | `NOT_STARTED`, `IN_PROGRESS`, `WAITING_ON_CLIENT`, `INTERNAL_REVIEW`, `CUSTODIAN_PROCESSING`, `COMPLETE` |
| `TransferStage` | `INITIATION`, `DOCUMENTATION`, `REVIEW`, `CUSTODIAN`, `COMPLETION` |
| `RequirementType` | `BENEFICIARY_FORM`, `SIGNATURE`, `IDENTITY_VERIFICATION`, `TRANSFER_FORM`, `ACCOUNT_STATEMENT`, `CUSTODIAN_APPROVAL`, `INTERNAL_REVIEW` |
| `RequirementStatus` | `NOT_REQUIRED`, `MISSING`, `REQUESTED`, `RECEIVED`, `VERIFIED`, `COMPLETE` |
| `InteractionType` | `CLIENT_EMAIL`, `ADVISOR_EMAIL`, `PHONE_CALL`, `DOCUMENT_REQUEST`, `DOCUMENT_RECEIVED`, `STATUS_UPDATE`, `INTERNAL_NOTE` |
| `InteractionDirection` | `INBOUND`, `OUTBOUND` |
| `RiskLevel` | `LOW`, `MEDIUM`, `HIGH` |

### Entities

**Client** — `clientId` (PK), `name`, `email`, `phone`, `advisorId`,
`preferredContactMethod`, `communicationPreference`, `relationshipNotes`, `createdAt`.

**Account** — `accountId` (PK), `clientId` (FK), `accountType`, `estimatedAssets`,
`institution`, `createdAt`.

**Transfer** — `transferId` (PK), `clientId` (FK), `accountId` (FK), `status`,
`stage`, `startedAt`, `lastActivityAt`, `completionPercent`, `transferAmount`,
`assignedAdvisorId`, `hasUnresolvedClientQuestion` (explicit flag feeding the risk
engine — stored, not inferred).

**Requirement** — `requirementId` (PK), `transferId` (FK), `type`, `displayName`,
`status`, `required`, `blocksNextStage`, `requestedAt`, `completedAt` (nullable).

**Interaction** — `interactionId` (PK), `clientId` (FK), `transferId` (FK),
`timestamp`, `type`, `direction`, `summary`, `createdBy`.

### Derived shapes

**RiskResult** — `level: RiskLevel`, `score: number`, `reasons: string[]`.

**DashboardTransfer** (list row) — `transferId`, `clientName`, `accountType`,
`transferAmount`, `status`, `riskLevel`, `riskReasons`, `daysSinceActivity`.

**TransferDetail** (full payload) — `client`, `account`, `transfer`,
`requirements[]`, `interactions[]`, `risk`.

---

## 6. Risk Engine (deterministic)

Defined in `backend/src/services/riskService.ts`. Rules-based, deterministic, and
**never calls Bedrock**. `hasUnresolvedClientQuestion` is read from the transfer
rather than inferred from free text, so scores are reproducible.

**Short-circuit:** if `transfer.status === "COMPLETE"` → `LOW`, score `0`,
reason `"Transfer complete"`.

Otherwise, additive scoring:

| Condition | Delta |
|-----------|-------|
| At least one `required` requirement with status `MISSING` | +3 |
| (and) any missing requirement has `blocksNextStage` | +0, adds reason "A missing form blocks the next stage" |
| 2 or more missing required requirements | +2 |
| No activity for ≥ 10 days | +3 |
| else no activity for ≥ 5 days (and < 10) | +2 |
| `hasUnresolvedClientQuestion` is true | +1 |
| Recent advisor contact: an `OUTBOUND` interaction of type `ADVISOR_EMAIL` / `PHONE_CALL` / `STATUS_UPDATE` within ≤ 1 day | −1 |

**Level mapping:** `score ≤ 1 → LOW`, `score 2–3 → MEDIUM`, `score ≥ 4 → HIGH`.

`daysSinceActivity` = floor of `(now − lastActivityAt)` in days.

Every applied rule appends a human-readable string to `reasons`, which the UI
renders as reason chips and the AI uses as grounding.

---

## 7. HTTP API

Base URL: `http://localhost:3001` (dev). Routes: `backend/src/routes/`.

### GET /api/health
Health check.

**200**
```json
{ "status": "ok", "service": "transfer-ready", "time": "2026-10-02T17:00:00.000Z" }
```

### GET /api/transfers
Dashboard list. Returns `DashboardTransfer[]` — one row per transfer with its
computed risk.

**200**
```json
[
  {
    "transferId": "xfer-5001",
    "clientName": "Maria Rodriguez",
    "accountType": "Traditional IRA",
    "transferAmount": 420000,
    "status": "WAITING_ON_CLIENT",
    "riskLevel": "HIGH",
    "riskReasons": [
      "Required document missing: Beneficiary Designation Form",
      "A missing form blocks the next stage",
      "9 days since last activity",
      "Unresolved client question"
    ],
    "daysSinceActivity": 9
  }
]
```

### GET /api/transfers/:id
Full detail for one transfer. Returns `TransferDetail`.

**200** — `TransferDetail` object (`client`, `account`, `transfer`,
`requirements[]`, `interactions[]`, `risk`).

**404**
```json
{ "error": "Transfer not found" }
```

### POST /api/transfers/:id/analyze
Builds context (facts + risk + RAG retrieval), invokes Bedrock, and returns a
grounded risk explanation with recommended action. Advisor-triggered.

**200** — `AnalyzeResult` plus a `meta` block describing the retrieval:
```json
{
  "summary": "Maria's Traditional IRA transfer is stalled and blocked.",
  "riskExplanation": "The transfer cannot proceed because the beneficiary designation form is missing, which blocks the Documentation stage; it has also been idle 9 days with an open client question.",
  "recommendedAction": "Send Maria a reminder requesting the beneficiary designation form.",
  "nextSteps": [
    "Email Maria the beneficiary form reminder.",
    "Confirm receipt and advance to custodian review."
  ],
  "citations": [
    {
      "ref": "S1",
      "source": "knowledge/requirements/beneficiary-requirements.md",
      "quote": "Beneficiary designation forms must be completed before the transfer can proceed to custodian review."
    }
  ],
  "meta": {
    "retrievalQuery": "Traditional IRA transfer missing beneficiary form",
    "sources": ["knowledge/requirements/beneficiary-requirements.md"]
  }
}
```

**404** — `{ "error": "Transfer not found" }`

### POST /api/transfers/:id/follow-up
Drafts a client follow-up message for advisor review. Returns `FollowUpResult`.
**The draft is never sent automatically.**

**200**
```json
{
  "subject": "Next step on your account transfer",
  "body": "Hi Maria, ...",
  "channel": "EMAIL"
}
```

**404** — `{ "error": "Transfer not found" }`

### Error handling
Unhandled errors pass to the Express error middleware
(`backend/src/middleware/errorHandler.ts`) and surface as a JSON error with the
appropriate status code.

---

## 8. AI Output Contracts

Defined and enforced with Zod in `backend/src/schemas/ai.ts`. Model responses are
parsed with `parseModelJson`, which strips markdown fences, isolates the outermost
JSON object, and validates against the schema. Invalid output throws rather than
returning a malformed payload.

### Citation
- `ref: string` — short label the model uses to reference a source (e.g. `"S1"`).
- `source: string` — originating firm document (S3 URI or filename).
- `quote: string` — the policy text used to ground the answer.

### AnalyzeResult
- `summary: string` — one-line who/why.
- `riskExplanation: string` — plain-English, grounded reasoning.
- `recommendedAction: string` — the single most important next action.
- `nextSteps: string[]` — 1–6 ordered concrete steps.
- `citations: Citation[]` — grounding sources; defaults to `[]`.

### FollowUpResult
- `subject: string`
- `body: string` — full plain-text email addressed to the client.
- `channel: "EMAIL" | "PHONE"` — defaults to `EMAIL`.

---

## 9. Retrieval & Grounding (RAG)

1. `contextService.build(transferId)` loads the transfer's facts from DynamoDB and
   computes risk.
2. It forms a `retrievalQuery` from the transfer's situation (account type + the
   active blocker, e.g. "Traditional IRA transfer missing beneficiary form").
3. `ragService` runs a semantic search against the Bedrock Knowledge Base and
   returns source-cited chunks (`{ source, quote }`).
4. Facts + risk + retrieved chunks are bundled and sent to Bedrock via the Converse
   API using the prompt templates in `backend/src/prompts/`.
5. The model returns JSON matching the schemas in §8; the AI's `citations` must
   reference the retrieved sources, and `meta.sources` echoes what was retrieved.

**Why two stores:** DynamoDB = *what is true about this client*; S3/KB = *what we
are supposed to do about it*. They are combined only at analyze time, never in
storage. Grounding the model in retrieved firm policy (vs. letting it guess)
produces explanations that quote real procedure and cite their source.

---

## 10. Invariants & Guarantees

- Risk scoring is deterministic and independent of the LLM.
- A `COMPLETE` transfer is always `LOW` risk.
- AI-drafted communications are advisory only and require human review before use.
- All AI responses are schema-validated before leaving the backend.
- DynamoDB and the Knowledge Base are never merged in storage — only at request time.
- Enum values in payloads always match the sets in §5.

---

## 11. Local Development

```bash
# backend (uses workshop creds)
cd backend && AWS_PROFILE=hackathon npm run dev

# reset / reseed synthetic data
AWS_PROFILE=hackathon node data/seed.mjs
```

Seed data: 14 clients across the 5 tables. Re-run the seed loader anytime to reset.

---

## 12. Related Docs

- [`STATUS.md`](./STATUS.md) — live team status, work split, dependencies.
- [`overview.md`](./overview.md) — product goals and non-goals.
- [`architecture.md`](./architecture.md) / [`architecture-guide.md`](./architecture-guide.md) — system design.
- `knowledge/` — the firm procedure/requirement documents indexed in the KB.

> Note: `docs/api.md` and `docs/data-model.md` describe an earlier draft schema
> (`deliveringFirm`, lowercase `status`, `TransferReview`) that no longer matches
> the code. This spec reflects the current implementation; those two files should
> be reconciled or retired.
