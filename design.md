# CPD Product Design System

## 1. Purpose

CPD Wage Predictor and Semester Scheduler should feel authored by the same product team. They share a shell, typography, color logic, component grammar, density, and interaction tone. Wage Predictor is not a reskin of Scheduler: its information architecture is organized around fiscal time, actual-versus-forecast state, staffing cost, and work-study funding.

The interface is a serious desktop planning tool. It should resemble calm editor chrome more than a marketing site or colorful SaaS dashboard.

## 2. Design thesis

The product's signature is the **forecast seam**: a precise boundary on the fiscal timeline separating verified actuals from the future plan. The seam moves as time advances. Actual, accrued, scheduled, and simulated values must be distinguishable through labels, texture, border treatment, and density before color is used.

```text
ACTUAL / ACCRUED                    FORECAST / SCENARIO
Jun ---------------- Oct 15 | Oct 16 ---------------- May
                            ^
                       forecast seam
```

This temporal device is specific to Wage Predictor. Everything around it stays restrained and consistent with Semester Scheduler.

## 3. Product character

The interface should feel:

- monochrome-first
- compact
- calm
- precise
- desktop-native
- operational
- traceable

It should not feel:

- like a marketing dashboard
- oversized or mobile-first
- card-heavy
- playful or gamified
- dependent on bright color
- mysterious about how a number was calculated

## 4. Typography

### Families

- UI and display: `Geist Sans`
- Structured values: `Geist Mono`
- Fallbacks: system sans; Menlo/Monaco for mono

Use mono sparingly for dates, currency tables, hours, scenario identifiers, calculated paths, keyboard shortcuts, and import logs. Do not use it as the default shell font.

### Scale

| Role | Size | Weight | Notes |
| --- | ---: | ---: | --- |
| Screen title | 18px | 600 | Rare; one per primary workspace |
| Section title | 14–15px | 600 | Understated |
| Body/control | 13px | 400–500 | Default desktop UI text |
| Supporting text | 12px | 400 | Use muted foreground |
| Badge/meta | 11px | 500 | Compact labels only |

## 5. Color system

Color is semantic, not decorative. Neutral surfaces carry hierarchy. Green is reserved for the primary productive action and confirmed success. Red is reserved for destructive actions and errors. Amber is reserved for warnings and unresolved fiscal risk.

### Light mode anchors

- Canvas: `hsl(0 0% 99%)`
- Ink: `hsl(240 10% 4%)`
- Card: `hsl(0 0% 100%)`
- Border: `hsl(240 6% 88%)`
- Muted text: `hsl(240 4% 42%)`
- Primary action: `hsl(141 41% 31%)`

### Dark mode anchors

- Canvas: `hsl(0 0% 4%)`
- Ink: `hsl(0 0% 96%)`
- Card: `hsl(0 0% 8%)`
- Border: `hsl(0 0% 18%)`
- Muted text: `hsl(0 0% 62%)`
- Primary action: `hsl(141 41% 31%)`

The canonical implementation is [src/renderer/styles/tokens.css](src/renderer/styles/tokens.css). Components must consume semantic variables instead of hardcoding light- or dark-specific colors.

## 6. Theme behavior

Support `system`, `dark`, and `light` preferences. Theme selection must persist locally and apply before the renderer's first visible frame to avoid a flash. When `system` is selected, track operating-system changes live.

Electron window background, title-bar overlay, and symbol colors must follow the resolved theme. Both themes are first-class; do not ship a theme selector until every core surface passes contrast and state checks.

## 7. Shape, spacing, and density

- Base radius: `0.5rem`
- Default control height: 32px
- Small control height: 28px
- Large control height: 36px and rare
- Default icon: 16px
- Compact icon: 14px
- Default page padding: 16–20px
- Form/tool gaps: 8–12px
- Panel padding: 16–20px

Use borders and stepped surfaces more than shadows. Avoid pills unless the content is genuinely tag-like. Use large cards only for real conceptual grouping, not every metric.

## 8. Layout language

The shell is full-screen and shallow:

```text
┌─────────────────────────────────────────────────────────────┐
│ compact title bar                            utility actions │
├───────────────┬─────────────────────────────────────────────┤
│ navigation    │ contextual toolbar                          │
│               ├─────────────────────────────────────────────┤
│               │                                             │
│               │ active planning workspace                   │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

The shell recedes behind the planning surface. Tables, timelines, schedule grids, and inspection panels—not oversized KPI cards—are the primary spatial materials.

## 9. Wage Predictor information states

Every hour and dollar must identify its status:

| State | Meaning | Treatment |
| --- | --- | --- |
| Actual | Posted and verified | Highest certainty; solid treatment |
| Accrued | Worked/approved, not posted | Subtle hatch or labeled border |
| Committed | Confirmed future staffing | Normal forecast surface plus lock marker |
| Planned | Current operating forecast | Neutral forecast treatment |
| Scenario | Hypothetical alternative | Dashed boundary and explicit scenario label |
| Missing | Past period lacking actuals | Warning marker; never silently forecast |

Do not rely on color alone. Use text labels, icons, border styles, and explanatory tooltips.

## 10. Component rules

Use shadcn-style copied primitives as the shared interaction system. Prefer composition and semantic tokens over one-off utility stacks.

### Buttons

- Default: productive primary action
- Secondary: supporting action
- Outline: neutral structural action
- Ghost: toolbar and low-emphasis action
- Destructive: irreversible or high-risk action
- Link: inline navigation only

Use `size="sm"` in dense toolbars. Button labels use direct verbs: `Save project`, `Import actuals`, `Add worker`, `Compare scenarios`.

### Inputs

Inputs use 32px height, 13px text, crisp borders, and visible neutral focus rings. Currency, hours, dates, and percentages must use typed inputs with adjacent units or formatting—not ambiguous free text.

### Cards and panels

Cards group a real concept such as work-study status or a scenario summary. Large planning surfaces use panels, separators, and tables rather than nested cards.

### Badges

Badges identify compact state: `Actual`, `Forecast`, `Work-study`, `Overdue`. They do not become colorful decoration.

### Dialogs

Use dialogs for bounded confirmation or editing. Destructive confirmations name the consequence. Do not place entire workflows inside layered modals.

### Notices

Notices explain warnings, import failures, missing actuals, or successful reconciliation. The message must say what happened and what to do next.

## 11. Motion

- 150–220ms transitions
- Fade or translate by no more than 10px
- No bounce, pulse, or ornamental springs
- Respect `prefers-reduced-motion`
- Theme transitions may animate color and border only

The moving forecast seam is the one distinctive temporal motion. It should update deliberately, never continuously shimmer.

## 12. Accessibility

- Keyboard focus remains crisp in both themes
- Every icon-only control has an accessible label
- Compact controls retain adequate hit targets
- Status is never communicated by color alone
- Tables have meaningful headers
- Forecast charts have textual summaries
- Reduced-motion mode removes nonessential transitions
- Currency and hours retain readable precision at zoom

## 13. Product vocabulary

Use terms CPD staff recognize:

- `Fiscal year`, not `model horizon`
- `Actual hours`, not `observations`
- `Planned worker`, not `synthetic employee`
- `Work-study remaining`, not `subsidy capacity`
- `Expected`, `Prudent high`, and `Plausible low`
- `Save project`, not `persist state`

## 14. Primitive source of truth

Reusable source primitives live in `src/renderer/components/ui`. They began from the Semester Scheduler component language and are intentionally kept compatible. Product-specific components may compose these primitives but should not fork their colors, heights, radii, or focus behavior.

Initial primitive set:

- `Button`
- `Input`
- `Card`
- `Badge`
- `Checkbox`
- `DialogShell`
- `ConfirmDialog`
- `NoticePanel`
- `HourInput`

## 15. Family resemblance versus product distinction

Shared with Semester Scheduler:

- Geist type system
- Compact shadcn-style controls
- Light/dark semantic tokens
- Monochrome stepped surfaces
- Restrained green, amber, and red semantics
- Tight desktop density
- Quiet motion and crisp focus

Specific to Wage Predictor:

- Fiscal-year timeline
- Forecast seam
- Actual/accrued/planned/scenario state grammar
- Currency and work-study funding displays
- Week-level cost inspection
- Confidence ranges and budget headroom
