'use strict';
// requirements/table: mode 1 — a numbered routing table (NO. | DESCRIPTION header), rows grouped by y, sections vs x.y items.
const { rx } = require('./rules.cjs');
const { classify } = require('./classify.cjs');
const { union, rect, title, minBy, sortBy } = require('./util.cjs');

function findTable(lines) {
  for (const hNo of lines) {
    if (hNo.t.toUpperCase().replace(/\.+$/, '') !== 'NO') continue;
    for (const hD of lines) if (hD.t.toUpperCase() === 'DESCRIPTION' && Math.abs(hD.yc - hNo.yc) < 3 && hD.r.x0 > hNo.r.x0) return [hNo, hD];
  }
  return null;
}

function parseTable(lines, hNo, hD) {
  const noX = hNo.r.x0, dX = hD.r.x0, y0 = hNo.yc;
  const nums = sortBy(lines.filter((l) => Math.abs(l.r.x0 - noX) < 6 && l.yc > y0 + 3 && rx('NUM').test(l.t)), (l) => [l.yc]);
  if (!nums.length) return { rows: [], box: null };
  const rows = new Map(nums.map((n) => [n, { no: n.t, desc: [], extra: [], rect: rect(n.r) }]));
  for (const l of lines) {
    if (l.yc <= y0 + 3 || rows.has(l) || l.r.x0 < dX - 4) continue;
    const n = minBy(nums, (x) => Math.abs(x.yc - l.yc));
    if (Math.abs(n.yc - l.yc) > 12) continue;
    const row = rows.get(n);
    (l.r.x0 < dX + 250 ? row.desc : row.extra).push(l);
    row.rect = union(row.rect, l.r);
  }
  const result = []; let section = ['', '']; let box = rect(hNo.r);
  const join = (ls) => sortBy(ls, (l) => [l.yc, l.r.x0]).map((l) => l.t).join(' ');
  for (const n of nums) {
    const row = rows.get(n);
    const desc = join(row.desc), extra = join(row.extra);
    box = union(box, row.rect);
    if (!row.no.includes('.')) { section = [row.no, desc]; continue; }
    const c = classify(desc); const cats = c.length ? c : classify(section[1]);
    result.push({ section: `${section[0]} ${section[1]}`.trim(), no: row.no, text: desc, extra, cat: cats.join(', ') || title(section[1]) });
  }
  return { rows: result, box };
}
module.exports = { findTable, parseTable };
