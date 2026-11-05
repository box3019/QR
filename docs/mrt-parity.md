# QR ↔ MRT visual mapping (MRT v9.0.60, commit b4daa1b)

Read-only reference: uploaded `mrt_ui_src` (not cloned, not imported). QR reimplements the same markup patterns, class names, and CSS values in its own files. No ERP, PIN, user/profile, or price modules.

## Screen → MRT component

| QR screen / element | MRT component copied | QR files |
|---|---|---|
| Package list (`TriageView`) | `FeatureReportTable` (`w-full` + `table-fixed` / auto with one remaining column) + `MRT_UTILITY_TABLE_WRAP` one card + `MrtFeatureGroupHeaderRow` | `TriageView.tsx`, `MrtTable`, `mrtTable.css` |
| Parts list | Same report/utility table wrap; one flex `col.qr-mrt-c-text` | `Parts.tsx` |
| Guided check table | `MRT_REPORT_TABLE_TH` / `TD`; locate stays QR | `Checklist.tsx` `qr-ck-tab` |
| Route card | Report table; empty body `MrtEmpty` (`FeatureReportTable` `py-8 text-center`) | `RouteCardView.tsx` |
| Documents / problems | Same grid, empty `py-8` | `Problems.tsx` |
| Part navigator `1..n` + Summary | **Closest (no 1:1 widget):** `MrtSettingsWorkspace` metric/precision segment (`h-10`, `rounded-[var(--mrt-radius,6px)]`, `text-[13px] font-semibold`, inactive `mrt-btn-ghost`, current `mrt-settings-segment-active`). Done/problem fills are QR status (`--qr-st-ok` / `--qr-st-bad`). | `GuidePanel.tsx`, `wizard.css` `.qr-gstep` |
| Wizard footer Cancel / Next / Finish check | `footer.mrt-wizard-footer` chrome (34px secondary, 42px primary, 8px gap, rail `padding-inline-start`). **Placement:** MRT LTR uses `justify-content: flex-end` (physical right). QR Hebrew+English uses `flex-start` so buttons sit on the rail (`inline-start`: HE right, EN left). | `WizardFooter.tsx`, `mrtChrome.css` |
| Finish check | Closes the job tab via `useProjects.close` (same as tab ×). Not `window.close`. Dialog Close stays `wz.close`. | `ProjectView.tsx`, `App.tsx` |
| Summary / loaded counters | MRT chips/cards grouped (`flex`, `flex: 0 0 auto`), not a stretching `1fr` grid. Closest: utility toolbar / toast chips. | `StepSummary.tsx`, `LoadedSummary.tsx`, `Tiles.tsx` |
| Recent (step 1) | `MRT_UTILITY_TABLE_WRAP` **one** card (`.qr-recent`); table inside with no second shell; order number is table text, not a chip; row click opens. | `RecentList.tsx` |
| History dialog | Utility header/footer + grid; empty `MrtEmpty` | `HistoryDialog` `MrtEmpty` |
| Job tabs | `MrtWorkspaceTabStrip` + `mrtLiquidGlass.css` `.mrt-workspace-tab` (1px chip; label/close unframed; strip unframed; add is sibling 1px). Tabs row sits **above** the command toolbar (`qr-tabrow` then `qr-topbar`). | `TabsBar.tsx`, `App.tsx`, `layers.css` |
| Command toolbar | `TopBar` `mrt-topbar-command-row`: 56×96 icon-above-caps, optional dropdown caret | `App.tsx`, `FileMenu.tsx`, `MoreMenu.tsx` |
| Side rail | `LeftPanel` 272px: Route Card caption → job/part label, 32px number, 3×48 divider, framed first-page thumbnail, Critical items, Operation Stack (wizard steps), full-width actions. No user/PIN footer. RTL = inline-start (right). | `WizardRail.tsx`, `Stepper`, `RailContext` |
| Collapsible summary (`רשימת בדיקה` / `לכרטיס מסלול`) | `.mrt-report-card` one 1px shell; header band fill only (`mrt-collapsible-nav-group-btn` transparent border) | `ChecklistSummary.tsx`, `RouteCardSection.tsx` |
| Rail / header / stepper | `LeftPanel` + `MrtCmmProgramWizard` + `WizardHeaderSummaryTable`; step `border: 1px solid transparent`, marker is the circle | `WizardRail`, `RailContext`, `Stepper`, `StepHeader` |
| Dialogs | `MRT_UTILITY_HEADER` 52px/17px/700; footer `min-h 3.25rem` | `Modal`, `mrtChrome.css` |
| Print drawings (parts list) | `MrtPrintCenter` side panel: printer, A3/A4, fit-to-page, copies, auto orientation, preview thumbs, Print/Cancel on the panel | `TriageView`, `PrintDrawingsDialog`, `printDrawings.mjs` |
| Primary buttons | `derivePrimaryButtonCssVars` mixHex | `mrtButtons.ts`, `qrPalette.css` |
| PIN / ERP / user | `MrtPinInput`, `MrtScreenShell` login | **Excluded** |

## Source → QR (tokens)

| MRT (v9.0.60) | Role | QR reimplementation |
|---|---|---|
| `MRT_UI_STANDARDS.md` | Dialog: fixed header, scroll body, fixed footer; no sky-blue focus; no horizontal scroll | `src/styles/mrtChrome.css`, `src/ui/common.tsx` |
| `src/styles/mrtTableFocus.ts` | Report TH: min-h 42px, px-2 py-1, 15px/700 uppercase tracking 0.04em; TD: 15px, 1px grid | `src/styles/mrtTable.css` (`.qr-mrt`) |
| `src/ui/mrtUtilityShell.ts` | Wrap + TH/TD (11px uppercase / 13px); one border | `.qr-mrt-shell`, rail / compact |
| `src/components/FeatureReportTable.tsx` | `className="w-full border-collapse table-fixed"`; empty `py-8 text-center` | `.qr-mrt` `width: 100%`; `.qr-mrt-empty` |
| `src/components/MrtFeatureGroupHeaderRow.tsx` | Group cells 42px, 15px/600, wrap allowed | `.qr-mrt-gh` |
| `src/theme/mrtPaletteTokens.ts` `derivePrimaryButtonCssVars` | mixHex graphite `#8e8e93` + accent | `qrPalette.css` / `.mrt-btn-primary` |
| `mrtLiquidGlass.css` `.mrt-wizard-footer` | 34px buttons, 8px gap, rail padding | `mrtChrome.css` |
| `mrtLiquidGlass.css` `.mrt-settings-segment-active` | accent mix fill + 1px inset | `.qr-gstep[data-current]` |
| `src/ui/MrtScreenShell.tsx`, `MrtPinInput.tsx` | Login / PIN | **Not used** |

## Copied numeric values

| Item | MRT | QR |
|---|---|---|
| Grid line | `--mrt-grid-border` `#64748b`, strong `#334155` | same in `qrPalette.css` |
| Report header | 42px min, 15px/700, uppercase, tracking 0.04em, `#f3f4f6` | `.qr-mrt thead th` |
| Group header | 42px min, 15px/600 | `.qr-mrt-gh` |
| Body row | MRT report TD is 15px/600 (in-cell editors). QR list/read body is 15px/500 so only headers/group headers read as bold (Alex v0.1.18). | `.qr-mrt td` |
| Value wrap | Group cells `whitespace-normal` `[overflow-wrap:break-word]` | `.qr-mrt-wrap`, `.qr-ck-val`, `.qr-bd-v`, why/body cells |
| Card | 1px grid, radius `--mrt-radius` (6px); one shell only | `.qr-mrt-shell`, `.qr-cks-card`, `.qr-rc` |
| Workspace tab | 1px `--mrt-ui-border`, radius 6px, min-height 26px; close 22×22, no border | `.mrt-workspace-tab` |
| Wizard rail | 272px (`LeftPanel` `w-[272px]`) | `--mrt-wizard-rail-width` / `--mrt-workspace-rail-width` |
| Topbar command | 56px height, 96px width, icon 22px, label 11px/600 uppercase, caret 12px | `.qr-topbar .mrt-topbar-cmd` |
| Wizard footer buttons | 34px / 6px 12px / 13px; primary 42px | `.qr-wiz-footer` |
| Segment | h-10, radius 6px, 13px/600, 1px border | `.qr-gstep` |
| Primary button | mixHex fill `#87878c`, text `#ffffff`, border `#757578`, hover `#9e9ea1`; height 42px; disabled opacity 0.48 | `.mrt-btn-primary` |

QR keeps: guided check, locate, per-part PDF, package sort, auto-update, Hebrew RTL + English LTR, no ellipsis on labels/buttons, no horizontal scroll, 4K@200%. Exactly one filled primary command per screen/dialog. App close is the window × only.

## No MRT equivalent (closest pattern used)

| QR-only | Closest MRT | Notes |
|---|---|---|
| Part navigator 1..n + סיכום | Settings segment group | Green/red done/problem is QR status, not in Settings |
| Footer on rail side in RTL | `mrt-wizard-footer` chrome | MRT is LTR `flex-end`; QR uses `flex-start` + `padding-inline-start` |
| Finish check (job tab) | Workspace tab close | Does not close the Electron window |
| Status counter chips | Utility chips / compact cards | `flex` + `flex: 0 0 auto`, never `minmax(100px, 1fr)`. Summary `.qr-stat` is the reference: 1px `--mrt-btn-neutral-border`, white fill, coloured dot, `--qr-card-shadow` rest / `--mrt-btn-hover-shadow` + `translateY(-1px)` lift. Same chrome on tiles, status pills, chips, and light secondary buttons. |
| Locate on drawing | — | QR-only; table chrome still MRT |
