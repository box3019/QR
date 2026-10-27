# Credits

## notes_extractor.py
The drawing-notes requirements engine in `core/requirements/` (requirements, summary, material,
processes, masking and process-summary sheets, and the "Export to Excel" workbook) is a faithful
JavaScript port of **notes_extractor.py**, written by Alex's friend and used here with his permission.
His script is the source of truth: `scripts/friend/compare.cjs` checks the port against the original
Python output, and on the validation set the two match row for row on all six sheets.
A copy of the original script is kept in `scripts/friend/notes_extractor.py`.

## Third-party
- MuPDF (mupdf.js, AGPL-3.0): PDF text extraction with the same lines as PyMuPDF.
- Tesseract.js (Apache-2.0): offline OCR.
- Electron, React, Vite, Tailwind CSS (MIT).
