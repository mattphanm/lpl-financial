# Transfer Processing Procedures

Standard operating procedure for processing an inbound account transfer (ACATS or non-ACATS).

## 1. Intake
- Confirm the receiving account exists and is in good standing.
- Record delivering firm, account type, and estimated asset value.
- Set status to `received`.

## 2. Document Review
- Verify a signed Transfer Initiation Form (TIF) is on file.
- Verify a statement from the delivering firm dated within the last 90 days.
- If any document is missing, set status to `needs_info` and notify the client.

## 3. Validation
- Match account registration (name, type) between delivering and receiving firms.
- Confirm no non-transferable assets are included.
- Set status to `in_review` while checks run.

## 4. Decision
- If all checks pass, set status to `ready`.
- If a condition in [escalation.md](./escalation.md) is met, set status to `escalated`.

## 5. Completion
- Submit through ACATS.
- On settlement confirmation, set status to `completed`.
