'use strict';
// Customer Questions: Hebrew (default, RTL) or English, built from the problems list and the upload tasks.
const HE = [
  [/^Tapped hole (\S+) on the view does not match insert (\S+) in the table \(([^)]*)\)\.(?: Also the view says "([^"]+)", the table says ([^.]+)\.)?/, (m) =>
    `בשרטוט מופיעה הברגה ${m[1]} עבור אינסרט, אך בטבלה מופיע אינסרט ${m[2]} (${m[3].replace('heavy-duty', 'כבד').replace('outer thread', 'הברגה חיצונית')}).` +
    (m[4] ? ` בנוסף, במבט כתוב "${m[4]}" ובטבלה אינסרט כבד ללא נעילה.` : '') + ` לדעתנו הטבלה נכונה ונדרשת הברגה ${(m[3].match(/outer thread (\S+)/) || [])[1] || ''}. נא לאשר.`],
  [/^Insert quantity (\d+) in the table, (\d+) holes on the view\./, (m) => `כמות האינסרטים בטבלה ${m[1]}, אך במבט ${m[2]} חורים. נא לאשר את הכמות.`],
  [/^No thread callout (\S+) on the views for insert (\S+) \(([^)]*)\)\./, (m) => `לא נמצאה במבטים הברגה ${m[1]} עבור אינסרט ${m[2]} (${m[3]}). נא להבהיר.`],
  [/^Thread (\S+) for an insert on the view has no matching insert in the parts list\./, (m) => `להברגה ${m[1]} עם אינסרט במבט אין אינסרט מתאים ברשימת החלקים. איזה אינסרט להתקין?`],
  [/^Alternative (\S+) \(cat\. (\d+)\) under seq (\S+) is described as (\S+), but the primary insert (\S+) is (\S+)\./, (m) => `החלופה ${m[1]} (מק"ט ${m[2]}) בשורה ${m[3]} ברשימת החלקים מתוארת כ-${m[4]}, אך האינסרט הראשי ${m[5]} הוא ${m[6]}. נא לאשר את החלופה.`],
  [/^Note (\S+) "PAINT \.\.\. USING:" gives no paint specification or colour(?: \(only ([^)]*)\))?/, (m) => `הערה ${m[1]}: צביעה "USING:" ללא מפרט צבע וגוון${m[2] ? ` (מופיע רק ${m[2].replace(/find no\./g, 'פריט מס\'').replace(/of the separate part list/, 'ברשימת החלקים הנפרדת')})` : ''}. נא לשלוח מפרט צבע וגוון או את רשימת החלקים הנפרדת.`],
  [/^Note (\S+) \(black anodize\) is not assigned to any surface on the views(?:, while note (\S+) \(chemical conversion\) is marked on (\d+) surfaces)?\./, (m) => `הערה ${m[1]} (אנודייז שחור) אינה מסומנת על אף משטח במבטים${m[2] ? `, בעוד הערה ${m[2]} (ציפוי המרה כימי) מסומנת על ${m[3]} משטחים` : ''}. אילו משטחים מקבלים אנודייז?`],
  [/^Range (.+): min is larger than max\./, (m) => `בטווח ${m[1]} הערך המינימלי גדול מהמקסימלי. נא לתקן.`],
  [/^Datum (\S) is referenced in a tolerance frame but no datum feature \S+ was found\./, (m) => `דטום ${m[1]} מופיע במסגרת טולרנס אך אינו מוגדר בשרטוט. נא להגדיר.`],
  [/^Material not found/, () => 'לא נמצא חומר בשרטוט. נא לציין את מפרט החומר.'],
];
const heUpload = (t) => `נא לשלוח את המסמך ${t.refNumber}${t.title.match(/\((.*)\)\s*$/) ? ` (${t.title.match(/\((.*)\)\s*$/)[1]})` : ''} — נדרש להכנת כרטיס העבודה.`;
const enUpload = (t) => `Please send document ${t.refNumber}${t.title.match(/\((.*)\)\s*$/) ? ` (${t.title.match(/\((.*)\)\s*$/)[1]})` : ''}; it is needed to prepare the route card.`;

function toHebrew(p) {
  for (const [re, f] of HE) { const m = p.message.match(re); if (m) return f(m); }
  return null;
}

function buildQuestions(parts, lang = 'he') {
  const out = [];
  for (const part of parts) {
    const qs = [];
    for (const p of part.problems.filter((x) => x.severity !== 'Info' && x.status !== 'resolved')) {
      if (lang === 'he') qs.push({ severity: p.severity, text: toHebrew(p) || p.message, translated: !!toHebrew(p) });
      else qs.push({ severity: p.severity, text: `${p.message} ${p.suggestion || ''}`.trim(), translated: true });
    }
    for (const t of part.tasks.filter((x) => x.type === 'uploadDocument' && x.status !== 'done')) qs.push({ severity: 'Document', text: lang === 'he' ? heUpload(t) : enUpload(t), translated: true });
    if (qs.length) out.push({ partNo: part.partNo, rev: part.rev, customer: part.customer, title: part.title, questions: qs });
  }
  return out;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function questionsHtml(parts, lang = 'he', meta = {}) {
  const groups = buildQuestions(parts, lang);
  const he = lang === 'he';
  const L = he ? { title: 'שאלות ללקוח', part: 'מק"ט', rev: 'מהדורה', n: '#', q: 'שאלה', sev: 'סוג', date: 'תאריך', none: 'אין שאלות פתוחות.', sevMap: { Blocker: 'חוסם', Question: 'שאלה', Document: 'מסמך' } }
    : { title: 'Customer questions', part: 'Part', rev: 'Rev', n: '#', q: 'Question', sev: 'Type', date: 'Date', none: 'No open questions.', sevMap: { Blocker: 'Blocker', Question: 'Question', Document: 'Document' } };
  const date = new Date().toLocaleDateString('en-GB');
  let body = '';
  for (const g of groups) {
    body += `<h2>${L.part} ${esc(g.partNo)} · ${L.rev} ${esc(g.rev || '-')}${g.title ? ' · ' + esc(g.title) : ''}</h2><table><thead><tr><th class="n">${L.n}</th><th class="s">${L.sev}</th><th>${L.q}</th></tr></thead><tbody>`;
    g.questions.forEach((q, i) => { body += `<tr><td class="n">${i + 1}</td><td class="s">${esc(L.sevMap[q.severity] || q.severity)}</td><td><bdi>${esc(q.text)}</bdi></td></tr>`; });
    body += '</tbody></table>';
  }
  if (!groups.length) body = `<p>${L.none}</p>`;
  return `<!doctype html><html lang="${he ? 'he' : 'en'}" dir="${he ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${L.title}</title><style>
  body{font-family:'Segoe UI',Arial,'Noto Sans Hebrew',sans-serif;font-size:13px;color:#0f172a;margin:24px}
  h1{font-size:20px;margin:0 0 4px} .meta{color:#475569;margin-bottom:16px}
  h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #334155;padding-bottom:3px}
  table{width:100%;border-collapse:collapse} th,td{border:1px solid #94a3b8;padding:5px 7px;vertical-align:top;text-align:start}
  th{background:#e2e8f0} td.n,th.n{width:28px;text-align:center} td.s,th.s{width:70px}
  </style></head><body><h1>${L.title}</h1><div class="meta">${L.date}: ${date}${meta.customer ? ' · ' + esc(meta.customer) : ''}</div>${body}</body></html>`;
}
function questionsText(parts, lang = 'he') {
  return buildQuestions(parts, lang).map((g) => `${lang === 'he' ? 'מק"ט' : 'Part'} ${g.partNo} rev ${g.rev || '-'}\n` + g.questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')).join('\n\n');
}
module.exports = { buildQuestions, questionsHtml, questionsText };
