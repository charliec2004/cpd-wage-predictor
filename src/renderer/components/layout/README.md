# Desktop layout primitives

These components carry Semester Scheduler's shell structure into Wage Predictor while preserving native macOS, Windows, and Linux window behavior.

- `DesktopTitleBar` reserves the correct native-control safe area and keeps global utilities in a non-draggable region.
- `TopTabNavigation` provides the compact editor-style global tab row with complete keyboard navigation.
- `WorkspaceShell` fixes the title bar and navigation while making the active workspace the sole normal scroll region.
- `useDesktopShortcuts` implements native-modifier navigation and Settings shortcuts while protecting text-entry controls.

Pass the operating-system platform to `DesktopTitleBar` from a narrow preload API. Do not infer it from layout width or user-agent text. See `docs/electron-shell-contract.md` for the window configuration, rationale, and verification matrix.
