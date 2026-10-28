# QR design tokens

Source of truth: the MRT app (`mrt-worker`, files `src/mrtLiquidGlass.css`, `src/theme/mrtBuiltinPaletteTokens.ts`,
`src/theme/mrtPalettePresets.ts`). Nothing is copied as code; the values below are re-implemented in
`src/styles/qrPalette.css` (palette) and `src/styles/system.css` (components).

## Correction (2026-10-28): the earlier "Priority ERP" palette was wrong
Earlier versions of this file claimed QR used MRT's **Priority ERP** preset (`#b8bcc4` canvas, `#dfe3ea` header, `#f4f5f7` surface).
That was an unverified guess made by reading the preset CSS, not by looking at the app. Those values are the grey **workspace canvas of
MRT's main window**, not the Create CMM Program wizard, and the result was a grey-on-grey interface. A second bug hid even that:
the copy of `mrtLiquidGlass.css` still carried `[data-mrt-theme='light'][data-mrt-palette='industrial-steel']` blocks (specificity 0,2,0)
that overrode QR's own token block, so the header, rail and panel headers stayed blue-grey (`#dce1e8`, `#eef1f5`).
Fixes: the values below are **measured** from the running MRT, QR now uses `data-mrt-palette="light"`, and the token block uses the selector
`.qr-root[data-mrt-palette][data-mrt-theme]` (specificity 0,3,0) so no MRT preset can override it. `tests/contrast.test.cjs` guards the result.

## How the values were measured
The real MRT app (cmm-pr3 dev build, v9.0.52, Electron) was launched on the PC with a throw-away profile at 1920x1080 and 1280x800,
the Create CMM Program wizard was opened (Viewer access, External / Manual Job), and `getComputedStyle` was read on the wizard shell,
rail, header, body, info table, footer and stepper. Screenshots: `mrtreal/mrt_{1920,1280}_{full,shell}.png` (local only).
Caveats: MRT has a 5-step stepper with captions and 10px panel radius; QR has 4 steps without captions and 6px radius (compact buttons).

## Palette (measured, MRT wizard scope)
| Token | Value | Use |
|---|---|---|
| `--mrt-bg` / canvas | `#ebebed` | app background (visible only as gutters) |
| `--mrt-surface` | `#ffffff` | main body, panels, table cells, buttons |
| `--mrt-surface-muted` / `--mrt-header-bg` | `#f5f5f7` | step header, footer, panel headers, info-table labels |
| `--qr-rail-bg` | `#fafafb` | left rail (MRT: muted 55% over white) |
| `--mrt-text` | `#1c1c1e` | text (17.5:1 on white) |
| `--mrt-text-muted` | `#636366` | labels, secondary text (5.3:1 on `#f5f5f7`, MRT value) |
| `--mrt-accent` | `#48484a` | selection border, focus ring (no fills) |
| `--mrt-border` | `rgba(60,60,67,.14)` | 1px hairlines (MRT) |
| `--mrt-border-strong` | `rgba(60,60,67,.22)` | panel outline (MRT) |
| `--qr-btn-border` | `rgba(60,60,67,.55)` | button border: deliberately darker than MRT's .20 so buttons are crisp (3:1 on white) |
| `--mrt-btn-neutral-fill` | `#ffffff` (hover `#f2f2f7`) | buttons (light only) |
| `--qr-disabled-bg` / `--qr-disabled-fg` | `#f5f5f7` / `#6b6b70` | disabled controls: flat fill and readable text (MRT fades to .48 opacity, which fails AA) |

Wizard geometry measured in MRT and used in QR: header padding 14/20, title 16px/600; info table rows 28px, label cells `#f5f5f7` 11-12px
uppercase muted, values 15px/600; footer `#f5f5f7` with a top border, padding 16; stepper marker **22x22**, 11px/700, circle, 2px connector
(MRT 16.8px between rows), label 16px/600. QR rows are 40px so the connector never crosses a circle.

## Status palette (the ONLY colors)
| Meaning | Dot / border | Text twin (AA on white and `#f5f5f7`) |
|---|---|---|
| OK / fits | `--qr-st-ok` `#059669` | `--qr-ok-text` `#047857` |
| Needs document / customer question | `--qr-st-warn` `#b45309` (MRT `#ca8a04` is only 2.9:1 on white) | `--qr-warn-text` `#92400e` |
| Mismatch / not ours | `--qr-st-bad` `#dc2626` | `--qr-bad-text` `#b91c1c` |
| Not on drawing / n.a. | `--qr-st-none` `#8e8e93` | muted text |

Color appears only as a small status dot or status text. Chips, tags, group headers, blocks, buttons and
dialogs are neutral (white/light fill, 1px border). Blue is not used.

## Contrast rules (enforced by `tests/contrast.test.cjs`)
- Every text token on every surface (white, `#f5f5f7`, rail, disabled, button fills): at least 4.5:1 (WCAG AA).
- Button text on fill, hover and disabled: at least 4.5:1; disabled controls never use opacity.
- Status dots and button borders: at least 3:1 on white.
- Hard-coded `color:` hex values in the QR stylesheets must pass 4.5:1 on `#f5f5f7` (or on their own background).

## Typography (MRT type scale)
| Token | Value |
|---|---|
| font family | `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif` (Segoe UI on Windows) |
| heading large | 17px, weight 700 (QR step title uses 16px/600, as in MRT) |
| heading medium | 13px, weight 700 |
| label | 12px, weight 600, tracking 0.04em |
| info label / value | 11px / 15px, weight 600 |
| body | weight 500 in MRT, 400 in QR lists (Hebrew reads better lighter) |
| bold | only part numbers and block titles |

QR caps (px, never grow with the text-size setting): wizard step 14px/40px row with a 22px marker, tabs 14px/32px, help button 22px, avatar 32px.

## Geometry
| Token | Value |
|---|---|
| radius (`--mrt-radius`) | 8px for panels and dialogs (MRT 10px); 6px (`--qr-btn-radius`) for buttons, tags, inputs and part-card blocks; **no pills** (no 50% or 999px radius; status dots are 8px squares with a 2px radius; the 22px stepper markers are the one marked circle) |
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

## Themes and Settings > Interface (v0.1.5, 28.10)
QR reimplements the choices of MRT's Settings > Appearance with its own code (no shared code); the language and the assistant are separate sections.

| QR option | Values | MRT counterpart |
|---|---|---|
| Theme | Aris Liquid Glass (default light), Dark Graphite, Industrial Steel, Warm Neutral, Soft Salad, Soft Beige, Soft Olive Gray, High Contrast | MRT colour palettes (8 of its 12; iCloud Windows, CleanMyMac, Priority ERP and Custom are not reimplemented) |
| Accent | Slate (default), Blue, Teal, Amber | MRT accent colour. In MRT the accent does not change the preset palettes; in QR it really recolours focus, current step, selection and progress |
| Text size | Normal, Large, Extra large, Huge | MRT text size |
| Density | Comfortable, Normal, Compact | MRT density |
| Table row height | Compact, Normal, Relaxed | MRT table row height |
| UI language | English, Hebrew (RTL) | n/a |

How the themes map to MRT (measured on the PC with the dev build cmm-pr3 v9.0.52):
- **Light = MRT light.** Default Aris tokens come from the Create-CMM wizard: canvas `#ebebed`, white cards, text `#1c1c1e`, muted `#48484a`-class greys, light buttons.
- **Dark = MRT Dark Graphite.** Canvas `#252b36`, cards `#3d4654`, bars `#343d4a`, side column `#2d3440`, text `#ffffff`, muted `#e2e8f0`, accent `#b8c4d4`. MRT keeps its Create-CMM wizard light even in Dark Graphite (only the main window goes dark), so the dark values come from the MRT main window; QR darkens the whole app with the same layers. Buttons stay light-on-dark translucent fills (no dark fills).
- The other six light themes only retint the canvas, as MRT does (the cards, bars and text stay the same); High Contrast uses black text and strong borders.
- Where a canvas tint is darker than the default, the muted text and OK-green are darkened so the 4.5:1 rule holds on the canvas too.

Selectors: tokens live in `src/styles/qrPalette.css` (light base), `src/styles/themes.css` (tints, dark, accents) with specificity >= (0,3,0), loaded after `mrtLiquidGlass.css`. The root carries `data-mrt-palette`/`data-mrt-theme` (light bypasses MRT's own presets), `data-qr-palette`, `data-qr-accent`, `data-qr-density`, `data-qr-rows`. The Settings previews use the same tokens on `.qr-pal-prev` / `.qr-acc-sw`.

## Surface layering and layout (v0.1.5)
Layers, from the back: **canvas** (`--mrt-bg`, tinted: `#ebebed` light, `#252b36` dark) < **bars** (top bar, step header, footer: `--mrt-chrome-surface` / `--mrt-header-bg`, 1px border + light shadow) < **side column** (`--qr-rail-bg`, its own tone and 1px edge) < **cards** (`--mrt-surface`, 1px `--mrt-border-strong`, radius 10px, `--qr-card-shadow`). Nothing is flat white: a white card always sits on a tinted canvas.
- Content is a centred container with `max-width: 1360px` (`--qr-max`); Check parts and Documents use the full width for their panes. No half-empty screen at 1920 or 1280.
- Step 4 Summary: stat tiles across the top (parts, our four groups, questions), then a 2-column card grid: customer questions / Excel / report on screen / PDF report. Each card has a header band, a text and ONE small button at the card's end (right in LTR, left in RTL). One column below 900px.
- The "reading drawing 1 of 3" progress toast is a card: header with a status dot and percentage, text, progress bar.
- Spacing comes from density: `--qr-space` 16/12/8px and `--qr-card-pad` 18/14/10px.
- `tests/contrast.test.cjs` resolves every theme x accent (32 token sets) and checks text >= 4.5:1 on canvas, cards, bars and side column, buttons incl. hover/disabled >= 4.5:1, status dots and borders >= 3:1, and that cards are visibly different from the canvas (no flat white, no grey-on-grey).

## Where it lives
- Palette: `src/styles/qrPalette.css`. Components: `src/styles/system.css` (imported last).
- Blocks: `src/parts/blocks.mjs` (logic), `src/components/partcard/BlockCard.tsx` (UI).
- Tiles: `src/ui/Tiles.tsx`; status groups: `src/parts/groups.mjs`.
- Tests: `tests/design_system.test.cjs`, `tests/blocks.test.cjs`.

## Sources and caveats
- The palette is measured from the running MRT wizard (see above), not read from preset CSS.
- The Priority ERP and CleanMyMac takeaways above are inspiration from the preset and general knowledge of those products; no public screenshots were browsed or copied.
- Buttons, including the "primary" one, are light neutral (white fill, `#48484a` border, `#1c1c1e` text). No blue, no dark fills; colour appears only in the 8px status dot.
- Deviation (deliberate, 10:29 PM rule "colour only for status"): the primary button no longer uses MRT's blue text/border measured in cmm-pr3; it is the neutral pair above. Everything else (radius 6px, height 32px, 14px text, 1px border) is MRT's measured value.

## The 11 built-in visual presets (Settings > Interface)

QR reimplements MRT's "Built-in visual presets" screen with its own code and the token values read from MRT's preset token maps (MRT 9.0.52).
Each preset is a full visual direction: typography (`--mrt-font-family`), corner radius (`--mrt-radius`, `--qr-card-r`), table density (`--qr-cell-px`, `--qr-row-py`),
accent usage (the primary button is a light tint of the preset accent, weighted like MRT; never a dark fill), chrome density, surfaces (canvas < bars < rail < cards), and status colours.

| Preset | Canvas | Surface | Text | MRT accent | Character |
| --- | --- | --- | --- | --- | --- |
| Aris Liquid Glass / iOS 27 | #ebebed | #ffffff | #1c1c1e | #48484a | SF Pro, radius 10 |
| iCloud Windows | #ebebed | #ffffff | #1c1c1e | #48484a | Segoe UI, airy cells (11/6) |
| CleanMyMac | #eadfeb | #ffffff | #111827 | #9a86b5 | lilac canvas, salad-green ready |
| Priority ERP | #b8bcc4 | #f4f5f7 | #0a1628 | #334155 | enterprise grey, practical tables |
| Industrial Steel (default) | #b8c0cc | #ffffff | #020617 | #1e293b | steel grid, dark separators |
| Dark Graphite | #252b36 | #3d4654 | #ffffff | #b8c4d4 | true dark |
| Warm Neutral | #e5dcc8 | #fffdf8 | #1c1917 | #57534e | paper-warm |
| Soft Salad / Light Green | #e2ebe4 | #ffffff | #1c1f1e | #526958 | green-grey |
| Soft Beige / Sand | #ece5d8 | #ffffff | #2a2520 | #6f6252 | sand |
| Soft Olive Gray | #e4e6df | #ffffff | #252622 | #5a5f50 | olive-grey |
| High Contrast | #eef2f6 | #ffffff | #000000 | #000000 | solid borders |

The default is Industrial Steel (MRT's default). Old stored `aris-glass` values stay valid. Text uses a darker twin of the accent where the MRT accent is below 4.5:1
(`--mrt-accent`; the MRT value is kept in `--qr-accent-mrt` and used for fills and the mini mock). The mid-tone canvases (Industrial Steel, Priority ERP) use darker status-text twins.
The screen has an intro and a chip row, a card grid with a mini QR UI mock per preset (top bar, input, table, status bars), a SELECTED badge,
click-to-preview and an Apply button that persists the choice. Tiles are not buttons: the cards are radio tiles, Apply and the chips are compact buttons with tooltips.
