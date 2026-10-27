'use strict';
// requirements/notes: mode 2 — a classic NOTES block (anchor NOTES / REMARKS / הערות), top items, x.y sub-items, lettered lines.
const { rx } = require('./rules.cjs');
const { classify } = require('./classify.cjs');
const { union, rect, sortBy } = require('./util.cjs');
const TOP = /^(\d{1,2})\s*[.)]\s+(\S.*)/, SUB = /^(\d{1,2}\.\d{1,2})\s+(\S.*)/, LET = /^[A-Z]\s*[.)]\s+\S/;

function parseNotesBlock(pageWidth, lines) {
  let best = null;
  for (const a of lines.filter((l) => rx('ANCHOR').test(l.t))) {
    const cand = sortBy(lines.filter((l) => l !== a && l.r.y0 >= a.r.y1 - 2 && a.r.x0 - 6 <= l.r.x0 && l.r.x0 < a.r.x0 + 0.35 * pageWidth), (l) => [l.yc]);
    const rows = []; let cur = null;
    for (const l of cand) { if (cur && Math.abs(l.yc - cur.yc) < 3) cur.parts.push(l); else { cur = { yc: l.yc, parts: [l] }; rows.push(cur); } }
    const merged = []; let prev = a.r;
    for (const row of rows) {
      const parts = sortBy(row.parts, (l) => [l.r.x0]);
      let r = rect(parts[0].r); for (const p of parts.slice(1)) r = union(r, p.r);
      if (r.y0 - prev.y1 > 2.5 * Math.max(r.y1 - r.y0, 6)) break;
      merged.push({ t: parts.map((p) => p.t).join(' '), r, x0: parts[0].r.x0 }); prev = r;
    }
    if (best === null || merged.length > best[1].length) best = [a, merged];
  }
  if (!best || !best[1].length) return { rows: [], box: null };
  const [a, merged] = best;
  const items = []; let last = 0, top = null, box = rect(a.r);
  for (const m of merged) {
    box = union(box, m.r);
    const t = m.t, left = Math.abs(m.x0 - a.r.x0) <= 4, mt = t.match(TOP), ms = t.match(SUB);
    if (left && mt && parseInt(mt[1], 10) > last) { last = parseInt(mt[1], 10); top = { section: 'NOTES', no: String(last), text: mt[2], parent: '' }; items.push(top); }
    else if (left && ms && top) items.push({ section: `${top.no} ${top.text.slice(0, 30)}`, no: ms[1], text: ms[2], parent: top.text });
    else if (items.length) items[items.length - 1].text += (LET.test(t) ? '\n' : ' ') + t;
    else items.push({ section: 'NOTES', no: '', text: t, parent: '' });
  }
  const out = [];
  items.forEach((it, i) => {
    const nxt = items[i + 1];
    if (nxt && nxt.no.startsWith(it.no + '.') && it.text.length <= 40) return;
    const c = classify(it.text); it.cat = (c.length ? c : classify(it.parent)).join(', '); it.extra = ''; out.push(it);
  });
  return { rows: out, box };
}
module.exports = { parseNotesBlock };
