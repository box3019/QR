# QR ↔ MRT visual mapping

Sister app: [MRT-Inspect](https://github.com/box3019/MRT-Inspect). That repository is private from this environment, so this mapping is from QR’s already-measured MRT tokens (`docs/design-tokens.md`), the reimplemented stylesheet `src/styles/mrtLiquidGlass.css` (report-card / feature-report tables, wizard chrome), and the screenshot of QR v0.1.16. No MRT modules were copied.

QR reimplements the same patterns in `src/ui/MrtTable.tsx` and `src/styles/mrtTable.css`.

## Shared tokens

| Token | MRT (measured / liquid-glass) | QR |
|---|---|---|
| Canvas | `--mrt-bg` `#ebebed` | same |
| Surface / table body | `--mrt-surface` `#ffffff` | same |
| Header / group / chrome | `--mrt-surface-muted` / `--mrt-header-bg` `#f5f5f7` | same |
| Rail | `--qr-rail-bg` `#fafafb` | same |
| Text / muted | `#1c1c1e` / `#636366` | same |
| Grid line | `--mrt-grid-border` | 1px on every cell + one outer shell |
| Cell padding | `--mrt-report-cell-px/py` (8/4; density via `--qr-cell-px` / `--qr-row-py`) | same |
| Radius | panels 8–10px, buttons 6px | same |
| Type | SF Pro / Segoe, table 0.875rem, group 1rem/700 | `--qr-fs-sm` / `--qr-fs-md` |
| Status | red critical, green checked, never a filled row | `--qr-st-bad` / `--qr-st-ok` |

## Table (the defect in v0.1.16)

MRT report tables sit in a **card shell** with **one outer border**. Inner cells use `border-collapse` and a **uniform 1px grid**. First/last cell drop the outer edge so it does not double the shell. Group rows are a muted band across all columns — **no extra inset bar** (that bar is what stepped the left edge in Hebrew RTL). Selection is a **tint only**, never `outline` (outline drew a second, shorter rectangle on some rows).

QR v0.1.16 used `table-layout: fixed; width: 100%`, a 5.2rem first column, `box-shadow: inset 3px 0` on group rows (physical left, so RTL left edge broke), and `outline` on the active row. Status / More were pinned to the far inline-end, leaving a hollow value column.

| Pattern | MRT | QR now |
|---|---|---|
| Outer frame | `.mrt-report-card` 1px `--mrt-grid-border` | `.qr-mrt-shell` |
| Grid | collapse, 1px every side | `.qr-mrt th, td` |
| Column sizing | content; leftover width after the last real column | `fit="content"` + `width: max-content; max-width: 100%` |
| Group row | muted band, same edge as data rows | `.qr-mrt-gh` — no inset bar |
| Empty group | muted empty-sample fill | `.qr-mrt-empty` / `MrtEmpty` |
| Row actions | one overflow menu, not a labelled button column | `MoreMenu row` (icon only, no “עוד” header) |
| Active row | fill / `--mrt-grid-selection-fill` | background tint, `outline: none` |

## Chrome and screen flow

| Surface | MRT | QR |
|---|---|---|
| Page header | title 16px/600, header fill, 1px bottom | `.qr-wiz-head` |
| Side rail | muted rail, 22px circle step, 40px row, current = inline-start accent | `.qr-rail` / `.mrt-wizard-step` |
| Footer | chrome fill, top border, Cancel / Next / Close | `.qr-wiz-footer` |
| Buttons | 32px, 6px radius, 2px border, light fill | `.mrt-btn` / `src/styles/buttons.css` |
| Dialogs | surface + strong border + shadow | `.qr-modal` |

Guided flow stays v0.1.16 (package triage → one-part check → documents → summary). Only the skin changes.

## Screen checklist

| Screen | Table / chrome | Notes |
|---|---|---|
| Package list (step 2 list) | `TriageView` + `MrtShell` + content columns | Row menu: move / print / save PDF |
| Guided check | `Checklist` `qr-ck-tab` fill + locate | Locate and overflow expander unchanged |
| Documents | `ProblemsPanel` `qr-prob-tab` | Empty rows use `MrtEmpty` |
| Summary | `qr-cks-tab` auto, tokens | Tiles + cards unchanged in flow |
| Settings | catalog / customers tables | Same grid skin |
| History | `qr-hist-t` + row menu for remove | Search and reopen unchanged |
| Dialogs / import / loaded / rail | `MrtTable` | Rail stays a compact key/value card |

## Rules that must not regress

No abbreviations, no ellipsis or wrapping in labels, no horizontal scroll, 4K@200%, Hebrew RTL + English LTR, red critical / green checked. Locate, per-part PDF, package sort, and auto-update stay as in v0.1.16.
