# QR design tokens

Source of truth: the MRT app (`mrt-worker`, files `src/mrtLiquidGlass.css`, `src/theme/mrtBuiltinPaletteTokens.ts`,
`src/theme/mrtPalettePresets.ts`). Nothing is copied as code; the values below are re-implemented in
`src/styles/qrPalette.css` (palette) and `src/styles/system.css` (components).

QR uses MRT's **Priority ERP** preset (enterprise neutral-gray structure, practical production tables). The earlier
"Industrial Steel" values are gone.

## Palette (MRT `priority-erp`)
| Token | Value | Use |
|---|---|---|
| `--mrt-bg` / canvas | `#b8bcc4` | app background |
| `--mrt-surface` | `#f4f5f7` | panels, blocks |
| `--mrt-surface-muted` | `#eceef2` | panel headers, hover |
| `--mrt-header-bg` | `#dfe3ea` | top bar, step header |
| `--mrt-text` | `#0a1628` | text |
| `--mrt-text-muted` | `#334155` | labels, secondary text |
| `--mrt-accent` | `#334155` | selection border, focus ring (no fills) |
| `--mrt-border` / `--mrt-ui-border` | `rgba(15,23,42,.18)` | thin 1px borders |
| `--mrt-ui-border-strong` | `rgba(15,23,42,.28)` | selected / emphasised border |
| `--mrt-grid-border` | `#334155` | table grid |
| `--mrt-btn-neutral-fill` | `#f0f4fa` (hover `#e2e8f0`) | buttons (light only) |

## Status palette (the ONLY colors)
| Meaning | Token | Value |
|---|---|---|
| OK / fits | `--mrt-success` | `#2f855a` |
| Needs document / customer question | `--mrt-warning` | `#ca8a04` (true yellow-amber, MRT "salad-yellow" rule) |
| Mismatch / not ours | `--mrt-danger` | `#c53030` |
| Not on drawing / n.a. | `--qr-st-none` | `#8a94a3` (neutral gray) |

Color appears only as a small status dot or status text. Chips, tags, group headers, blocks, buttons and
dialogs are neutral (white/gray fill, 1px border). Blue is not used (MRT keeps blue for its "EMPTY" filter only).

## Typography (MRT type scale)
| Token | Value |
|---|---|
| font family | `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif` (Segoe UI on Windows) |
| heading large | 17px, weight 700 (QR step title uses 16px/600, capped) |
| heading medium | 13px, weight 700 |
| label | 12px, weight 600, tracking 0.04em |
| info label / value | 11px / 15px, weight 600 |
| body | weight 500 in MRT, 400 in QR lists (Hebrew reads better lighter) |
| bold | only part numbers and block titles |

QR caps (px, never grow with the text-size setting): wizard step 14px/32px, tabs 14px/32px, avatar 40px.

## Geometry
| Token | Value |
|---|---|
| radius (`--mrt-radius`) | 8px for panels and dialogs; 6px (`--qr-btn-radius`) for buttons, tags, inputs and part-card blocks; **no pills** (no 50% or 999px radius; status dots are 8px squares with a 2px radius) |
| border | 1px solid `--mrt-border`; selected = 1px `--mrt-accent`, no gray fill, no side bars |
| table cell padding | 8px x 4px (`--mrt-report-cell-px/py`) |
| row height | 32px controls, list rows about 36px |
| block gap | 8px between blocks, 12px inside |
| button | compact, light fill, 1px border, 32px high, no dark fills |

## Priority ERP layout takeaways (inspiration only)
- Form header on top (key identifiers: part number, revision, customer), details underneath.
- Tabular lists with a single status column; status is a small dot plus text, never a filled badge.
- Restrained color: gray structure, status color only where it carries meaning.
- Dense but aligned rows; one clear primary action per form.

## CleanMyMac clarity takeaways (layered on the tokens)
- One obvious action per screen and per block.
- Large summary tiles with counts on top of Check parts and Documents and questions
  (Fits us / Needs document / Customer answer / Not ours). A tile filters the list; tiles are not buttons
  (no fill, no shadow), a selected tile gets the thin accent border.
- "All good" is a calm positive message, not an empty list.
- Details only on click (chevron on every block).

## Where it lives
- Palette: `src/styles/qrPalette.css`. Components: `src/styles/system.css` (imported last).
- Blocks: `src/parts/blocks.mjs` (logic), `src/components/partcard/BlockCard.tsx` (UI).
- Tiles: `src/ui/Tiles.tsx`; status groups: `src/parts/groups.mjs`.
- Tests: `tests/design_system.test.cjs`, `tests/blocks.test.cjs`.

## Sources and caveats
- The MRT tokens are read from MRT's own Priority ERP preset (`mrtLiquidGlass.css` / `qrPalette.css`), not from screenshots.
- The Priority ERP and CleanMyMac takeaways above are inspiration from the preset and general knowledge of those products; no public screenshots were browsed or copied.
- Buttons, including the "primary" one, are light slate (white fill, `#334155` border, `#0a1628` text). No blue, no dark fills; colour appears only in the 8px status dot.
- Deviation (deliberate, 10:29 PM rule "colour only for status"): the primary button no longer uses MRT's blue text/border measured in cmm-pr3; it is the neutral slate pair above. Everything else (radius 6px, height 32px, 14px text, 1px border) is MRT's measured value.
