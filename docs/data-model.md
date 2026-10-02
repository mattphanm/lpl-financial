# Data Model

## Account
| Field       | Type   | Notes                                  |
|-------------|--------|----------------------------------------|
| id          | string | Primary key, e.g. `acct-1001`          |
| ownerName   | string | Account holder                         |
| accountType | string | `individual_brokerage`, `roth_ira`, …  |
| openedAt    | string | ISO date                               |

## Transfer
| Field          | Type   | Notes                                           |
|----------------|--------|-------------------------------------------------|
| id             | string | Primary key, e.g. `xfer-5001`                   |
| accountId      | string | FK → Account.id                                 |
| deliveringFirm | string | Firm sending assets                             |
| receivingFirm  | string | Firm receiving assets                           |
| assetValue     | number | Estimated total value                           |
| status         | enum   | received \| in_review \| needs_info \| escalated \| ready \| completed \| rejected |
| createdAt      | string | ISO timestamp                                   |
| updatedAt      | string | ISO timestamp                                   |

## TransferReview (LLM output)
| Field               | Type     | Notes                               |
|---------------------|----------|-------------------------------------|
| ready               | boolean  | True when no blockers remain        |
| missingRequirements | string[] | Keys from `knowledge/requirements`  |
| escalationReasons   | string[] | Keys from `knowledge/escalation`    |
| summary             | string   | Plain-language explanation          |

See `backend/src/schemas/transfer.ts` for the enforced schema.
