# Newcomer audit (v0.1.5)

Goal: QR never confuses a first-time user. Every screen was walked as a newcomer (EN and HE, RTL) and checked against eight rules.
Method: source walk-through of every screen plus the packaged build on a SYNTHETIC RFQ (shots in `docs/newcomer/`, synthetic data only). A pass on a real RFQ was done locally only and is not part of the repo.

Rules: (1) one primary action per screen; (2) a top "next step" line that names the concrete next item and is clickable; (3) the same status colours everywhere (green ok, orange action, red not ours, grey no data); (4) no silent actions; (5) identical components everywhere; (6) nothing is lost (autosave, undo, History); (7) no unexplained jargon; (8) every disabled button explains why.

## "What now?" moments

| # | Screen | Problem (what the newcomer asks) | Fix | Status |
|---|--------|----------------------------------|-----|--------|
| 1 | Step 1, empty | "Where do I start?" Only a drop area and a generic hint. | Next-step line: "Start here: add the customer email, drawings or a folder". Click opens the file picker. | Fixed |
| 2 | Step 1, loaded | "6 parts loaded. And now?" (big empty grey area, earlier build) | Loaded summary (tiles, files grouped by part, one primary Next); next-step line names the first part to check. | Fixed |
| 3 | Steps 2 and 3 | "Which part first? Which ones are still open?" | Next-step line: "3 parts need a document. Start with X" (document first, then answers). Click selects that part and opens Documents & questions. | Fixed |
| 4 | Step 4, all done | "Am I finished? What do I press?" Three equal primary buttons. | Exactly one primary: Export questions while questions are open, otherwise Export Excel. Next-step line says "All parts are ready. Export the Excel" and clicks the button. | Fixed |
| 5 | Footer: Next, Cancel | Greyed out with a generic tooltip. | Tooltip gives the reason ("Load an RFQ or drawings first...", "This is the last step.", "Nothing to clear: no parts are loaded."). | Fixed |
| 6 | Rail: locked steps 2-4 | Greyed steps, no reason. | Tooltip: "Load an RFQ or drawings first to open this step." | Fixed |
| 7 | Top bar: Save, Save as | Disabled without a reason. | Tooltip: "Nothing to save yet" or "QR is still reading the files". | Fixed |
| 8 | Settings: Apply look | Disabled without a reason. | Tooltip: "This look is already applied. Choose another one." | Fixed |
| 9 | Footer: Cancel (clear the RFQ) | A confirm box with no way back; autosave then overwrote the project. | No question. The RFQ is cleared and a toast offers Undo (30 s); the project stays in History. | Fixed |
| 10 | Footer: Next | Two or zero primary buttons on steps 1-3. | Exactly one primary per screen: Load (step 1, empty: Choose files; loaded: Next), footer Next on the list views of steps 2 and 3, Next part / To documents / To summary on a part view, Export (step 4). The previous-part button explains why it is disabled on the first part. | Fixed |
| 11 | Tabs | No close button on a single tab; hover-only x. | x always visible on every tab, middle click, Ctrl+W; busy tab asks first; project stays in History. | Fixed (earlier in this build) |
| 12 | Whole app | "Did it save?" autosave was invisible. | "Saved hh:mm" in the top bar, Save, Save as (.qrproj), Open. | Fixed (earlier in this build) |
| 13 | Outlook "Send to QR" with QR open | Nothing happened. | Window comes to the front, new tab (or the same email's tab), toast with the reason when there is nothing to import. | Fixed (earlier in this build) |
| 14 | Tab dots | The dot colours were hard-coded twice (wizard.css and system.css). | Both use the `--qr-st-*` tokens, the same ones as the part status dots (grey none, green ok, orange action, red not ours). | Fixed |
| 15 | Jargon (English) | "Intake", "Blocker", "flags", "OCR", "BOM". | "Load files", "Must fix", "open issues", "Scanned text", "Parts list". Hebrew already used plain words. | Fixed for the main screens |
| 16 | Step 2 (and 3), three panels | "List, drawing and card at once: where do I look?" | One focus at a time. List view: tiles, then one row per part (part number, rev, status, one-line reason), the next-step line on top. Click a row: Part view with a large drawing beside that part's blocks, Back to list, Previous, Next part (the next part that needs action) and the arrow keys (mirrored in Hebrew), Esc = back. No third column. Documents & questions uses the same list, then the questions of one part at full width. | Fixed |

## Still open (needs Alex's decision or a larger change)

- The Tutorial "Back" button is disabled on the first page without a tooltip (the tour has its own text file).
- Jargon that remains inside the part card and the Details view: "route card", "OCR words", "STEP file name", "Specs". They only show with Details on; a glossary tooltip pass is proposed.
- Status colours inside some Settings tables (enabled/disabled rows) use grey/orange but no red; consistent in meaning, not yet in token use.
- The next-step line points to documents and answers per part; it does not yet say how many documents are missing in total (only parts).

## Before / after shots

Synthetic only. Before: `sv048c` (previous build). After: the build of this commit. `docs/newcomer/before_*` and `after_*` are the pairs (steps 1 to 4, EN and HE). `onefocus_<width>_<lang>_*` show the new list and part views at 1280 and 1920 (all checked by `scripts/shots-onefocus.cjs`: no third column, arrows, Back, no overflow).

