# Confirmed Product Decisions

Status: confirmed with the CPD student-worker representative on July 15, 2026

These decisions supersede conflicting provisional language elsewhere in the specification. Unknown institutional details remain configurable rather than inferred.

## Wage and work-study calculation

- Ordinary wage cost is `worked hours × hourly wage`. Taxes, benefits, and employer burden are out of scope.
- During eligible periods, each eligible wage dollar consumes one dollar of the student's work-study award and CPD's regular student-worker budget pays zero for that dollar.
- Once the award is exhausted, subsequent wages are paid by CPD's regular student-worker budget.
- A typical award is $3,000, but the award is editable per student and academic year.
- One award balance is shared across Fall, Interterm, and Spring.
- Summer is not work-study eligible. Fall, Interterm, and Spring are eligible.
- Other work-study jobs consume the same award. CPD expects to know the other job's hourly wage and average weekly hours.
- The app estimates the remaining award by default from the starting award, CPD earnings, and estimated outside-job earnings.
- If CPD later obtains an official remaining balance, a user can enter the balance and effective date to recalibrate future estimates.

## Scheduled and worked hours

- Fall and Spring generally use recurring weekly schedules with exact start and end times.
- Summer and Interterm can use week-specific schedules.
- Once time passes, the app assumes the scheduled hours were worked. No routine weekly confirmation is required.
- The app preserves provenance so an automatically assumed value remains distinguishable from a manual correction.
- The primary correction workflow edits a particular day or shift.
- A separate workflow can replace the total for an entire week.
- Editing a past day or week does not alter the recurring schedule for future weeks.

## Office closures

- A full-day office closure automatically suppresses overlapping planned hours.
- A partial closure clips a timed shift to the remaining open interval.
- An explicit manual exception can restore hours when a student actually worked remotely, at an event, or under another authorized exception.

## Forecast scenarios

- The app supports multiple named, saved scenarios.
- Scenarios can model different hire dates, headcounts, departures, wages, schedules, and work-study assumptions.
- Scenarios remain separate from the main operating plan unless a user explicitly promotes their changes.

## Storage and continuity

- The primary workspace lives on one designated CPD computer.
- The app provides automatic local backups.
- Users can create manual backups and export/import the workspace.
- Recovery must work on a replacement CPD computer without depending on a former student worker's personal account or infrastructure.

## Implementation consequences

- The first engine may use a dollar-for-dollar work-study offset rather than a configurable institutional cost-share percentage.
- Outside-job depletion requires both effective dates and a weekly earnings estimate derived from known wage and hours.
- Past scheduled hours are classified as `assumed worked` until manually corrected; they are not represented as imported payroll facts.
- The desktop application can remain offline and single-editor while still using versioned files, backups, and explicit import validation.
