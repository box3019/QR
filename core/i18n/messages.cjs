'use strict';
// i18n/messages: every user-facing text produced by core, as keyed templates (en + he).
// Problems carry { key, vars }; `message` (en) is kept for logs/tests, Hebrew is rendered from the same key.
const T = require('./terms.cjs');
const FH = (s) => require('../requirements/he.cjs').he(s);

const q = (s) => `"${s}"`;
/** key -> { en(v), he(v), sEn?, sHe? } (s* = suggestion) */
const M = {
  'mat.none': { en: () => 'No material found (title block, notes, routing, parts list).', he: () => 'לא נמצא חומר (אזור הכותרת, הערות, מסלול, רשימת חלקים).', sEn: () => 'Ask the customer for the material spec.', sHe: () => 'לבקש מהלקוח את מפרט החומר.' },
  'mat.notInList': { en: (v) => `${v.found} is not in the materials list — ${q(v.raw)} (${v.src}).`, he: (v) => `החומר ${T.mat(v.found)} (${q(v.raw)}, ${T.loc(v.src)}) אינו ברשימת החומרים.`, sEn: () => 'Decline, or add/enable it in Settings → Materials.', sHe: () => 'לדחות, או להוסיף / להפעיל בהגדרות ← חומרים.' },
  'mat.disabled': { en: (v) => `${v.found} is disabled in the materials list — ${q(v.raw)} (${v.src}).`, he: (v) => `החומר ${T.mat(v.found)} (${q(v.raw)}, ${T.loc(v.src)}) כבוי ברשימת החומרים.`, sEn: () => 'Decline, or add/enable it in Settings → Materials.', sHe: () => 'לדחות, או להפעיל בהגדרות ← חומרים.' },
  'mat.temper': { en: (v) => `${v.found}: temper ${v.temper} is not in the list (${v.list}) — ${q(v.raw)} (${v.src}).`, he: (v) => `${T.mat(v.found)}: טמפר ${v.temper} אינו ברשימה (${v.list}) — ${q(v.raw)} (${T.loc(v.src)}).`, sEn: () => 'Decline, or add/enable it in Settings → Materials.', sHe: () => 'לדחות, או להוסיף את הטמפר בהגדרות ← חומרים.' },
  'proc.unmapped': { en: (v) => `${v.label} ${q(v.found)} (${v.where}) — not in the processes list.`, he: (v) => `${T.proc(v.label)} ${q(v.found)} (${T.loc(v.where)}) — אינו ברשימת התהליכים.`, sEn: () => 'Outsource/decline, or add it in Settings → Processes.', sHe: () => 'קבלן חוץ / לדחות, או להוסיף בהגדרות ← תהליכים.' },
  'proc.disabled': { en: (v) => `${v.label} ${q(v.found)} (${v.where}) — disabled (${v.entry}).`, he: (v) => `${T.proc(v.label)} ${q(v.found)} (${T.loc(v.where)}) — כבוי (${T.proc(v.entry)}).`, sEn: () => 'Outsource/decline, or enable it in Settings → Processes.', sHe: () => 'קבלן חוץ / לדחות, או להפעיל בהגדרות ← תהליכים.' },
  'thr.mismatch': {
    en: (v) => `Tapped hole ${v.view} on the view does not match insert ${v.cat} in the table (${v.type} ${v.inner || ''}, outer thread ${v.outer}).` + (v.viewInsert ? ` Also the view says ${q(v.viewInsert)}, the table says heavy-duty ${v.locking}.` : ''),
    he: (v) => `חור מוברג ${v.view} במבט אינו תואם לאינסרט ${v.cat} בטבלה (${T.ins(v.type)} ${v.inner || ''}, הברגה חיצונית ${v.outer}).` + (v.viewInsert ? ` בנוסף, במבט כתוב ${q(v.viewInsert)} ובטבלה ${T.ins('heavy-duty')} ${T.ins(v.locking)}.` : ''),
    sEn: (v) => `Table likely correct → tap ${v.outer} for insert ${v.cat}. Confirm with the customer.`, sHe: (v) => `כנראה הטבלה נכונה ← הברגה ${v.outer} לאינסרט ${v.cat}. לאשר מול הלקוח.` },
  'thr.qty': { en: (v) => `Insert quantity ${v.table} in the table, ${v.view} holes on the view.`, he: (v) => `כמות האינסרטים בטבלה היא ${v.table}, ובמבט מופיעים ${v.view} חורים.`, sEn: () => 'Confirm the quantity.', sHe: () => 'נא לאשר את הכמות הנכונה.' },
  'thr.noText': { en: (v) => `Insert ${v.cat} (${v.want}) has no thread callout in the drawing text.`, he: (v) => `לאינסרט ${v.cat} (${v.want}) אין סימון הברגה בטקסט השרטוט.`, sEn: () => 'Verify on the drawing views (OCR region / 3D model).', sHe: () => 'לבדוק במבטי השרטוט או במודל.' },
  'thr.noCallout': { en: (v) => `No thread callout ${v.want} on the views for insert ${v.pn} (${v.qty} ${v.uom}).`, he: (v) => `אין סימון הברגה ${v.want} במבטים עבור אינסרט ${v.pn} (${v.qty} ${T.uom(v.uom)}).`, sEn: () => 'Check the views or ask the customer.', sHe: () => 'לבדוק במבטים או לשאול את הלקוח.' },
  'thr.noBom': { en: (v) => `Thread ${v.thread} for an insert on the view has no matching insert in the parts list.`, he: (v) => `להברגה ${v.thread} לאינסרט במבט אין אינסרט מתאים ברשימת החלקים.`, sEn: () => 'Ask the customer which insert to use.', sHe: () => 'לשאול את הלקוח איזה אינסרט להשתמש.' },
  'bom.alt': { en: (v) => `Alternative ${v.alt} (cat. ${v.cat}) under seq ${v.seq} is described as ${v.altInner}, but the primary insert ${v.pn} is ${v.inner}.`, he: (v) => `החלופה ${v.alt} (קטלוגי ${v.cat}) בשורה ${v.seq} מתוארת כ-${v.altInner}, אך האינסרט הראשי ${v.pn} הוא ${v.inner}.`, sEn: (v) => `Ask the customer to confirm the alternative for seq ${v.seq}.`, sHe: (v) => `לבקש מהלקוח לאשר את החלופה לשורה ${v.seq}.` },
  'spec.paint': { en: (v) => `Note ${v.note} "PAINT ... USING:" gives no paint specification or colour${v.finds.length ? ' (only ' + v.finds.map(([n, f]) => `${n} = find no. ${f}`).join(', ') + ' of the separate part list)' : ''}.`, he: (v) => `הערה ${v.note} "PAINT ... USING:" אינה מציינת מפרט צבע או גוון${v.finds.length ? ' (רק ' + v.finds.map(([n, f]) => `${q(n)} = פריט ${f}`).join(', ') + ' מרשימת החלקים הנפרדת)' : ''}.`, sEn: () => 'Ask the customer for the paint spec and colour, or upload the separate part list.', sHe: () => 'לבקש מהלקוח מפרט צבע וגוון, או להעלות את רשימת החלקים הנפרדת.' },
  'spec.anodize': { en: (v) => `Note ${v.note} (black anodize) is not assigned to any surface on the views${v.conv ? `, while note ${v.conv} (chemical conversion) is marked on ${v.total} surfaces` : ''}. Which surfaces get anodize?`, he: (v) => `הערה ${v.note} (אנודייז שחור) אינה משויכת לאף משטח במבטים${v.conv ? `, בעוד הערה ${v.conv} (ציפוי המרה כימי) מסומנת על ${v.total} משטחים` : ''}. אילו משטחים מקבלים אנודייז?`, sEn: () => 'Ask the customer which surfaces get anodize vs chemical conversion.', sHe: () => 'לשאול את הלקוח אילו משטחים מקבלים אנודייז ואילו ציפוי המרה.' },
  'dim.range': { en: (v) => `Range ${v.range}: min is larger than max.`, he: (v) => `טווח ${v.range}: המינימום גדול מהמקסימום.`, sEn: () => 'Ask the customer.', sHe: () => 'לשאול את הלקוח.' },
  'datum.missing': { en: (v) => `Datum ${v.d} is referenced in a tolerance frame but no datum feature ${v.d} was found.`, he: (v) => `דאטום ${v.d} מופיע במסגרת טולרנס, אך לא נמצא סימון דאטום ${v.d}.`, sEn: () => 'Ask the customer to define the datum.', sHe: () => 'לבקש מהלקוח להגדיר את הדאטום.' },
  'ocr.failed': { en: (v) => `OCR failed on sheet ${v.n}: ${v.err}. Only the PDF text layer was analyzed for this sheet.`, he: (v) => `זיהוי הטקסט נכשל בגיליון ${v.n} (${q(v.err)}). נבדקה רק שכבת הטקסט של הקובץ בגיליון זה.`, sEn: () => 'Check the sheet visually; values in outlined/scanned text may be missing.', sHe: () => 'לבדוק את הגיליון בעין; ערכים בטקסט סרוק או במתאר עלולים לחסור.' },
  'fx.multi': { en: (v) => `Item ${v.no}: several coatings in one line — check which field each value belongs to.`, he: (v) => `סעיף ${v.no}: כמה ציפויים בשורה אחת — לבדוק לאיזה ציפוי שייך כל ערך.`, sEn: () => 'Check the Processes panel against the drawing.', sHe: () => 'להשוות את חלון התהליכים לשרטוט.' },
  'fx.noStd': { en: (v) => `Item ${v.no}: ${v.name} has no specification.`, he: (v) => `סעיף ${v.no}: ל${FH(v.name)} אין מפרט.`, sEn: () => 'Ask the customer for the specification.', sHe: () => 'לבקש מהלקוח את המפרט.' },
  'fx.location': { en: (v) => `Item ${v.no}: ${v.name} applies to areas marked on the drawing — check the views.`, he: (v) => `סעיף ${v.no}: ${FH(v.name)} חל על אזורים המסומנים בשרטוט — לבדוק במבטים.`, sEn: () => 'Mark the areas on the drawing before quoting.', sHe: () => 'לסמן את האזורים בשרטוט לפני ההצעה.' },
  'fx.assembly': { en: (v) => `Item ${v.no}: ${v.name} is written in an assembly context — it may belong to another part.`, he: (v) => `סעיף ${v.no}: ${FH(v.name)} כתוב בהקשר של הרכבה — ייתכן שהוא שייך לחלק אחר.`, sEn: () => 'Confirm which part gets it.', sHe: () => 'לאשר לאיזה חלק זה שייך.' },
  'fx.noCoating': { en: (v) => `Item ${v.no}: masking is required, but no coating was found on the page.`, he: (v) => `סעיף ${v.no}: נדרש מיסוך, אך לא נמצא ציפוי בדף.`, sEn: () => 'Ask the customer what the masking is for.', sHe: () => 'לשאול את הלקוח למה נדרש המיסוך.' },
  'task.upload': { en: (v) => `Upload ${v.num} (${v.desc || 'customer document'})`, he: (v) => `העלאת ${v.num} (${v.desc ? T.desc(v.desc) : 'מסמך לקוח'})` },
  'task.blocks': { en: (v) => (v.seq ? `step ${v.seq}${v.title ? ' ' + v.title : ''} (${v.type})` : 'route card'), he: (v) => (v.seq ? `שלב ${v.seq}${v.title ? ' ' + T.title(v.title) : ''} (${T.step(v.type)})` : 'כרטיס העבודה') },
  'task.verify': { en: (v) => `Verify OCR value "${v.text}" (conf ${v.conf}%) on page ${v.page}`, he: (v) => `לאמת ערך מזוהה "${v.text}" (ודאות ${v.conf}%) בעמוד ${v.page}` },
  'route.material': { en: (v) => `${v.norm} — ${v.raw}${v.cat ? ' (cat. ' + v.cat + ')' : ''}`, he: (v) => `${T.mat(v.norm)} — ${q(v.raw)}${v.cat ? ' (קטלוגי ' + v.cat + ')' : ''}` },
  'route.insert': { en: (v) => `${v.pn} cat. ${v.cat} — ${v.type} ${v.inner} × ${v.qty} ${v.uom}${v.alts.length ? ` (+${v.alts.length} Alt: ${v.alts.join(', ')})` : ''}`, he: (v) => `${v.pn} קטלוגי ${v.cat} — ${T.ins(v.type)} ${v.inner} × ${v.qty} ${T.uom(v.uom)}${v.alts.length ? ` (+${v.alts.length} חלופות: ${v.alts.join(', ')})` : ''}` },
  'std.unjf': { en: (v) => `${v.callout}: drawing says ${v.drawing}, ${v.std} dash ${v.dash} requires ${v.required}.`, he: (v) => `${q(v.callout)}: בשרטוט ${v.drawing}, ואילו ${v.std} מידה ${v.dash} דורש ${v.required}.`, sEn: (v) => `Ask the customer: ${v.required} (per ${v.std}) or ${v.drawing}?`, sHe: (v) => `לשאול את הלקוח: ${v.required} (לפי ${v.std}) או ${v.drawing}?` },
};
const CATEGORY = { Material: 'חומר', Process: 'תהליך', 'Threads vs inserts': 'הברגות מול אינסרטים', 'Parts list': 'רשימת חלקים', 'Missing specification': 'מפרט חסר', 'Contradictory callouts': 'סימונים סותרים', 'Nonsensical dimension': 'מידה לא הגיונית', 'Missing datum': 'דאטום חסר', 'OCR warning': 'אזהרת זיהוי טקסט', Standard: 'תקן', Requirements: 'דרישות' };

function render(key, vars, lang) {
  const m = M[key]; if (!m) return null;
  const he = lang === 'he';
  return { message: (he ? m.he : m.en)(vars || {}), suggestion: (he ? m.sHe : m.sEn) ? (he ? m.sHe : m.sEn)(vars || {}) : '' };
}
/** Problem object for core code: message/suggestion in English + key/vars for other languages. */
function problem(severity, category, key, vars, extra = {}) {
  const r = render(key, vars, 'en');
  return { severity, category, message: r.message, suggestion: r.suggestion, key, vars, ...extra };
}
/** Plain text for a key (tasks, route lines). */
const text = (key, vars, lang) => { const m = M[key]; return m ? (lang === 'he' ? m.he : m.en)(vars || {}) : ''; };
const category = (c, lang) => (lang === 'he' ? CATEGORY[c] || c : c);
module.exports = { M, render, problem, text, category, CATEGORY };
