'use strict';
// Bundled table data (dimensions only, no documents). Each data/<file>.json: { id, rev, source, units, verified, columns, rows: { dash: {...} } }.
const fs = require('fs'); const path = require('path');
const { defOf, tableDef, norm } = require('./defs.cjs');
const DATA = path.join(__dirname, 'data');
let cache = null;
function all() {
  if (cache) return cache; cache = {};
  for (const f of fs.readdirSync(DATA).filter((x) => x.endsWith('.json'))) { const t = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); cache[norm(t.id)] = t; }
  return cache;
}
const mm = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? Math.round(x * 25.4 * 1000) / 1000 : null; };
/** Row for std+dash from the bundled tables (MS33649 -> AS5202 rows). */
function bundledRow(std, dash) {
  const d = defOf(std); const td = (d && d.sizesFrom) ? { id: d.sizesFrom } : (tableDef(d) || { id: std }); const t = all()[norm(td.id)]; if (!t) return null;
  const row = t.rows[dash] || t.rows[String(+dash)] || null; if (!row) return null;
  const dims = {}; for (const c of t.columns) if (c !== 'thread' && row[c] != null && row[c] !== '' && Number.isFinite(parseFloat(row[c]))) dims[c] = t.units === 'inch' ? { in: row[c], mm: mm(row[c]) } : { mm: parseFloat(row[c]) };
  return { table: t.id, rev: t.rev || '', source: t.source, verified: t.verified !== false && row.verified !== false, row, dims };
}
/** Helicoil STI hole data by the finished thread, e.g. '1/4-20 UNC'. */
function stiRow(thread) { const t = all()[norm('HELICOIL-STI')]; if (!t || !thread) return null; const row = t.rows[thread]; if (!row) return null;
  const dims = {}; for (const c of t.columns) dims[c] = { in: row[c], mm: mm(row[c]) };
  return { table: t.id, rev: t.rev, source: t.source, verified: row.verified !== false, row: { ...row, thread }, dims }; }
module.exports = { stiRow, bundledRow, tables: all, mm };
