# Escalation Rules

Conditions that require a human reviewer. When any is met, set status to `escalated`
and populate `escalationReasons` with the matching key.

| Condition                                   | Key                          |
|---------------------------------------------|------------------------------|
| Asset value exceeds $250,000                | `asset_value_exceeds_250k`   |
| Name mismatch between firms                 | `registration_mismatch`      |
| Non-transferable or restricted assets       | `restricted_assets`          |
| Delivering firm not in supported list       | `unsupported_delivering_firm`|
| Account flagged for compliance review       | `compliance_hold`            |
| Partial transfer with unclear instructions  | `ambiguous_partial_transfer` |

## Handling
- Escalated transfers are routed to the operations queue.
- The AI summary should clearly state each reason in plain language for the reviewer.
