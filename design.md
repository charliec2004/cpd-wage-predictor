# CPD Product Design System

## 1. Purpose

CPD Wage Predictor and Semester Scheduler should feel authored by the same product team. They share a shell, typography, color logic, component grammar, density, and interaction tone. Wage Predictor is not a reskin of Scheduler: its information architecture is organized around fiscal time, actual-versus-forecast state, staffing cost, and work-study funding.

The interface is a serious desktop planning tool. It should resemble calm editor chrome more than a marketing site or colorful SaaS dashboard.

## 2. Design thesis

The product's signature is the **forecast seam**: a precise boundary on the fiscal timeline separating the past operational record from the future plan. Because the current app does not import payroll, past schedules are labeled `Assumed worked` unless CPD entered an actual-hours correction. The seam moves as time advances. Assumed past, corrected, scheduled, estimated, scenario, and missing values must be distinguishable through labels, texture, border treatment, and density before color is used.

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

Theme ownership crosses a process boundary. The Electron main process owns native chrome and the renderer owns CSS tokens, but both must resolve the same saved preference. The initial native background and title-bar colors are applied before renderer paint; the renderer then applies the matching `light` or `dark` class. Changing theme updates both sides in one operation.

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

The shared family shell follows Semester Scheduler's actual desktop structure: one compact native-integrated title bar, one top-level tab strip, and one independently scrolling workspace. Wage Predictor should not introduce a permanent left sidebar by default; its fiscal timeline and weekly cost tables benefit from horizontal room, and top tabs preserve the strongest family resemblance.

```text
┌─────────────────────────────────────────────────────────────┐
│ native-safe title bar      project identity    utility tools │ 48px
├─────────────────────────────────────────────────────────────┤
│ Overview  Workers  Schedule  Actuals  Scenarios             │ 40px
├─────────────────────────────────────────────────────────────┤
│ contextual toolbar / forecast seam controls                 │
├───────────────────────────────────────────┬─────────────────┤
│                                           │ optional local  │
│ active planning workspace                 │ inspector       │
│                                           │                 │
└───────────────────────────────────────────┴─────────────────┘
```

The title bar and global tabs remain fixed. The main workspace is the only normal vertical scroll container, with a stable scrollbar gutter to prevent horizontal movement when content length changes. Tables, timelines, schedule grids, and inspection panels—not oversized KPI cards—are the primary spatial materials.

### 8.1 Why controls are placed there

- The left side of the title bar establishes application and project identity. It is not a primary navigation zone.
- The right side contains global utilities in ascending commitment: theme, help, keyboard shortcuts, then settings. These tools affect the application rather than the current fiscal object.
- Top tabs represent durable product areas and preserve wide workspace width. They are not a wizard and must not imply that work must happen in sequence.
- Actions that change the current worker, week, or scenario belong in the contextual toolbar or local inspector—not in the global title bar.
- The forecast seam belongs in the planning workspace because it is data state, not application chrome.
- An inspector may appear on the right only when a selected week, worker, or scenario needs detailed editing. It is local and dismissible rather than permanent navigation.

### 8.2 Title-bar geometry

- Native and renderer title-bar height: 48px
- macOS traffic-light position: `{ x: 16, y: 18 }`
- macOS renderer safe area: 96px on the left, 20px on the right
- Windows/Linux: use the Window Controls Overlay CSS environment safe area; fixed right padding is fallback only
- Brand mark: 28px container with 14px icon
- Product title: 14px semibold
- Optional subtitle: 12px muted, hidden when width is constrained
- Utility controls: 28px or 32px; keep at least 6px between controls

The header itself is draggable. Interactive descendants are explicitly `no-drag`; otherwise Electron consumes pointer events. Title-bar text is non-selectable so dragging does not accidentally select the product name.

### 8.3 macOS behavior

Use `titleBarStyle: 'hiddenInset'` so the content and title bar read as one surface while keeping native traffic lights. Keep all interactive content clear of the upper-left traffic-light region. Do not recreate the traffic lights in React.

Use macOS conventions throughout:

- `Command` is the primary shortcut modifier
- application commands live in the macOS application menu
- closing the last window does not quit the application
- reopening from the Dock recreates the main window
- destructive or unsaved-document behavior must integrate with the native close lifecycle

### 8.4 Windows behavior

Use `titleBarStyle: 'hidden'` with the native `titleBarOverlay`. Keep minimize, maximize, and close as native controls. The scheduler previously required a specific Windows fix because those controls covered the Settings action; Wage Predictor treats the native overlay as a reserved safe area from the beginning.

Use Windows conventions throughout:

- `Ctrl` is the primary shortcut modifier
- closing the last window quits the application
- updater access belongs under `Help` rather than a macOS-style application menu
- title-bar symbol color must maintain contrast in both themes
- Windows high-contrast/forced-color mode must preserve outlines, text, and control boundaries

### 8.5 Linux behavior

Linux follows the Windows overlay structure where supported, but symbol contrast may be system-calculated. Do not assume every window manager gives identical overlay geometry. The CSS safe-area variables and conservative fallbacks remain mandatory.

### 8.6 Workspace width and density

Use two workspace widths rather than one universal container:

- `constrained`: maximum 1280px for onboarding, settings, forms, and explanatory content
- `fluid`: full available width for the fiscal timeline, week grid, payroll tables, and scenario comparison

Both use 20px horizontal padding and 24px vertical padding at standard desktop sizes. The minimum supported window target inherited from Scheduler is 1000×700; compact QA must occur at that size. Never solve overflow by shrinking data below legibility—use sticky columns, horizontal scrolling inside the data surface, or a local inspector.

### 8.7 Navigation behavior

The tab list uses proper `tablist`, `tab`, `aria-selected`, and `aria-controls` semantics. Arrow keys move between adjacent tabs; `Home` and `End` jump to the first and last tab. `Command/Ctrl + number` may provide direct access, and `Command/Ctrl + ,` opens Settings. Shortcuts do nothing while the user is typing in an input, textarea, select, or editable region.

The complete implementation contract is in [docs/electron-shell-contract.md](docs/electron-shell-contract.md). Reusable shell code lives in `src/renderer/components/layout`.

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

Shared layout primitives:

- `DesktopTitleBar`
- `TopTabNavigation`
- `WorkspaceShell`
- `useDesktopShortcuts`
- `createWindowShellOptions`

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
