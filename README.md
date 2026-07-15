# CPD Wage Predictor

An offline desktop planning tool for Chapman University's Career and Professional Development team. It will combine recurring student schedules, week-specific staffing plans, work-study balances, actual payroll, and future hiring scenarios into a rolling fiscal-year wage forecast.

## Product direction

- Offline-first Electron application
- One portable project file per fiscal year
- No server, hosted account, or internet connection required
- Current-date awareness from the computer's system clock
- Recurring fall and spring schedules
- Week-specific summer and Interterm schedules
- Actuals progressively replace forecasts
- Work-study and non-work-study cost tracking
- Scenario comparison and narrowing forecast ranges
- Excel/CSV import and export
- Designed for nontechnical CPD staff

## Design family

Wage Predictor is a sibling of Semester Scheduler. The two applications share the same compact desktop-tool character, Geist typography, semantic light/dark color tokens, control density, restrained motion, and reusable UI primitives.

See [design.md](design.md) for the complete visual system and product-specific application guidance.

## Current status

The repository currently contains the shared design foundation and reusable React UI primitives. Application architecture and forecasting behavior will be added next.

## Repository layout

```text
src/renderer/components/ui/   Shared interface primitives
src/renderer/components/layout/ Shared desktop-shell primitives
src/renderer/lib/             Renderer utilities
src/renderer/styles/          Semantic theme tokens
src/main/window-shell.ts      Native window configuration foundation
src/shared/                   Process-safe shared platform types
docs/electron-shell-contract.md Platform and window-layout contract
design.md                     Visual language and implementation rules
```

## Data ownership

Operational data will live in portable fiscal-year project files controlled by CPD. Source code, release installers, documentation, and backups should be copied to Chapman-controlled storage before project handoff.
