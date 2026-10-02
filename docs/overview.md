# Overview

Transfer-Ready is an AI-assisted platform for processing inbound account transfers. It ingests
a transfer request, checks it against the firm's requirements and escalation rules, and produces
a structured recommendation: ready to process, needs more information, or escalate to a human.

## Goals
- Reduce manual review time on routine transfers.
- Catch missing documents and registration mismatches early.
- Give operations staff clear, structured reasons for every escalation.

## Non-Goals
- Executing the actual ACATS submission (handled by downstream systems).
- Serving as the system of record for client accounts.

See [architecture.md](./architecture.md) for how the pieces fit together.
