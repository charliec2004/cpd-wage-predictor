# First Vertical-Slice UI Plan

## Implemented operational scheduling phase

The Schedule workspace now opens on a Monday–Sunday week grid rather than a worker/period form. Each worker row shows exact shifts and forecasted weekly hours, gross wages, work-study coverage, and CPD-funded cost. Staff can move between weeks, return to Today, and see academic-period and office-closure context in place.

Schedule editing has explicit authority boundaries:

- A future date in a week-specific period replaces that date's planned shifts.
- A future date in a recurring period creates a one-day schedule change without rewriting the semester template.
- The same dialog can intentionally redirect to the repeating-schedule editor when the change should apply every week.
- A past date cannot be rewritten from Schedule. It opens Changes with the worker and date already selected, preserving the rule that past scheduled time is assumed worked until corrected.
- A stored empty one-day change means no shift on that date; removing it restores the repeating template.

The Schedule page separates `Week plan`, `Repeating`, and `Fiscal year setup` so daily staffing work does not compete visually with fiscal-year configuration. Main navigation now uses `Outlook` and `Changes`, matching the user's decision and correction workflows.

`Fiscal year setup` is the single home for Summer and semester boundaries, Fall and Spring finals markers, recurring versus week-specific schedule entry, non-working days, and early or partial closures. Outlook's `Configure year` action opens that view directly. Work-study availability is shown as a derived rule instead of an editable toggle: only Summer is unavailable. Finals are visual context; closures are operational and remove overlapping forecast hours.

## Subject and job

The subject is CPD's fiscal-year student-wage runway. The audience is a nontechnical CPD staff member responsible for deciding whether staffing plans are affordable. The first screen's single job is to answer “Are we on budget?” and make the next setup action obvious.

## Visual system

- Canvas: `#fcfcfc` light / `#0a0a0a` dark
- Shell: `#f7f7f8` light / `#121212` dark
- Ink: `#0a0a0b` light / `#f5f5f5` dark
- Productive action: `#2f7046`
- Fiscal warning: `#b7791f`
- Error/destructive: `#b42318`
- UI/display type: Geist Sans; dates, hours, and currency: Geist Mono

These are the Semester Scheduler's existing semantic tokens, not a visual fork.

## Layout

```text
┌ native title bar · FY selector · save · theme/settings ────┐
├ Outlook | Workers | Schedule | Changes | Forecasts ────────┤
│ Budget outlook · scenario · as-of                            │
│ ┌ Budget status + three supporting totals ────────────────┐ │
│ └ Thin annual actual/planned runway ──────────────────────┘ │
│ Weekly wage / award / CPD cost table                         │
└──────────────────────────────────────────────────────────────┘
```

Before a forecast can exist, the metrics, runway, and empty table are replaced by one three-step setup path: Budget, Workers, Schedule. Completed steps use the Semester Scheduler's exact productive green; the next incomplete step receives the primary green action. Once setup is complete, the setup path disappears.

The empty state also shows a plain-language academic-period model. Each row states the date range, whether shifts repeat weekly or are entered week by week, and whether work-study is available or CPD pays the wage. This replaces the earlier unlabeled proportional color bar, whose spatial encoding was accurate but unnecessarily hard to interpret.

All dates use one application-owned picker composed from a popover and React DayPicker, following shadcn's pattern. Native browser date fields are intentionally avoided because their appearance, layering, and interaction differ across macOS and Windows. Selected dates use productive green; dates outside the allowed fiscal range are visibly disabled; optional dates can be cleared.

Forms and explanation screens remain constrained. The fiscal runway and schedule grids use the full workspace width. A permanent sidebar is intentionally omitted. Green remains reserved for productive actions, work-study coverage, and healthy budget progress; tabs and neutral chrome remain monochrome, matching Semester Scheduler.

## Signature element

The forecast seam is a thin temporal rule on the annual runway at the selected as-of date. Source states use neutral fills and dashed treatments; green stays reserved for productive actions and healthy budget status. Week rows keep the more exact state labels.

## Forecast coverage workflow

`Forecasts` begins with one fiscal-year coverage ledger. It is the required operating workflow; saved staffing scenarios are optional overlays below it.

Each meaningful academic period shows its exact start and end dates and resolves into dated source ranges:

- `Assumed worked`: a past schedule is used because no correction says otherwise. This is not labeled payroll-confirmed.
- `Actual correction`: CPD manually replaced the scheduled hours for a day or week in Changes.
- `Scheduled`: exact future shifts are known but have not happened.
- `Estimated`: unknown time uses a saved staffing estimate.
- `No staffing`: CPD explicitly chose zero student staffing.
- `Missing`: neither a schedule nor an estimate exists. Missing time contributes no assumed dollars and makes the annual forecast incomplete.

For an unknown period, `Plan period` recommends the closest earlier comparable period. Same-type periods rank first; Fall and Spring can seed each other. The source worker patterns are copied as a snapshot, and CPD can edit lower, expected, and higher paid team hours per normal week. Defaults are 85%, 100%, and 115% of the comparable pattern. Full closures and early closures reduce estimated hours. Exact schedules replace the estimate wherever entered.

Outlook uses the expected estimate by default and shows a lower-to-higher CPD-cost range when those variants differ. Its timeline and weekly table distinguish assumed past, corrected hours, exact future schedules, estimates, scenarios, and missing coverage. Once a missing week is reached, dollar cells say `Not forecast` and the running balance says `Incomplete` instead of showing a misleading `$0`.

The app currently has no payroll import. Past scheduled hours therefore remain `Assumed worked` until corrected; the interface must not call them posted or payroll-confirmed.

## Self-critique and revision

The first version became a boxed audit report: two large warnings, four equal metric cards, a runway nested inside the metric card, an empty table, and a setup sidebar. The revised hierarchy progressively discloses the forecast. Empty state and forecast state are now distinct, the CPD cost and remaining budget are dominant, supporting totals are quiet, and the weekly ledger appears only when it has data.
