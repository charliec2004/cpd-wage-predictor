# CPD Wage Predictor Product Model

Status: working specification for review
Audience: CPD staff, future maintainers, designers, and developers
Scope: offline multi-year desktop application for student wage planning

## 1. Product objective

CPD Wage Predictor helps Chapman University's Career and Professional Development team use its student wage budget confidently throughout each June 1–May 31 fiscal year.

The app combines known history and editable future assumptions:

- verified payroll actuals
- worked or approved hours not yet posted
- recurring Fall and Spring schedules
- week-specific Summer and Interterm schedules
- individual schedule exceptions
- office closures, partial closures, breaks, and special events
- current student workers and effective-dated wages
- work-study awards, eligibility, outside-job usage, and exhaustion
- planned hires, departures, vacancies, and replacement assumptions
- low, expected, and prudent-high scenarios

The output is an explainable week-by-week projection of gross wages, work-study gross-award consumption, departmental offset, CPD-funded cost, remaining budget, and forecast uncertainty.

## 2. Core product principles

### 2.1 Actuals and plans are different kinds of truth

Posted actuals are historical facts. Accrued hours are near-facts awaiting payroll. Schedules are operating commitments. Scenarios are hypotheses. The app must label and preserve those distinctions instead of collapsing them into one editable number.

### 2.2 Daily calculation, weekly operation

Dates are the canonical calculation unit because fiscal boundaries, closures, partial closures, wage changes, and employment dates can occur midweek. CPD normally views and edits weekly summaries, but the engine calculates daily records and aggregates them.

### 2.3 Nothing historical is silently forecast

If the as-of date has passed and actual data is missing, the period is marked `Missing actuals`. A forecast may be shown separately as an estimate, but it may not masquerade as an actual.

### 2.4 Every number is explainable

Selecting any weekly or annual amount reveals the worker-days, wage rates, schedule sources, overrides, work-study allocation, and scenario events that produced it.

### 2.5 Calendar settings are editable data

Chapman's published academic calendar is a useful seed, not hidden business logic. Each fiscal year has explicit, editable academic periods, office hours, closures, partial closures, and reduced-staffing periods.

### 2.6 Multi-year history is first-class

The app holds many fiscal years in one local workspace. Users can browse prior years, compare them, copy settings forward, and keep completed years as stable historical records.

## 3. Workspace and multi-year organization

### 3.1 Workspace

A workspace represents CPD's student wage planning history. It contains:

- workspace identity and schema version
- organization-level preferences
- a directory of people or anonymized worker identities
- fiscal years
- reusable calendar templates
- import mappings
- audit history

The workspace is stored locally and can be backed up or exported. The app does not require an account, network connection, or personally hosted service.

### 3.2 Fiscal-year catalog

The fiscal-year browser shows all years, for example:

```text
FY 2024–25  Closed     $… actual
FY 2025–26  Closed     $… actual
FY 2026–27  Active     $… actual + forecast
FY 2027–28  Planning   $… forecast
```

Fiscal-year states:

- `Planning`: future year under configuration
- `Active`: current operating year
- `Closing`: year ended but actuals or reconciliation remain incomplete
- `Closed`: reconciled historical year
- `Archived`: retained but hidden from the default browser

Only one year is normally `Active`, but the data model does not assume the computer's current date always identifies it.

### 3.3 Creating a fiscal year

Users may:

- create a blank June 1–May 31 year
- copy calendar structure and settings from a prior year
- copy workers as returning-worker candidates without copying their hours blindly
- import a suggested Chapman calendar seed
- define the annual budget and later budget revisions
- designate office closures and partial closures
- configure work-study availability and funding behavior

Copy-forward is a review workflow. Every copied wage, worker, date, closure, and schedule is visibly marked `Needs review` until confirmed.

### 3.4 Closed years

Closing a year freezes ordinary editing but does not make correction impossible. Reopening requires a reason and creates an audit entry. Forecast scenarios are excluded from final actual totals but may be retained for forecast-accuracy analysis.

## 4. Fiscal calendar model

### 4.1 Fiscal boundary

Each fiscal year defaults to June 1 at 12:00 a.m. through May 31 at 11:59:59 p.m. in `America/Los_Angeles`. Dates are stored as calendar dates for schedule logic; timestamps are reserved for imports and audit records.

### 4.2 Calendar layers

Each date can carry independent layers:

1. `Fiscal membership` — which fiscal year owns the date.
2. `Academic period` — Summer, Fall, Interterm, Spring, break, finals, or a custom period.
3. `Office availability` — normal hours, reduced hours, closed, or custom.
4. `Staffing expectation` — normal, reduced, elevated, or manual.
5. `Named events` — commencement, career fair, orientation, or other demand drivers.

This prevents a student-only recess from incorrectly closing CPD. Thanksgiving Monday–Wednesday and Spring Break, for example, can reduce expected student availability while the office remains open.

### 4.3 Academic periods

An academic period has:

- name and type
- inclusive start and end dates
- optional instruction and finals subranges
- default schedule mode: `recurring` or `week-specific`
- default staffing multiplier for new plans
- notes and source citation

Recommended non-overlapping period types:

- Summer
- Fall instruction
- Fall finals
- Winter transition
- Interterm
- Interterm/Spring transition
- Spring instruction
- Spring finals
- Post-Spring/FY close
- Unclassified
- Custom

Periods must partition every fiscal-year date exactly once so no transition day disappears from the calculation. If CPD has not yet classified a date, the app creates a visible `Unclassified` period that blocks year confirmation. Thanksgiving recess, Spring Break, winter closure, commencement, and similar overlays are calendar events or office rules rather than overlapping academic periods.

### 4.4 Office availability

The office calendar supports:

- normal weekday opening and closing times
- weekends closed by default
- full-day closures
- partial closures and early releases
- special openings
- date ranges
- closure reason and source

A closure suppresses planned hours that fall inside the closed interval. It does not erase an existing actual. A user may explicitly authorize a future exception to work during a closure; the exception is visually flagged and requires a note.

Office rules may contain multiple same-day intervals for split hours. Overlap resolution uses explicit priority, then the narrower date range, then creation time; an unresolved tie blocks the forecast. Overnight shifts are out of scope for the first release and must be split at midnight if later supported.

### 4.5 Week identity

The display week start is configurable, with Monday recommended. Fiscal boundaries can create partial display weeks. The engine never assigns June days to the prior fiscal year or May days to the next merely to make a seven-day row.

Payroll pay periods are a separate grouping layer. Weekly forecasting and biweekly payroll reconciliation must coexist.

## 5. People, employment, and planned capacity

### 5.1 Person versus fiscal-year employment

A person can appear in multiple fiscal years, while employment facts can change by year. The global person record should contain the minimum stable identity needed to recognize a returning worker. Each fiscal year contains a separate employment record with:

- display name or pseudonym
- active start and end dates
- status
- effective-dated wage rates
- role or team label
- expected graduation or departure date
- work-study assumptions for that academic year
- schedules and exceptions
- notes

The app must not store Social Security numbers, bank details, tax records, or other unnecessary sensitive identifiers.

### 5.2 Worker states

- `Candidate`: possible future hire
- `Planned`: approved position without a completed hire
- `Onboarding`: named hire who may incur only explicitly configured training/onboarding time
- `Active`: currently eligible to work
- `Paused`: temporarily not scheduled
- `Ended`: employment ended
- `Canceled`: planned hire will not occur

Status alone does not create cost. Cost requires an eligible date range, payable hours, and an effective wage. The initial eligibility matrix is explicit: Candidate and Canceled never create baseline cost; Planned, Onboarding, and Active can create cost inside their dates; Paused and Ended do not create cost during/after their inactive intervals. Onboarding training is a separate earning type. Any change to that matrix is a visible fiscal-year policy, never hidden behavior.

If an included hour has no effective wage rate, the forecast is marked non-computable and cannot be presented as an official zero-dollar total.

### 5.3 Effective-dated wages

Each employment record may have multiple wage rates with effective dates. A date uses the latest rate effective on or before it. Retroactive payroll corrections are stored as actual adjustments rather than rewriting previously posted history without a trace.

### 5.4 Planned hires and vacancies

A scenario may contain a placeholder position such as `Spring front desk hire 1` with:

- earliest, expected, and latest start dates
- expected wage or wage range
- expected schedule
- work-study assumption
- probability or scenario membership, if probabilities are later enabled
- optional planned departure date

When a real student is hired, the placeholder can be converted or linked to the employment record without losing the original forecast assumption.

## 6. Schedule model

### 6.1 Period schedule mode

Every academic period can choose:

- `Recurring`: a weekly template repeats across the period.
- `Week-specific`: every week is entered independently.
- `None`: no default hours; only explicit additions create work.

Fall and Spring normally use `Recurring`. Summer and Interterm normally use `Week-specific`, but the user can choose per year and per worker.

### 6.2 Recurring weekly template

A template stores worker-day shifts or total hours by date and may include multiple intervals on one day. It applies only while:

- the worker is active
- the template is effective
- the date belongs to the associated period
- the office is available
- no higher-precedence exception replaces it

Templates are effective-dated so a student's normal schedule can change midsemester without rewriting earlier weeks.

### 6.3 Week-specific schedule

For Summer, Interterm, unusual breaks, and volatile periods, the user can enter hours directly for a selected week. Helpful operations include:

- copy prior week
- copy selected workers only
- apply one worker to several weeks
- clear a week
- show differences from the period template
- preserve actuals while replacing future planned hours

### 6.4 Exceptions

Exceptions may target:

- one worker on one date
- one worker for a week
- all workers on a date
- a selected group for a date range

Exception types include absence, added event hours, shift replacement, schedule change, temporary pause, office closure, special opening, and manual correction.

### 6.5 Calculation precedence

From highest to lowest authority:

1. Posted payroll actual or posted adjustment
2. Approved/worked accrued hours
3. Explicit day-level worker override
4. Explicit week-level worker override
5. Effective recurring period schedule
6. Scenario placeholder schedule
7. Zero hours

Office availability is applied to future sources 3–6. It does not delete actuals. Any future work explicitly authorized during a closure must opt out of closure clipping and carry a note.

### 6.6 Extra hours and events

Extra event hours are additions with their own date, worker or placeholder, scenario, certainty state, and explanation. They should not require altering the worker's reusable weekly template.

## 7. Actuals and reconciliation

### 7.1 Actual data states

- `Posted`: confirmed payroll result
- `Accrued`: hours worked or approved but not posted
- `Estimated past`: model estimate for a past date with missing actuals
- `Missing`: past date with neither actual nor accepted estimate

Only `Posted` contributes to official actual totals. Dashboard views may combine Posted and Accrued but must label the total.

### 7.2 Entry and import

Actuals may be:

- entered manually by worker and date/week
- pasted from a table
- imported from CSV or Excel
- imported by pay period and allocated to work dates if the source includes them
- imported as dollar-only adjustments when hours are unavailable
- classified by earning type, including regular work, paid training, paid sick time, premium, or correction when present in the source

Imports require preview, field mapping, validation, duplicate detection, and an undoable import batch. The raw source file is not required to be embedded; a checksum, filename, import time, and normalized rows provide provenance.

Actual authority is tracked independently for hours, gross wages, work-study gross consumed, departmental work-study offset, and final department charge. One imported row may therefore be factual for gross wages but estimated for departmental cost. Posted rows have stable source identifiers or composite fingerprints; corrections create reversals or superseding entries rather than overwriting history.

Pay-period or dollar-only actuals do not automatically become daily facts. They remain in a visible unallocated bucket until the source provides work dates or a user chooses a documented allocation rule such as proportional-to-approved-hours, proportional-to-schedule, or manual allocation.

### 7.3 Reconciliation

For every worker-period, the app can compare:

- planned hours
- accrued hours
- posted hours
- planned cost
- posted gross wages
- predicted work-study gross consumption and departmental offset
- posted or confirmed funding allocation when available

Differences remain explainable rather than being silently absorbed into the forecast.

## 8. Work-study model

### 8.1 Award

Work-study is represented as an effective-dated funding award, not a boolean. Fields include:

- gross-earnings award cap
- accepted/confirmed status
- eligibility start and end dates
- remaining amount as of a known date
- departmental offset/reimbursement percentage
- gross earnings already consumed across all jobs
- future outside-job usage assumption
- source and last-confirmed date

The default gross-earnings cap may be $3,000, but the value is editable per student and year. Gross earnings consuming the award and dollars offsetting CPD's budget are two distinct ledgers. They may be equal under a 100% offset rule, but the data model never assumes that equivalence.

### 8.2 Summer

Federal Work-Study is unavailable during Summer according to Chapman's current published guidance. Summer wages are therefore CPD-funded unless another explicit funding source is configured. The rule belongs to the fiscal-year settings so future policy changes do not require a code change.

### 8.3 Allocation sequence

For each eligible date, the engine calculates work-study-eligible gross wages. Gross award consumption is limited by:

- confirmed award
- prior eligible earnings across all tracked jobs
- known or forecast outside-job consumption
- eligibility dates
- the award-allocation order when multiple jobs consume the same cap

The separate department offset is the gross award consumption multiplied by the confirmed institutional offset rule. After the award is exhausted, no further work-study offset applies and remaining wages become CPD-funded. The exact institutional cost-sharing rule is an unresolved business decision and must be configured explicitly rather than assumed.

### 8.4 Multiple jobs

The app does not need full schedules for another department's job. It must support at least:

- one known amount already consumed elsewhere
- an expected future outside-use amount or weekly pattern
- an uncertainty range
- a last-confirmed date

Outside usage participates in scenarios because its timing can change when CPD loses work-study coverage.

Outside-job dollars support award depletion; outside-job minutes support combined weekly-hour warnings. The app does not infer one from the other without an explicit wage and allocation rule.

### 8.5 Hour-limit warning

Chapman's published Federal Work-Study guidance says a student may work up to 19 hours per week. The app warns when CPD-planned hours alone exceed the configured limit and separately warns when CPD plus known outside-job hours exceed it. This is a warning and validation rule, not an automatic deletion of hours.

## 9. Budget model

Each fiscal year can contain:

- original CPD student wage budget
- effective-dated budget revisions
- optional reserved contingency
- optional sub-budgets or cost centers
- gross wage projection
- work-study gross-consumption and departmental-offset projections
- CPD-funded wage projection
- optional employer burden or payroll overhead
- remaining uncommitted budget

The primary decision measure is `CPD-funded cost`, not gross wages, but both remain visible.

Budget calculations must not treat work-study as cash already received unless that matches CPD's accounting treatment. The user questionnaire resolves whether the app models departmental charges, reimbursement, or another ledger convention.

Budget revisions preserve both their financial effective date and the timestamp when CPD recorded or learned the change. This supports both current corrected truth and point-in-time forecast evaluation.

## 10. Forecast and scenario model

### 10.1 Baseline

The baseline is the currently approved operating plan. It contains current workers, committed schedules, known hires/departures, calendar rules, work-study assumptions, and actuals.

### 10.2 Named scenarios

Initial scenario set:

- `Plausible low`: credible lower-cost outcome
- `Expected`: best current operating forecast
- `Prudent high`: credible higher-cost outcome used to protect the budget

Scenarios inherit the baseline and store deltas rather than complete copies. A delta may add or alter a hire, departure, schedule, event, wage, work-study assumption, outside-job usage, or staffing multiplier.

### 10.3 Certainty

Future items may be:

- `Committed`: approved and expected to occur
- `Planned`: current best plan
- `Scenario`: hypothetical alternative

Certainty is distinct from scenario. A committed hire can exist in every scenario, while a hypothetical hire exists only in selected scenarios.

### 10.4 As-of date

The app defaults to the computer's local date and does not need internet access to know today. Users can set an analysis as-of date to recompute the current model at another seam. That is not the same as reproducing what CPD knew then, because schedules, actuals, budgets, and assumptions may since have changed. Reproduction requires a saved immutable forecast snapshot containing the as-of date, source revision, scenario, engine version, and totals or derived rows.

### 10.5 Funnel behavior

As the year progresses, posted and accrued data replace uncertain future data. The range should usually narrow because fewer future dates remain, but it is not forced to narrow mathematically. A new wage change, vacancy, funding loss, or hiring plan may legitimately widen it.

### 10.6 Explainability

Every forecast total exposes:

- actual/accrued/planned/scenario split
- workers and placeholders included
- hours and effective rates
- work-study assumptions and exhaustion date
- calendar suppressions and overrides
- difference from baseline

## 11. Core screens and workflows

### 11.1 Fiscal-year browser

- browse, compare, create, close, reopen, archive, export, and restore years
- see year status, actual completeness, budget, final/forecast cost, and last edit

### 11.2 Overview

- current as-of date and actual-completeness warning
- budget, posted cost, accrued cost, expected remaining cost, and projected year-end balance
- plausible-low/expected/prudent-high comparison
- fiscal timeline with forecast seam
- top risks and upcoming staffing changes

### 11.3 Workers

- current, past, and planned workers
- employment dates and wage history
- work-study award and remaining balance
- recurring schedules by period
- exceptions, notes, and data completeness
- conversion of planned positions into hires

### 11.4 Schedule

- fiscal week selector and jump-to-today
- recurring template editor for stable periods
- week-specific editor for volatile periods
- compare week against template
- office closures and academic-period context
- worker, day, group, and event overrides
- selected week's total gross and CPD-funded cost

### 11.5 Actuals

- paste/import/manual entry
- import mapping and preview
- duplicate and anomaly review
- accrued-to-posted reconciliation
- missing-actuals queue
- import batch history and undo

### 11.6 Scenarios

- baseline plus named alternatives
- add planned hire/departure/event/funding change
- compare weekly and year-end differences
- promote selected scenario changes into the baseline

### 11.7 Year settings

- fiscal dates and display-week start
- annual budget and revisions
- academic periods and default schedule modes
- standard office hours
- closures, partial closures, and special openings
- staffing multipliers
- work-study policy and limits
- cost/burden settings
- source links, notes, and confirmation status

## 12. Safety, privacy, and durability

- Offline by default; no network required for calculations or current date.
- The signed-in operating-system account is the initial authentication boundary; the app does not add a separate password in the first release.
- Encrypt the live workspace, automatic backups, and ordinary backup files by default with an operating-system-protected key. Define recovery and computer-transfer behavior before implementation.
- Plain CSV/Excel/JSON exports are explicit user actions and display a sensitive-data warning before creation.
- Deny other local operating-system users access through restrictive file permissions where the platform permits it.
- Store the minimum personal data needed for planning.
- Never store SSNs, bank information, FAFSA details, or unrelated financial-aid data.
- Validate every import and keep malformed rows out of the calculation model.
- Version the workspace schema and run explicit migrations with backups.
- Provide automatic local backups plus user-controlled backup/export.
- Never send operational data to the public GitHub repository.
- Keep an audit trail for imports, year closure/reopening, budget revisions, actual corrections, and baseline promotions.
- Document the local threat model before weakening encryption or sharing protections; “offline” does not make payroll and financial-aid data non-sensitive.

## 13. Non-goals for the first release

- replacing Chapman payroll or timekeeping
- approving timesheets
- calculating student take-home pay or tax withholding
- automatically accessing private Chapman systems
- multi-user real-time editing
- cloud accounts or CPD-hosted services
- opaque AI-generated forecasts
- enforcing employment policy without human review

## 14. First vertical slice

The first functional implementation should prove:

1. Create FY 2026–27 in a multi-year workspace.
2. Configure Summer, Fall, Interterm, Spring, breaks, and office closures.
3. Add a worker with an effective wage and work-study award.
4. Set a recurring Fall schedule.
5. Override one Fall week and add one event shift.
6. Enter week-specific Summer and Interterm hours.
7. Add a hypothetical Spring hire in one scenario.
8. Enter or import one posted week of actuals.
9. Calculate daily records and weekly totals.
10. Show gross wages, projected work-study gross consumption, departmental offset, CPD-funded cost, budget balance, and a trace for every number.

## 15. Acceptance criteria for the model

- Many fiscal years can coexist and be browsed without opening separate applications.
- Each year owns editable calendar, closure, budget, worker, schedule, actual, and scenario settings.
- A recurring schedule can be altered for one week without modifying other weeks.
- A worker can have a different schedule mode from the period default.
- Summer can operate week-by-week with no work-study eligibility or offset.
- Student-only breaks reduce staffing assumptions without falsely closing the office.
- Full and partial closures suppress future hours correctly.
- Effective-dated wages calculate correctly across a rate change.
- Posted actuals are never overwritten by schedule edits.
- Missing past actuals remain visible.
- Outside-job work-study usage changes the predicted exhaustion date and CPD-funded cost.
- Scenario hires and departures change only their scenarios until promoted.
- The range generally narrows as actuals replace future estimates but may widen when assumptions change.
- Every weekly and annual total can be reconstructed from its underlying records.
