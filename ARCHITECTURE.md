# QR architecture (v0.1.1)

QR is a standalone Electron app. No ERP, no prices, no MRT code paths or imports (MRT styles were copied in once as QR files).

## Layers
- `electron/` - thin shell. `main.cjs` = IPC handlers + settings; `window.cjs` = window placement (work-area clamp, maximize, DPI-safe); `preload.cjs` = the `window.qr` bridge. No business logic.
- `core/` - pure Node, no Electron imports, testable with `node --test`.
- `src/` - React UI. Renders plain data objects returned by core; no parsing or rules.

## Core modules (one job each)
| Module | Job | Input -> Output |
|---|---|---|
| `intake/classify.cjs` | file kind by name (handles `.pdf.pdf`, `.x_t`, `.pas`, `.xls`) | name -> `drawing/model/archive/email/other` |
| `intake/archive.cjs` | unpack ZIP (yauzl) and RAR/7z (bundled 7-Zip `7z.exe`), flatten single inner folder | archive -> file paths |
| `intake/expand.cjs` | dropped paths -> flat file list, recursing into folders, archives, e-mails | paths -> `{ files, rfqs }` |
| `email/readers.cjs` | `.msg` / `.eml` -> `Mail` | file -> Mail |
| `email/rfqTable.cjs` | RFQ table from HTML or Outlook plain text | Mail -> rows |
| `email/rfq.cjs` | Rfq record (rfq_no, assembly, sender, original sender, customer, requirements) | Mail + rows -> Rfq |
| `email/index.cjs` | public entry `readEmail(file, outDir)` (saves attachments) | file -> `{ rfq, attachmentFiles }` |
| `email/outlook.cjs` | save the selected Outlook e-mails as .msg via local COM (drag from Outlook) | -> .msg paths |
| `rfq/attach.cjs` | attach RFQ quantities to parts, list mismatches | parts + rfqs -> rfqs with `match` |
| `pdf.cjs` | PDF text layer, page quality, OCR (offline tesseract, bundled traineddata) | pdf -> pages/tokens |
| `materials.cjs` | material detection + allow-list | text -> material |
| `analyze.cjs` | drawing parse, customer routing, threads/inserts, problems, tasks | drawing -> Part |
| `refs.cjs` | public standard vs internal customer document | ref -> kind |
| `questions.cjs` | customer questions HE/EN | parts -> html/text |
| `pipeline.cjs` | orchestration only | paths -> `{ parts, rfqs, other, errors }` |

## Data objects
`Part`, `Problem`, `Task`, `Rfq { rfq_no, assembly, sender, original_sender, customer, intermediary, requirements[], rows[{part_no, description, uom, qty}], match }`, `part.rfq { rfq_no, qty, uom }`.

## Tests
- `npm run test:unit` - unit + acceptance tests per module on real sample files (fixtures in `..\qr-testdata`).
- `npm run selftest -- <QR.exe> <testdata> <out>` - Electron end-to-end with screenshots.

## Known debt (next steps)
- `analyze.cjs` (~390 lines) still mixes RAFAEL/ELTA/KLA/ELBIT parsing; split into `core/customers/<name>.cjs` profiles and `core/checks/*.cjs`.
- `App.tsx` holds all UI components; split into `src/ui/*`.
- TypeScript migration of `core/` (currently CommonJS + JSDoc).

## Requirements engine (v0.1.4)
- `core/requirements/` - port of the friend's `notes_extractor.py` (source of truth):
  `mupdf.cjs` (PyMuPDF-identical text lines via mupdf.js, derotated boxes), `lines.cjs`, `index.cjs` (analyzeFile),
  `sheets.cjs` (six sheets), `xlsx.cjs` (dependency-free writer), `adapt.cjs` (route, material, problems for QR), `he.cjs` (Hebrew names).
- `scripts/friend/compare.cjs` - row-by-row diff against the original Python output.
- `src/styles/buttons.css` - button/badge/chip tokens (values measured from MRT with `scripts/btn-probe`), `tests/btn_tokens.test.cjs`, `tests/no_pills.test.cjs`.
- `src/tutorial/` - tutorial (HE/RU/EN), `tests/tutorial.test.cjs`.
