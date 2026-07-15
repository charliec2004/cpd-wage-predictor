# Product Specification Index

## Source-of-truth documents

- [Product model](product-model.md) — complete feature behavior and workflows
- [Data model](data-model.md) — conceptual entities, relationships, types, and invariants
- [Forecasting model](forecasting-model.md) — deterministic calculation order and formulas
- [FY 2026–27 Chapman research](research/chapman-calendar-fy-2026-2027.md) — official-source calendar seed and unresolved dates
- [Decision questionnaire](decision-questionnaire.md) — implementation questions for CPD
- [Specification audit](spec-audit.md) — independent gap review and resolutions
- [Product design system](../design.md) — visual language and interface behavior
- [Electron shell contract](electron-shell-contract.md) — native macOS/Windows/Linux layout behavior

## Current decisions

- Offline Electron desktop application
- Multi-year browsing in one local workspace experience
- Fiscal years run June 1–May 31
- Daily calculation with weekly operating views
- Recurring and week-specific schedules coexist
- Fall/Spring default toward recurring schedules
- Summer/Interterm default toward week-specific schedules
- Actuals progressively replace forecasts
- Past dates without actuals remain visibly missing
- Work-study gross award consumption and CPD departmental offset are separate ledgers, not a boolean
- Federal Work-Study defaults to unavailable in Summer
- Named scenarios precede probabilistic simulation
- System clock supplies today; historical recomputation and immutable snapshots are distinct
- Calendar and closure data are editable per fiscal year

## Unresolved decisions

The largest unresolved areas are:

- CPD's precise accounting treatment of work-study
- gross wage versus department-charge budget basis
- pay-period/fiscal-year attribution
- actual payroll data format and timing
- workspace sharing/storage on CPD computers
- exact work-study eligibility dates and outside-job visibility
- schedule time precision and override semantics
- encryption recovery, workspace custody, and export protections
- direct schedule exchange with Semester Scheduler

See the [decision questionnaire](decision-questionnaire.md) for the complete list.

## Intended implementation sequence

1. Resolve P0 questions.
2. Convert the conceptual schema into versioned TypeScript domain types.
3. Implement the pure daily-ledger engine and unit tests.
4. Implement multi-year workspace persistence and migrations.
5. Build the FY 2026–27 vertical slice.
6. Add actual import/reconciliation.
7. Add scenarios and comparison.
8. Package, test on Windows/macOS, and prepare Chapman-controlled handoff.
