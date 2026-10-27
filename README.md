# QR — Quote Request

Standalone Windows desktop app (Electron + TypeScript + React) for incoming customer drawings:
drop PDFs / parts lists / STEP models / ZIPs, and QR builds a problems list, customer questions
(Hebrew RTL by default, or English), document upload tasks and a read-only route-card preview.
No ERP, no login/PIN, no prices.

## Features (v0.1.0)
- Drawing ↔ 3D model matching (dropped files, drawing folder, read-only search roots).
- Material detection (title block, notes, routing chart, parts list) + "Materials we work with" allow-list
  (aluminium, bronze, copper/brass, plastics). Rejected parts show the reason.
- Text extraction with mandatory OCR fallback: offline Tesseract (bundled `ocr/eng.traineddata.gz`),
  400–600 DPI tiles, hairline thickening, rotated pass; low-confidence values become "verify" tasks.
- Checks: threads vs inserts, alternates, quantities, surface-zone markers vs notes, missing paint spec,
  min>max ranges, missing datums, masking order.
- References: public specs vs customer-internal documents → upload tasks; SEE SEPARATE PART LIST /
  NEXT HIGHER ASSEMBLY handled.
- Customer profiles: RAFAEL, ELTA, KLA, ELBIT.
- Exports: customer questions (PDF + TXT), order summary (CSV / PDF).
- Text size setting: Normal 1.2 / Large 1.35 / X-Large 1.5.

## Develop
```
npm install
npm run build        # renderer -> dist/
npm start            # run Electron
npm run test:core -- <drawing.pdf>[+<parts-list.pdf>] ...   # CLI analysis, OCR=0 disables OCR
npm run dist:win     # release/QR_v<version>_Setup.exe
npm run selftest -- "<path to QR.exe>" <test data dir> <out dir>
```

## Layout
- `electron/` main process + preload (IPC, settings in `%APPDATA%\QR\qr-settings.json`, exports).
- `core/` PDF text / OCR (`pdf.cjs`), analysis (`analyze.cjs`), references (`refs.cjs`), pipeline, questions.
- `src/` React UI. `src/styles/` contains QR's own copy of the MRT visual style (no runtime/build link to MRT).
- `ocr/` offline Tesseract language data. `build/` icon (placeholder).
- `docs/SPEC.md` product spec.

QR is a separate project from MRT; it does not reference the MRT repository at build or run time.
