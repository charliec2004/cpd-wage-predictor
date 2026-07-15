# Specification Audit

Audit status: completed after the initial product, data, forecasting, research, and questionnaire drafts

## Method

An independent sub-agent reviewed the documents for contradictions, missing invariants, ambiguous calculation behavior, security assumptions, and questions that could materially change implementation. The main specification was then revised to resolve what can be decided safely and to turn institutional unknowns into explicit questionnaire items.

## Findings and resolutions

| Priority | Finding | Resolution in the specification |
| --- | --- | --- |
| P0 | A work-study award can be a gross-earnings cap while CPD receives only a percentage offset. Treating both as one balance produces incorrect exhaustion and budget cost. | Split gross award consumption from departmental offset throughout the product, data, and forecasting models. The offset rate remains a CPD-confirmed policy. |
| P0 | Dollar-only or pay-period actuals cannot be deterministically placed into a daily ledger. | Added pay periods, explicit allocation records/methods, and an Unallocated actuals bucket. No silent daily allocation is permitted. |
| P0 | Repeat imports and payroll corrections could double count posted actuals. | Require stable source IDs or documented composite fingerprints. Corrections use reversal/supersession chains instead of overwriting posted history. |
| P0 | Authority was modeled at the row level even though hours, gross wages, work-study consumption, department offset, and department charge can come from different sources. | Added component-level values, authority, and provenance. Mixed factual/estimated cost is represented explicitly. |
| P0 | Moving the as-of date over mutable current data cannot reproduce what CPD knew in the past. | Distinguished historical recomputation from immutable forecast snapshots. Snapshots retain as-of date, source revision, scenario, and engine version. |
| P0 | Employment statuses did not have deterministic eligibility semantics. | Added an explicit initial eligibility matrix and blocking validation for missing required dates. CPD can confirm or change the policy visibly. |
| P0 | Payroll rounding was described as important but not represented as required schema. | Added a required, confirmable payroll rounding policy. Official calculated dollars are blocked until it is confirmed. |
| P0 | An offline app was assumed not to need authentication or encryption despite containing names, wage data, and financial-aid information. | Defined the OS account as the initial authentication boundary and defaulted workspace/backups to OS-key-protected encryption, subject to recovery and handoff decisions. Plain exports require an explicit warning. |
| P1 | The first FY 2026–27 period seed omitted Dec. 6, 2026 and May 16, 2027. | Added explicit transition/finals dates so every fiscal date is classified, while labeling the dates as app-modeling choices for CPD confirmation. |
| P1 | Overlapping office rules had no deterministic outcome. | Added multi-interval office rules plus priority, specificity, creation-time precedence, and blocking tie validation. |
| P1 | Override and scenario conflict rules were described but not representable. | Added priority, creation time, and scope metadata; unresolved exact ties block calculation. |
| P1 | Missing wage rates could silently make projected cost appear to be zero. | Made affected totals non-computable and blocked their use as official forecast amounts. |
| P1 | A combined 19-hour warning cannot be calculated from outside-job dollars alone. | Added optional outside-job minutes and a separate compliance-week boundary. No dollars-to-hours inference occurs without explicit inputs. |
| P1 | Budget revisions could rewrite history when approved or learned after their effective date. | Added effective, approved, recorded, and supersession metadata; current truth and knowledge-at-the-time can be evaluated separately. |

## Questions introduced by the audit

The audit added questions 198–219 to the [decision questionnaire](decision-questionnaire.md), covering:

- allocation order when multiple jobs consume one award
- historical recomputation versus knowledge-at-the-time snapshots
- payroll reversal, replacement, and stable transaction identifiers
- authority when department charge and work-study sources disagree
- missing-wage behavior
- encryption, recovery, handoff, and export protection
- split-day and cross-midnight scheduling
- overlapping calendar rules and unclassified dates
- actual allocation and fiscal ownership
- retroactive budget revisions and snapshot retention

## Remaining implementation gate

The documents now describe deterministic behavior for ambiguous inputs, but implementation should not begin beyond a disposable prototype until the P0 questions are answered. The most consequential unresolved facts are CPD's actual payroll fields, the work-study accounting relationship, fiscal attribution, workspace custody/recovery, and authoritative office/calendar policy.
