# Forecasting and Calculation Model

Status: proposed deterministic engine; business-policy questions remain

## 1. Why deterministic scenarios first

The first release should not invent statistical confidence from limited history. CPD can understand and defend named scenarios built from explicit hires, departures, schedules, and work-study assumptions. Historical forecast accuracy can later support calibrated probabilities or Monte Carlo simulation.

The engine therefore produces:

- baseline
- plausible low
- expected
- prudent high
- optional custom scenarios

## 2. Inputs

For a selected fiscal year, scenario, and as-of date:

- fiscal dates and calendar layers
- standard office hours and closures
- employments and active dates
- effective wage rates
- recurring and week-specific schedules
- worker/date overrides
- posted actuals and accrued hours
- work-study awards and outside use
- budget and burden policy
- scenario events

## 3. Evaluation pipeline

For every fiscal date and employment:

1. Apply the explicit employment-status eligibility matrix and dated employment intervals.
2. Resolve the academic period.
3. Resolve office availability and event context.
4. Select the highest-precedence hours source.
5. Clip future hours to office availability unless explicitly authorized.
6. Resolve source state: posted, accrued, missing, committed, planned, or scenario.
7. Resolve the effective wage rate.
8. Calculate gross wages.
9. Determine work-study eligibility.
10. Allocate limited work-study funding chronologically.
11. Calculate optional employer burden.
12. Calculate CPD-funded cost.
13. Attach warnings and explanation references.

The engine evaluates chronologically because work-study consumption today changes remaining coverage tomorrow.

## 4. Hours resolution

Let `minutes(d, e, s)` be payable minutes for date `d`, employment `e`, scenario `s`.

Source selection:

```text
posted actual
  else accrued
  else day override
  else week override
  else recurring/week-specific schedule
  else scenario placeholder schedule
  else zero
```

For dates earlier than the as-of date:

- posted or accrued values keep their states
- no actual/accrual becomes `Missing`
- a separately calculated schedule estimate may be displayed but is not promoted to Posted

For the as-of date, treatment of an incomplete current day is configurable. The recommended default treats it as future unless actual/accrued time exists.

Candidate and Canceled records contribute no baseline hours. Planned, Onboarding, and Active records may contribute inside their valid dates; Onboarding training is separately typed. Paused and Ended records contribute no hours during/after their inactive intervals unless a scenario explicitly changes those dates. Missing required dates are blocking validation errors.

## 5. Office availability

For future and scenario hours:

```text
if office closed and no authorized bypass:
  payable minutes = 0
else if partial closure and timed shift exists:
  payable minutes = overlap(shift, open interval)
else if partial closure and only total minutes exist:
  warn and use configured behavior
else:
  payable minutes = planned minutes
```

Actuals are not clipped. If actual work appears on a closed date, the engine preserves it and adds a reconciliation warning.

## 6. Gross wages

Use integer arithmetic with minutes and cents:

```text
unrounded = payableMinutes × centsPerHour / 60
grossWagesCents = round(unrounded, configured payroll rounding rule)
```

The unresolved rounding policy must match Chapman/CPD expectations. The engine may calculate per day, per time entry, per pay period, or only for forecasts; the choice affects pennies across the year.

Posted gross wages, when imported, are authoritative. The calculated amount remains available for variance analysis.

An effective wage rate and a confirmed rounding policy are required for official calculated dollars. If either is missing, the affected row is `non-computable`; the engine does not substitute zero or silently choose a rounding convention.

## 7. Work-study eligibility

A wage dollar is eligible only if:

- the award is accepted/confirmed under the chosen policy
- the date is inside the configured eligibility window
- the date is not Summer or another excluded period
- remaining award exists after known outside use and earlier allocations
- the employment/earning type is eligible

The default Summer rule is ineligible because Chapman's current public guidance says Federal Work-Study is not available during Summer.

## 8. Outside-job work-study consumption

Known outside use reduces remaining award before future CPD allocation according to its known date or as-of balance. Forecast outside use is applied by its timing rule and scenario.

Recommended chronological model:

```text
remainingGrossEarningCapStart
  = confirmedGrossEarningCap
  - knownGrossConsumedOutsideCPDThroughAsOf
  - confirmedGrossConsumedAtCPDThroughAsOf

for each future date:
  consume outside-job assumption scheduled for date
  consume eligible CPD gross earnings for date
```

The order within the same day must be configured if it can materially change attribution. When only total remaining award is known, use that balance directly and do not double-subtract historical items.

## 9. Work-study consumption, departmental offset, and CPD cost

The student's gross-earnings cap and CPD's departmental offset are separate dimensions. Let `offsetRate` be the share of a work-study gross dollar that offsets CPD's departmental budget, expressed in basis points.

```text
grossAwardConsumed = min(workStudyEligibleGrossWages, remainingGrossEarningCap)
departmentOffset = grossAwardConsumed × offsetRate / 10,000
cpdFundedWages = grossWages - departmentOffset
cpdFundedCost = cpdFundedWages + employerBurden
```

Actual payroll can independently override gross wages, gross award consumption, departmental offset, and final department charge. Component-level authority and provenance are retained when only some values are posted. Same-day allocation order across multiple jobs remains an explicit CPD policy question.

## 10. Employer burden

Employer burden is optional and must be clearly separated from wages. If enabled:

```text
employerBurden = applicableWageBase × burdenRate
```

The applicable wage base may be gross wages, CPD-funded wages, or a Chapman-provided department charge. No tax rate from a public webpage should be assumed to represent CPD's budget charge without confirmation.

## 11. Weekly and pay-period aggregation

Daily ledger rows aggregate into:

- display week
- biweekly pay period
- academic period
- fiscal month
- worker
- funding source
- scenario
- fiscal year

Partial fiscal weeks include only dates inside the fiscal year. A pay period crossing fiscal boundaries must split costs by work date when the source permits. If only pay-date totals are available, the allocation rule must be explicit and the result labeled estimated.

Pay-period or dollar-only entries that cannot be assigned to work dates remain in an `Unallocated actuals` bucket. A chosen allocation method—source-provided, proportional to accrued hours, proportional to schedule, or manual—is stored with the resulting rows. Unallocated dollars appear in fiscal totals when their fiscal ownership is known, but do not pretend to be daily or weekly facts.

## 12. Scenario application

Scenario evaluation starts from baseline source data and applies dated events in order. Conflicting events use:

1. explicit event priority
2. more specific scope over broader scope
3. later-created event only when priority and specificity tie

Conflicts are reported; the engine should not silently choose when two events both replace the same hours.

## 13. Low/expected/high range

The displayed envelope at date `t` is:

```text
lower(t) = cumulative CPD cost under Plausible low
expected(t) = cumulative CPD cost under Expected
upper(t) = cumulative CPD cost under Prudent high
```

Actual and accrued history should normally be shared across scenarios. Scenario differences apply only to uncertain data unless a scenario explicitly examines a historical correction.

The app must not assume `low <= expected <= high` without validation. If user assumptions cross, show an error explaining which dates or events cause the inversion.

## 14. Forecast seam and actual completeness

The forecast seam is not merely `today`:

- dates with complete posted actuals lie in verified history
- dates with accrued but unposted hours lie in accrued history
- past dates without actuals are a visible gap
- future dates are committed/planned/scenario

The Overview should show both calendar as-of date and `actuals complete through` date. This prevents late payroll data from implying more certainty than exists.

Moving the as-of seam over today's mutable records is a historical recomputation. It does not reproduce what CPD knew on that earlier date. Only a saved snapshot with a source revision hash and engine version can make that claim.

## 15. Budget measures

```text
authorizedBudget(as known at snapshot) = originalBudget + revisions recorded by snapshot time
postedCPDCost = sum(posted CPD-funded cost)
accruedCPDCost = sum(accrued CPD-funded cost)
forecastRemaining = sum(future scenario CPD-funded cost)
projectedYearEnd = posted + accrued + forecastRemaining
projectedBalance = authorizedBudget - projectedYearEnd
headroomAfterContingency = projectedBalance - reservedContingency
```

If actual work-study allocation is unavailable, Posted gross wages can be factual while Posted CPD-funded cost remains estimated. The UI must represent that mixed certainty.

Current corrected budget truth may include revisions with an earlier effective date but a later recorded date. Snapshot comparisons use the recorded/known timestamp so historical forecast accuracy is not rewritten by hindsight.

## 16. Warnings

Ledger and aggregate warnings include:

- missing actuals
- hours outside employment dates
- hours during office closure
- weekly hours exceed configured limit
- known CPD plus outside hours exceed configured limit
- no wage rate effective
- work-study assumed but unconfirmed
- work-study outside eligibility window
- outside-job usage stale or unknown
- award exhausted earlier than expected
- imported gross wages disagree with calculated wages
- dollar-only actual cannot be allocated to work dates
- posted transaction lacks a stable deduplication fingerprint
- actual correction chain is broken or circular
- component authorities conflict
- office rules or overrides have an unresolved precedence tie
- schedule exception conflicts
- scenario range inversion
- budget exceeded
- calendar item needs confirmation

Warnings never change source data automatically.

## 17. Explainability trace

For a selected weekly amount, produce a trace such as:

```text
Week of Oct 12, 2026 — Jordan — Expected
Mon 4.0h × $16.50 = $66.00  recurring Fall schedule
Wed 5.0h × $16.50 = $82.50  recurring Fall schedule
Fri 2.0h × $16.50 = $33.00  Career Fair addition
Gross wages                         $181.50
Work-study available                $120.00
Gross award consumed                $120.00
Department offset                   $120.00
CPD-funded wages                     $61.50
Employer burden                       $0.00
CPD-funded cost                      $61.50
```

Every line links to the source schedule, override, wage, award, or actual entry.

## 18. Forecast accuracy history

Saving a forecast snapshot records:

- snapshot as-of date
- engine version
- scenario definitions
- projected year-end totals
- source-data revision identifier
- immutable input references or derived daily rows sufficient for reproduction

After a year closes, the app can compare snapshots against final actuals. This history can later inform better low/high assumptions without rewriting the original forecasts.

## 19. Required test classes

- fiscal year begins or ends midweek
- closure clips one day of recurring schedule
- partial closure clips timed shifts
- week-specific override replaces only one week
- effective wage changes midweek
- hire starts midweek
- worker departs before recurring period ends
- actual overrides scheduled value
- missing past actual remains visible
- Summer disables work-study
- award exhausts midweek
- known outside job consumes award before CPD
- gross award consumption differs from department offset
- outside-job minutes trigger compliance warning without inferring dollars
- posted gross is authoritative while work-study offset remains estimated
- pay-period dollars remain unallocated until an explicit rule is selected
- imported correction reverses or supersedes without double counting
- overlapping office rules resolve deterministically or block
- missing wage blocks official total instead of creating zero cost
- snapshot preserves knowledge-at-the-time after later corrections
- forecast outside use shifts exhaustion date by scenario
- biweekly period crosses month and fiscal boundary
- budget revision takes effect
- scenario hire is promoted to baseline
- low/expected/high inversion is rejected
- closed fiscal year blocks normal editing
- integer rounding remains stable across aggregation
