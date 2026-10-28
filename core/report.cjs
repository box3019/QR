'use strict';
// Summary PDF report: HTML template for Electron printToPDF. EN or HE (RTL), following the export language setting.
// Header (QR logo, RFQ, customer, date), summary by group with colored labels, per-part sections, customer questions,
// documents to upload. No dependencies.
const { buildQuestions, toHebrew } = require('./questions.cjs');
const ORDER = ['ready', 'needsDoc', 'needsAnswer', 'notOurs'];
const open = (p) => p.status !== 'resolved';
const { isOpenNowTask: isOpenDoc } = require('./docs/stage.cjs');
/** Same rule as src/parts/groups.mjs plainStatus (tested equal). */
function plainStatus(part) {
  const probs = part.problems || [], tasks = part.tasks || [];
  if (part.status === 'rejected' || probs.some((x) => open(x) && x.internal)) return 'notOurs';
  if (tasks.some(isOpenDoc)) return 'needsDoc';
  if (part.status === 'pending' || probs.some((x) => open(x) && (x.severity === 'Blocker' || x.severity === 'Question'))) return 'needsAnswer';
  return 'ready';
}
const L = {
  en: { rcard: 'For route card', rcSpec: 'customer spec', rcGen: 'General / at delivery', title: 'RFQ review report', rfq: 'RFQ', customer: 'Customer', date: 'Date', parts: 'Parts', summary: 'Summary by group', group: 'Group', count: 'Count',
    g: { ready: 'Fits us', needsDoc: 'Needs document', needsAnswer: 'Needs customer answer', notOurs: 'Not our material / process' },
    part: 'Part', rev: 'Rev', material: 'Material', heat: 'Heat treat', coat: 'Coatings', paint: 'Paint', mask: 'Masking', seq: 'Operation sequence', flags: 'Flags',
    stds: 'Standards', stStatus: { resolved: 'found in library', needsConfirm: 'check and confirm', needsDoc: 'needs document' }, none: '—', questions: 'Customer questions', docs: 'Documents to upload', noQ: 'No open questions.', noDocs: 'No documents needed.', page: 'Page', sev: { Blocker: 'Blocker', Question: 'Question', Document: 'Document', Warning: 'Warning' } },
  he: { rcard: 'לכרטיס מסלול', rcSpec: 'מפרט לקוח', rcGen: 'כללי / במסירה', title: 'דוח בדיקת בקשה להצעת מחיר', rfq: 'בקשה', customer: 'לקוח', date: 'תאריך', parts: 'חלקים', summary: 'סיכום לפי קבוצה', group: 'קבוצה', count: 'כמות',
    g: { ready: 'מתאים לנו', needsDoc: 'חסר מסמך', needsAnswer: 'ממתין לתשובת לקוח', notOurs: 'לא החומר / התהליך שלנו' },
    part: 'מק"ט', rev: 'מהדורה', material: 'חומר', heat: 'טיפול תרמי', coat: 'ציפויים', paint: 'צבע', mask: 'מיסוך', seq: 'סדר פעולות', flags: 'סימונים',
    stds: 'תקנים', stStatus: { resolved: 'נמצא בספרייה', needsConfirm: 'לבדוק ולאשר', needsDoc: 'חסר מסמך' }, none: '—', questions: 'שאלות ללקוח', docs: 'מסמכים להעלאה', noQ: 'אין שאלות פתוחות.', noDocs: 'אין צורך במסמכים.', page: 'עמוד', sev: { Blocker: 'חוסם', Question: 'שאלה', Document: 'מסמך', Warning: 'אזהרה' } },
};
const TONE = { ready: ['#dcfce7', '#166534', '#86efac'], needsDoc: ['#fef3c7', '#92400e', '#fcd34d'], needsAnswer: ['#e0f2fe', '#075985', '#7dd3fc'], notOurs: ['#fee2e2', '#991b1b', '#fca5a5'] };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bdi = (s) => `<bdi>${esc(s)}</bdi>`;
const uniq = (a) => [...new Set(a.filter(Boolean).map((x) => String(x).trim()).filter(Boolean))];
/** Part -> plain report fields from the friend's extraction (page summaries) and the route card. */
function partFacts(p, lang) {
  const sums = (p.requirements || []).map((r) => r.summary).filter(Boolean);
  const pick = (k) => uniq(sums.map((s) => s[k])).join('; ');
  const msg = (x) => (lang === 'he' ? x.messageHe || toHebrew(x) || x.message : x.message);
  return {
    material: p.material ? p.material.normalized || p.material.raw || '' : '',
    heat: pick('heatTreat'), coat: pick('coatings'), paint: pick('paint'), mask: pick('masking'),
    seq: (p.route || []).filter((s) => s.type !== 'material').map((s) => ({ seq: s.seq, text: s.title || (s.items && s.items[0] ? s.items[0].text : '') || s.type })),
    flags: (p.problems || []).filter((x) => open(x) && x.severity !== 'Info').map((x) => ({ sev: x.severity, text: msg(x) })),
  };
}
function stdHtml(p, T) {
  const l = p.standards || []; if (!l.length) return '';
  const dim = (d) => Object.entries(d || {}).map(([k, v]) => `${k} ${v && v.mm != null ? v.mm + ' mm' : v}`).join(', ');
  return `<h4>${esc(T.stds)}</h4><table><tbody>${l.map((s) => `<tr><td>${bdi(s.std + (s.dash ? '-' + s.dash : ''))}</td><td>${esc((T.stStatus || {})[s.status] || s.status)}${s.doc && s.doc.rev ? ' · ' + bdi(s.doc.rev) : ''}</td><td>${bdi(dim(s.dims))}${(s.flags || []).filter((f) => f.drawing).map((f) => ' ✕ ' + bdi(f.drawing + ' → ' + f.required)).join('')}</td></tr>`).join('')}</tbody></table>`;
}
/** Checklist block of one part (rows in route-card order + Precision / Complexity with the why line); needs p._ck from the main process. */
function checklistHtml(p, he) {
  if (!p._ck || !p._ck.has) return '';
  const X = require('./checklist/export.cjs'); const lang = he ? 'he' : 'en'; const tt = X.mk(lang); const ind = X.indicators(p._ck, lang);
  const rows = X.lines(p._ck, lang); let g = '';
  return `<h4>${esc(tt('ck.title'))}</h4><p><b>${esc(tt('ck.prec.title'))}</b>: ${esc(ind.precision)} <span class="muted">${bdi(ind.precisionWhy)}</span><br><b>${esc(tt('ck.cx.title'))}</b>: ${esc(ind.complexity)} <span class="muted">${esc(ind.complexityWhy)}</span></p><table class="ck"><tbody>${rows.map((r) => { const h = r.group !== g ? `<tr><th colspan="3" class="muted">${esc(r.groupLabel)}</th></tr>` : ''; g = r.group; return h + `<tr><td>${esc(r.label)}</td><td><b>${esc(r.stateLabel)}</b>${r.excluded ? ' <span class="muted">(' + esc(tt('ck.excluded')) + ')</span>' : ''}</td><td>${r.what ? bdi(r.what) : ''}${r.where ? ' <span class="muted">' + bdi(r.where) + '</span>' : ''}</td></tr>`; }).join('')}</tbody></table>`;
}
/** Neutral "For route card" block of one part: customer specs and certificate / report requirements per routing step. */
function routeCardHtml(p, T, he) {
  const rc = p.routeCard; if (!rc || !rc.count) return '';
  const f = (o, k) => (he && o[k + 'He']) || o[k] || '';
  return `<h4>${esc(T.rcard)}</h4><ul class="rc">${rc.groups.map((g) => `<li><b>${g.key === 'general' ? esc(T.rcGen) : bdi(g.seq) + ' ' + esc(f(g, 'title') || f(g, 'type'))}</b>: ${g.items.map((i) => (i.kind === 'spec' ? bdi(i.number) + ' <span class="muted">' + esc(f(i, 'desc')) + ' · ' + esc(T.rcSpec) + '</span>' : esc(f(i, 'text')) + (i.number ? ' ' + bdi(i.number) : ''))).join('; ')}</li>`).join('')}</ul>`;
}
function reportHtml(parts, lang = 'he', meta = {}) {
  const he = lang === 'he', T = L[he ? 'he' : 'en'];
  const date = meta.date || new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  const customer = meta.customer || (parts.find((p) => p.customer) || {}).customer || '';
  const groups = ORDER.map((k) => ({ k, items: parts.filter((p) => plainStatus(p) === k) })).filter((g) => g.items.length);
  const label = (k) => `<span class="st" style="background:${TONE[k][0]};color:${TONE[k][1]};border-color:${TONE[k][2]}">${esc(T.g[k])}</span>`;
  const row = (k, v) => `<tr><th>${esc(T[k])}</th><td>${v ? bdi(v) : T.none}</td></tr>`;
  const sec = parts.map((p) => { const f = partFacts(p, lang);
    return `<section class="part"><h3>${bdi(p.partNo || '?')} <span class="muted">${esc(T.rev)} ${bdi(p.rev || '-')}</span> ${label(plainStatus(p))}</h3>${p.title ? `<div class="muted">${bdi(p.title)}</div>` : ''}
    <table class="kv">${row('material', f.material)}${row('heat', f.heat)}${row('coat', f.coat)}${row('paint', f.paint)}${row('mask', f.mask)}</table>
    <h4>${esc(T.seq)}</h4>${f.seq.length ? `<ol class="seq">${f.seq.map((s) => `<li><b>${bdi(s.seq)}</b> ${bdi(s.text)}</li>`).join('')}</ol>` : `<p class="muted">${T.none}</p>`}
    ${checklistHtml(p, he)}${stdHtml(p, T)}${routeCardHtml(p, T, he)}<h4>${esc(T.flags)}</h4>${f.flags.length ? `<ul class="flags">${f.flags.map((x) => `<li><span class="sev">${esc(T.sev[x.sev] || x.sev)}</span> ${bdi(x.text)}</li>`).join('')}</ul>` : `<p class="muted">${T.none}</p>`}</section>`; }).join('');
  const qs = buildQuestions(parts, he ? 'he' : 'en');
  const qHtml = qs.filter((g) => g.questions.some((q) => q.severity !== 'Document'));
  const docs = parts.flatMap((p) => (p.tasks || []).filter(isOpenDoc).map((t) => ({ pn: p.partNo, ref: t.refNumber })));
  return `<!doctype html><html lang="${he ? 'he' : 'en'}" dir="${he ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(T.title)}</title><style>
  @page{size:A4;margin:14mm 12mm} *{box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,'Noto Sans Hebrew',sans-serif;font-size:11.5px;color:#0f172a;margin:0}
  header{display:flex;align-items:center;gap:12px;border-bottom:3px solid #1e3a8a;padding-bottom:8px;margin-bottom:12px}
  .logo{width:40px;height:40px;border-radius:6px;background:#1e3a8a;color:#fff;display:grid;place-items:center;font-weight:700;font-size:16px;flex:none}
  h1{font-size:18px;margin:0} .meta{color:#475569;display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:2px}
  h2{font-size:14px;color:#1e3a8a;margin:16px 0 6px;border-bottom:1px solid #cbd5e1;padding-bottom:3px}
  h3{font-size:13px;margin:0 0 2px;display:flex;gap:8px;align-items:center;flex-wrap:wrap} h4{font-size:11.5px;margin:8px 0 3px;color:#334155}
  table{border-collapse:collapse;width:100%} th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:start;vertical-align:top}
  th{background:#f1f5f9;font-weight:600} table.kv th{width:22%} .muted{color:#64748b;font-weight:400}
  .st{display:inline-block;border:1px solid;border-radius:4px;padding:1px 7px;font-size:10.5px;font-weight:600}
  .sev{display:inline-block;min-width:52px;border:1px solid #cbd5e1;border-radius:4px;padding:0 4px;font-size:10px;color:#334155;margin-inline-end:4px}
  section.part{border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin:0 0 10px} section.part h3,table.kv tr,ol.seq li,ul.flags li{break-inside:avoid} h2,h3,h4{break-after:avoid}
  ul.rc{margin:0;padding-inline-start:18px;color:#475569} ul.rc li{margin:1px 0}
  ol.seq,ul.flags{margin:0;padding-inline-start:18px} ol.seq li,ul.flags li{margin:1px 0}
  </style></head><body>
  <header><div class="logo">QR</div><div><h1>${esc(T.title)}</h1><div class="meta"><span>${esc(T.rfq)}: ${bdi(meta.rfq || T.none)}</span><span>${esc(T.customer)}: ${bdi(customer || T.none)}</span><span>${esc(T.date)}: ${bdi(date)}</span><span>${esc(T.parts)}: ${parts.length}</span></div></div></header>
  <h2>${esc(T.summary)}</h2><table><thead><tr><th>${esc(T.group)}</th><th style="width:12%">${esc(T.count)}</th><th>${esc(T.parts)}</th></tr></thead><tbody>${groups.map((g) => `<tr><td>${label(g.k)}</td><td>${g.items.length}</td><td>${g.items.map((p) => bdi(p.partNo)).join(', ')}</td></tr>`).join('')}</tbody></table>
  <h2>${esc(T.parts)}</h2>${sec}
  <h2>${esc(T.questions)}</h2>${qHtml.length ? qHtml.map((g) => `<h4>${esc(T.part)} ${bdi(g.partNo)}</h4><ol class="seq">${g.questions.filter((q) => q.severity !== 'Document').map((q) => `<li><span class="sev">${esc(T.sev[q.severity] || q.severity)}</span> ${bdi(q.text)}</li>`).join('')}</ol>`).join('') : `<p class="muted">${esc(T.noQ)}</p>`}
  <h2>${esc(T.docs)}</h2>${docs.length ? `<table><thead><tr><th>${esc(T.part)}</th><th>${esc(T.docs)}</th></tr></thead><tbody>${docs.map((d) => `<tr><td>${bdi(d.pn)}</td><td>${bdi(d.ref)}</td></tr>`).join('')}</tbody></table>` : `<p class="muted">${esc(T.noDocs)}</p>`}
  </body></html>`;
}
module.exports = { reportHtml, plainStatus, partFacts, LABELS: L };
