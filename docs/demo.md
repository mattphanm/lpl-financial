# Demo Guide

A short walkthrough for demonstrating Transfer-Ready end to end.

## Setup
```bash
npm install
cp .env.example .env   # fill AWS creds if demoing Bedrock
./scripts/seed.sh      # load synthetic accounts + transfers
npm run dev            # starts backend (:3001) and frontend (:5173)
```

## Walkthrough
1. Open the frontend at http://localhost:5173 — confirm "Backend status: ok".
2. Hit `GET /api/transfers` to show the three seeded transfers.
3. Show `xfer-5002` (`needs_info`) → explains missing-document flow.
4. Show `xfer-5003` (`escalated`, $310k) → triggers `asset_value_exceeds_250k`.
5. Walk through `knowledge/` to show how requirements and escalation rules drive decisions.

## Talking points
- Structured LLM output (Zod-validated) keeps the AI's recommendations auditable.
- Domain knowledge lives in `knowledge/` as plain markdown — easy for ops to edit.
- Clean layering (routes → services → repositories) makes the backend easy to extend.
