# Electron Desktop Shell Contract

## Purpose

This is the implementation-level contract that keeps CPD Wage Predictor and Semester Scheduler in the same desktop product family. It records not only visual measurements but why the shell is structured this way and which operating-system behavior must remain native.

The source audit covered Semester Scheduler's design plans, renderer shell, title-bar CSS, `BrowserWindow` configuration, application menus, keyboard shortcuts, packaging configuration, end-to-end tests, and the historical Windows header-overlap fix.

## Trust and ownership boundaries

- The Electron main process owns the operating-system platform value, native window configuration, menus, close lifecycle, and native chrome colors.
- The preload exposes a narrow, typed platform value such as `darwin`, `win32`, or `linux`. Do not expose Node or Electron objects to the renderer.
- The renderer owns layout composition and CSS theme classes.
- Persisted theme preference is data; resolved theme is derived state. Both processes must resolve it consistently.
- Renderer platform logic receives a trusted platform value through preload. It must not make product decisions from user-agent strings.

## BrowserWindow baseline

Use these Scheduler-derived dimensions unless real Wage Predictor content demonstrates a need to change them:

```ts
const TITLE_BAR_HEIGHT = 48;

const windowOptions: Electron.BrowserWindowConstructorOptions = {
  width: 1400,
  height: 900,
  minWidth: 1000,
  minHeight: 700,
  title: 'CPD Wage Predictor',
  backgroundColor: resolvedTheme === 'dark' ? '#0a0a0a' : '#fcfcfc',
  webPreferences: {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
};

if (process.platform === 'darwin') {
  windowOptions.titleBarStyle = 'hiddenInset';
  windowOptions.trafficLightPosition = { x: 16, y: 18 };
} else {
  windowOptions.titleBarStyle = 'hidden';
  windowOptions.titleBarOverlay = {
    color: resolvedTheme === 'dark' ? '#121212' : '#f7f7f8',
    symbolColor: resolvedTheme === 'dark' ? '#d1d1d1' : '#42424a',
    height: TITLE_BAR_HEIGHT,
  };
}
```

The security settings above are invariants, not styling preferences. The native color constants deliberately match the renderer's semantic background and shell surfaces; they must be updated together if the tokens change.

## First-paint sequence

1. Load and normalize the persisted `system`, `dark`, or `light` preference in the main process.
2. Resolve `system` with Electron's `nativeTheme`.
3. Construct the window with matching native background and overlay colors.
4. Apply the same resolved class to the document before React mounts.
5. Show the window only after the shell has a coherent first frame.
6. When theme changes, update renderer tokens and native overlay colors as one action.

This prevents a light title bar over a dark renderer, mismatched native symbols, and a visible theme flash.

## Custom title-bar anatomy

```text
macOS
┌ traffic lights ─┬─ product / project ─────────── utilities ┐
│ reserved 96px   │ draggable wherever noninteractive        │
└─────────────────┴───────────────────────────────────────────┘

Windows / Linux
┌ product / project ───────── utilities ┬ native controls ───┐
│ Window Controls Overlay safe area     │ reserved by OS      │
└───────────────────────────────────────┴─────────────────────┘
```

Rules:

- `app-region: drag` applies to the title-bar surface.
- Buttons, links, inputs, menus, and other interactive descendants use `app-region: no-drag`.
- The drag surface uses `user-select: none` and has no custom context menu.
- On Windows/Linux, layout uses `env(titlebar-area-x)`, `env(titlebar-area-width)`, and `env(titlebar-area-height)` with conservative fallbacks.
- On macOS, a 96px left inset clears the traffic lights at the configured position.
- Do not render imitation minimize, maximize, close, or traffic-light controls.

## Global shell hierarchy

The shell has three persistent layers:

1. Title bar — product/project identity and global utilities.
2. Top tab bar — durable product areas.
3. Main workspace — current fiscal content and local tools.

Only the main workspace normally scrolls. This keeps window controls, orientation, and global navigation stable while staff inspect long weekly tables. `scrollbar-gutter: stable` prevents the workspace from shifting when a scrollbar appears.

## Top-level Wage Predictor tabs

The initial information architecture should be tested around:

- Overview
- Workers
- Schedule
- Actuals
- Scenarios

Settings remains a global title-bar utility, not a tab. Import is an action within Workers or Actuals unless user testing shows it deserves a durable area. Tab labels name places, not actions.

## Responsive desktop behavior

This is a desktop application, but it still has width states:

- At wide widths, show title, current project/fiscal year, and text labels for major utilities.
- At medium widths, hide the title-bar subtitle before compressing controls.
- At the 1000px minimum, preserve the title, native-control safe areas, and icon-only utilities with accessible labels.
- Data workspaces may scroll horizontally inside their own bounded surface; the title bar and tabs never scroll sideways.
- An optional inspector collapses before the core timeline becomes illegible.

## Platform menus and lifecycle

### macOS

- Provide the application menu with About, updates, Services, Hide, and Quit roles.
- Use native Edit, View, Window, and Help roles.
- Keep the app alive after the last window closes; recreate a window on activation.
- Display `Command` in shortcut help.

### Windows and Linux

- Put update checks under Help.
- Quit after the last window closes.
- Display `Ctrl` in shortcut help.
- Keep native minimize, maximize, and close controls visible through the overlay.

## Keyboard and focus

- `Command/Ctrl + 1…5`: switch durable product areas.
- `Command/Ctrl + ,`: open Settings.
- `Escape`: close the topmost dismissible surface, not every surface indiscriminately.
- Arrow Left/Right and Home/End: navigate the focused top tab list.
- Global shortcuts do not fire from inputs, textareas, selects, or editable content.
- Dialogs trap focus, return focus to their opener, and expose an accessible title and description.

## Verification matrix

Before the shell is considered complete, verify:

| Area | macOS | Windows | Linux |
| --- | --- | --- | --- |
| Native controls do not overlap app actions | Traffic-light inset | Overlay safe area | Overlay/fallback safe area |
| Window drag works between controls | Yes | Yes | Yes |
| Double-click title bar uses native maximize/zoom behavior | Yes | Yes | Window-manager dependent |
| Light/dark native chrome matches renderer | Yes | Yes | Yes |
| System theme follows live changes | Yes | Yes | Yes |
| Shortcut labels use native modifier | Command | Ctrl | Ctrl |
| Last-window lifecycle is native | Remain active | Quit | Quit |
| Minimum window 1000×700 is usable | Yes | Yes | Yes |
| Keyboard focus remains visible | Yes | Yes | Yes |
| Forced-color/high-contrast mode remains operable | Check contrast | Required | Check where supported |

## Known lesson carried from Semester Scheduler

Native controls occupy renderer space even though React does not render them. Semester Scheduler initially used symmetric header padding; on Windows, the native controls covered Settings. A later fix reserved 144px on the right. Wage Predictor retains that fallback but prefers Electron's overlay safe-area environment variables because they reflect actual platform geometry and accommodate changes better than one hardcoded width.
