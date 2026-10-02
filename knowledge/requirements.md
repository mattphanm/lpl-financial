# Transfer Requirements

Checklist the AI reviewer uses to decide whether a transfer is ready.

| Requirement                     | Key                              | Applies To            |
|---------------------------------|----------------------------------|-----------------------|
| Signed transfer authorization   | `signed_transfer_authorization`  | All transfers         |
| Recent statement (<= 90 days)   | `recent_statement`               | All transfers         |
| Matching account registration   | `matching_registration`          | All transfers         |
| Beneficiary form                | `beneficiary_form`               | IRA / retirement      |
| Spousal consent                 | `spousal_consent`                | Joint / community prop|
| Medallion signature guarantee   | `medallion_guarantee`            | Transfers > $500k     |

## Notes
- Keys are used verbatim in the `missingRequirements` array of the LLM output schema.
- Retirement accounts (`roth_ira`, `traditional_ira`, `sep_ira`) require a beneficiary form.
