# TransferReady — Team Status & Work Split

AI-assisted account transfer platform. Answers: **who needs attention, why, and what to do next.**

## Architecture (1 line each)
- **DynamoDB** — structured client/transfer data (facts about each client).
- **S3 + Bedrock Knowledge Base** — firm procedure docs, searchable (what the rules say).
- **Risk engine** — rules-based scoring (LOW/MEDIUM/HIGH), computed at request time, no AI.
- **Bedrock (Sonnet 4.5)** — explains risk + drafts advisor-reviewed follow-up email.
- **Backend** — Node/Express API. **Frontend** — React/TS dashboard.

Flow: `DynamoDB facts + risk + KB retrieval → Bedrock → explanation + email`

## End-to-end example (what the program actually does)
Advisor opens the dashboard and clicks **Maria Rodriguez**:

1. **Dashboard** lists all transfers, each with a risk badge. Maria shows **HIGH**.
   `GET /api/transfers` → reads all transfers from DynamoDB, risk engine scores each.

2. **Detail** page loads Maria's full record.
   `GET /api/transfers/:id` → DynamoDB returns: Traditional IRA $420K, status
   WAITING_ON_CLIENT, **beneficiary form MISSING (blocks)**, 9 days inactive,
   an unresolved client question.

3. **Risk** is computed from those facts: missing form (+3), 9 days idle (+2),
   unresolved question (+1) = **score 6 → HIGH**, with reason list.

4. **Analyze** (advisor clicks the button) →
   - KB is searched for the relevant procedure and returns the firm rule:
     *"Beneficiary designation forms must be completed before custodian review."*
   - DynamoDB facts + risk + that rule are bundled and sent to Bedrock.
   - Bedrock returns a plain-English **risk explanation** + **recommended action**,
     grounded in (and citing) the firm's procedure.

5. **Generate Follow-Up** → Bedrock drafts a concise client email for the advisor
   to review and send. (Advisor review is required before sending.)

Result: the advisor instantly knows **who** (Maria), **why** (missing form, stalled,
blocking), and **what to do** (send the beneficiary-form reminder).

## Why two data stores? (DynamoDB = facts, S3/KB = rules)

**What DynamoDB knows about Maria (the facts):**
- Transfer status: `WAITING_ON_CLIENT`
- Beneficiary designation form: `MISSING`, `blocksNextStage: true`
- 9 days since last activity

**What S3 holds (the firm's rules)** — an actual chunk from
`knowledge/requirements/beneficiary-requirements.md`, uploaded and indexed in the KB:

> "Beneficiary designation forms must be completed before the transfer can proceed
> to custodian review. If the beneficiary form has a status of MISSING, the transfer
> is blocked at the Documentation stage and cannot advance."

**How the rule reaches the AI:** on **Analyze**, the backend runs a semantic search
against the KB using Maria's situation — effectively asking *"What's the procedure
when a Traditional IRA transfer is missing its beneficiary form?"* The KB returns the
chunk above, giving the AI the policy in the firm's own words to ground its answer.

**Why this matters — with vs. without the KB:**

- *Without (AI guessing):* "Maria's transfer is delayed. She should probably submit
  some paperwork. It may complete in a few days." — vague, possibly wrong, invented policy.
- *With (AI grounded):* "Maria's transfer cannot proceed because, per the Beneficiary
  Documentation Guide, *'beneficiary designation forms must be completed before the
  transfer can proceed to custodian review.'* The form is missing, blocking the
  Documentation stage. Recommended action: send Maria a concise reminder requesting
  the beneficiary form." — quotes real policy, cites the source.

**Takeaway:** DynamoDB = *what's true about this client*; S3/KB = *what we're allowed/
supposed to do about it*. They combine only at Analyze time, never in storage.

## Region & resources (source of truth)
- Region: **us-east-1** | Profile: `hackathon`
- Tables: `TransferReadyClients|Accounts|Transfers|Requirements|Interactions`
- S3: `transferready-knowledge-156749151879` | KB id: `ITCRFI9EKJ`
- Model: `us.anthropic.claude-sonnet-4-5-20250929-v1:0`
- All config in `.env`.

## DONE
- [x] 5 DynamoDB tables created + seeded (14 clients, verified)
- [x] S3 bucket + 8 RAG docs uploaded
- [x] Bedrock Knowledge Base ingested + retrieval tested
- [x] Bedrock model invocation verified (structured JSON)
- [x] Backend: AWS clients, 5 repositories, risk engine
- [x] Backend: `GET /api/transfers`, `GET /api/transfers/:id`, `GET /api/health`
- [x] Seed loader (`data/seed.mjs`) — re-run anytime to reset
- [x] Repo cleaned of placeholder/fake-model files

## TODO — split

### A — AI / Bedrock  (critical path; unblocked)
- [x] `ragService` — query KB, return source-cited chunks
- [x] `contextService` — bundle DynamoDB facts + risk + RAG (doc section 18)
- [x] `aiService` — Converse call, structured JSON out (section 20), guardrails (section 21)
- [x] Deliver: `analyzeTransfer(ctx)`, `generateFollowUp(ctx)`

### B — Backend API  (pairs with A)
- [x] `POST /api/transfers/:id/analyze`
- [x] `POST /api/transfers/:id/follow-up`
- [x] `GET /api/clients/:id`  (reuse repositories)
- [x] `GET /api/reports`  (compute metrics, section 13)

### C — Frontend: dashboard + detail  (unblocked now)
- [ ] Transfers dashboard  <- `GET /api/transfers`
- [ ] Transfer detail page  <- `GET /api/transfers/:id`
- [ ] Risk UI (level badges + reason chips)

### D — Frontend: AI + reports  (mock first, then wire)
- [ ] Analyze panel + Generate Follow-Up modal
- [ ] Reports page (charts)  <- `GET /api/reports`

### E — Infra / deploy / demo (DO LAST?)
- [ ] EC2 host + IAM role for backend
- [ ] Deploy script + env wiring
- [ ] Demo script + integration test (section 30)

### F — Integration / floater
- [ ] Own end-to-end demo flow (section 30), fill gaps
- [ ] Zod schemas (`schemas/`) + tests

## Dependencies
```
repositories + risk (DONE) --> dashboard/detail endpoints (DONE) --> C (go now)
AI service (A) --> analyze/follow-up (B) --> D
```

## Run locally
```bash
# backend (uses workshop creds)
cd backend && AWS_PROFILE=hackathon npm run dev
# reset data
AWS_PROFILE=hackathon node data/seed.mjs
```
