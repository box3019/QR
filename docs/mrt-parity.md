# QR ↔ MRT visual mapping (MRT v9.0.60, commit b4daa1b)

Read-only reference: uploaded `mrt_ui_src` (not cloned, not imported). QR reimplements the same numbers and patterns in its own files. No ERP, PIN, user/profile, or price modules.

## Source → QR

| MRT (v9.0.60) | Role | QR reimplementation |
|---|---|---|
| `MRT_UI_STANDARDS.md` | Dialog: fixed header, scroll body, fixed footer; no sky-blue focus; no horizontal scroll | `src/styles/mrtChrome.css`, `src/ui/common.tsx` |
| `src/styles/tokens.ts` | Geometry: radius 6px, button 40px, topbar 60px, sidebar 240px; table type 11/13/14px | `src/styles/mrtTable.css`, `src/styles/buttons.css` |
| `src/tokens.ts` | Re-export of `styles/tokens` | (not copied as a module) |
| `src/theme/mrtBuiltinPaletteTokens.ts` | Light glass: canvas `#ebebed`, surface `#fff`, muted `#f5f5f7`, grid `#64748b` / `#334155`, text `#1c1c1e` / `#636366` | `src/styles/qrPalette.css` |
| `src/theme/mrtPaletteTokens.ts` `derivePrimaryButtonCssVars` | mixHex graphite `#8e8e93` + accent; fg `#ffffff`; hover/border mix; disabled opacity 0.48 | `qrPalette.css` / `themes.css` / `.mrt-btn-primary` |
| `src/index.css` | `--mrt-radius: 6px`; report thead sticky, header-bg, muted, weight 700 | `src/styles/mrtTable.css` |
| `src/styles/mrtTableFocus.ts` | Report TH: min-h 42px, px-2 py-1, 15px bold uppercase tracking 0.04em, grid-border-strong; TD: 15px semibold, 1px grid | `src/styles/mrtTable.css` (`.qr-mrt`) |
| `src/ui/mrtUtilityShell.ts` | Utility wrap + TH/TD (11px uppercase / 13px semibold, px-2 py-2 / py-1.5); footer min-h 3.25rem; header 17px/52px | `.qr-mrt.qr-wsum-table`, `.qr-modal-*` |
| `src/ui/mrtButtons.ts` | Command `h-10` 13px; row `h-8`; topbar column | `src/ui/mrtButtons.ts` |
| `src/ui/mrtDialogButtonStandard.tsx` | Dialog/wizard buttons 42px / 14px / px-5; wizard nav 120×42; wizard action 40×148 | `MRT_BTN_PRIMARY` + `mrtChrome.css` |
| `src/ui/WizardHeaderSummaryTable.tsx` | Rail key/value: label `th`, value `td`, em-dash when empty | `src/components/wizard/RailContext.tsx` |
| `src/components/MrtCmmProgramWizard.tsx` | Rail + steps + main header + body + footer; no PIN/ERP | `ProjectView` / `Stepper` / `StepHeader` / `WizardFooter` |
| `mrtLiquidGlass.css` `.mrt-wizard-*` | Rail 280px; header pad 0.875/1.25rem; title 1rem/600; body pad 1.25rem; footer 34px buttons, flex-end | `src/styles/mrtChrome.css`, `src/styles/wizard.css` |
| `src/components/MrtFeatureGroupHeaderRow.tsx` | Group cells: min-h 42px, 1px `--mrt-grid-border`, px-2 py-1, 15px/600; chevron 34px | `.qr-mrt-gh`, `.qr-row-menu` |
| `src/components/FeatureReportTable.tsx` | Empty body: `py-8 text-center`; `border-collapse` + card radius 6px | `.qr-mrt-empty`, `.qr-mrt-shell` |
| `src/components/MrtReportTableRowsMenu.tsx` | Compact overflow for row actions (not a labelled button column) | `MoreMenu row` |
| `src/constants/liveReportLayout.ts` | One card shell, one border (`mrt-report-card`) | `.qr-mrt-shell` |
| `src/ui/MrtScreenShell.tsx` | Cover/gateway only (login). **Not used** — PIN/session chrome stays out of QR | — |
| `src/ui/MrtPinInput.tsx`, ERP/user APIs | **Excluded** | — |

## Copied numeric values

| Item | MRT | QR |
|---|---|---|
| Grid line | `--mrt-grid-border` `#64748b`, strong `#334155` | same in `qrPalette.css` |
| Report header | 42px min, 15px/700, uppercase, tracking 0.04em, `#f3f4f6` / `--mrt-header-bg` | `.qr-mrt thead th` |
| Report / group cell | 42px min, 15px/600, 1px grid, px-2 py-1 | `th`/`td` / `.qr-mrt-gh` |
| Utility cell | 13px/600, px-2 py-1.5 | rail / compact tables |
| Card | 1px grid, radius `--mrt-radius` (6px default) | `.qr-mrt-shell` |
| Wizard rail | 280px | `--mrt-wizard-rail-width` |
| Wizard header | 0.875rem 1.25rem, title 1rem/600 | `.qr-wiz-head` |
| Wizard body | 1.25rem pad, surface | `.qr-wiz-main` |
| Wizard footer | header-bg, top border, 34px / 6px 12px / 13px buttons, end-aligned | `.qr-wiz-footer` |
| Dialog header | min-h 52px, 17px/700 | `.qr-modal-h` |
| Dialog footer | min-h 3.25rem, px-6 py-4 | `.qr-modal-f` |
| Row menu | 34×34, radius 6px | `.qr-row-menu` |
| Primary button | mixHex `#8e8e93`+`#48484a`@0.1 → fill `#87878c`, text `#ffffff`, border `#757578`, hover `#9e9ea1`; radius `var(--mrt-radius,6px)`; height 42px; disabled opacity 0.48 / grayscale 0.12 | `.mrt-btn-primary` |
| Secondary button | fill `#ffffff` / `--mrt-btn-neutral-fill`, text `#1c1c1e`, hover `#f2f2f7` | `.mrt-btn-secondary` |
| History empty | Feature report empty: table + `py-8` centered cell | `HistoryDialog` `MrtEmpty` |

QR keeps: guided check, locate, per-part PDF, package sort, auto-update, Hebrew RTL + English LTR, no ellipsis, no horizontal scroll, 4K@200%. Exactly one filled primary command per screen/dialog.

## Screen checklist

| Screen | MRT pattern | QR |
|---|---|---|
| Package list | Report card + utility/report grid + row menu | `TriageView` + `MrtTable` |
| Guided check | Report columns, 42px rows, locate stays QR | `Checklist` `qr-ck-tab` |
| Documents | Same grid, empty `py-8` | `ProblemsPanel` |
| Summary | Card + auto table | `ChecklistSummary` |
| Settings | Utility table wrap | catalog / customers |
| History / dialogs | Utility header/footer + grid; empty `py-8` in table | `HistoryDialog` `MrtEmpty`, `Modal` |
| Rail / footer / header | CMM wizard chrome | `RailContext`, `Stepper`, `StepHeader`, `WizardFooter` |
