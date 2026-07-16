# CPD Wage Predictor

An offline desktop planning tool for Chapman University's Career and Professional Development team. It combines recurring student schedules, week-specific staffing plans, work-study balances, hour corrections, and future hiring scenarios into a rolling fiscal-year wage forecast.

## Product direction

- Offline-first Electron application
- One local workspace containing multiple fiscal years
- No server, hosted account, or internet connection required
- Current-date awareness from the computer's system clock
- Recurring fall and spring schedules
- Week-specific summer and Interterm schedules
- Scheduled hours are assumed worked until a day or week is corrected
- Dated coverage states for assumed past, actual corrections, future schedules, estimates, and missing periods
- Comparable-period estimates with editable lower, expected, and higher paid team hours
- Missing periods make the annual forecast incomplete instead of silently implying zero staffing
- Work-study and non-work-study cost tracking
- Saved staffing scenarios
- Readable JSON backup export and import
- Designed for nontechnical CPD staff

## Design family

Wage Predictor is a sibling of Semester Scheduler. The two applications share the same compact desktop-tool character, Geist typography, semantic light/dark color tokens, control density, restrained motion, and reusable UI primitives.

See [design.md](design.md) for the complete visual system and product-specific application guidance.

See [docs/specification-index.md](docs/specification-index.md) for the functional model, calendar research, data model, forecasting rules, and open CPD decisions.

## Current status

The first working vertical slice is implemented. It includes the secure Electron shell, encrypted local persistence, automatic local backups, portable export/import, the forecast engine, multi-year settings, workers, schedules, closures, hour corrections, comparable-period estimates, lower/expected/higher ranges, staffing scenarios, and a responsive light/dark interface. The core model is covered by automated tests.

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm test
npm run build
```

## Repository layout

```text
src/main/                     Secure Electron shell and encrypted storage
src/preload/                  Narrow renderer-to-main bridge
src/renderer/components/      Shared interface and desktop-shell primitives
src/renderer/src/domain/      Calendar seed and forecasting engine
src/renderer/src/features/    Overview and editing workflows
src/renderer/styles/          Semantic light/dark theme tokens
src/shared/                   Validated workspace schema and shared types
docs/electron-shell-contract.md Platform and window-layout contract
design.md                     Visual language and implementation rules
```

## Data ownership

Operational data is encrypted at rest in the current computer user's application-data folder. The app keeps rolling local backups, and staff can create a readable portable workspace export for Chapman-controlled storage or transfer to another CPD computer. Source code, release installers, documentation, and exports should all be copied to Chapman-controlled storage before project handoff.
