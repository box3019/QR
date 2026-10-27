'use strict';
// email/rfqTable: find the RFQ table (part no., description, UoM, qty) in an HTML body or in the plain-text body
// (Outlook plain text puts one table cell per line, cells separated by blank lines; an empty cell is a line with a space).
const clean = (s) => String(s || '').replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const HDR = {
  part_no: ['material', 'part no', 'מק"ט', 'מק״ט'], mfr_pn: ['manufacturer part'], mfr: ['manufacturer name'],
  description: ['description', 'תיאור'], uom: ['unit of measure', 'uom', 'יח'], qty: ['כמות', 'quantity', 'qty'],
};
const PART_RE = /^[A-Z]{1,6}\d{4,}[A-Z]?$/;

function mapHeader(cells) {
  const hdr = cells.map((h) => h.toLowerCase()); const col = {};
  for (const [k, keys] of Object.entries(HDR)) {
    const i = hdr.findIndex((h, j) => !Object.values(col).includes(j) && keys.some((x) => h.includes(x)));
    if (i >= 0) col[k] = i;
  }
  return 'part_no' in col && 'qty' in col ? col : null;
}

function toRow(r, col) {
  const g = (k) => (k in col && col[k] < r.length ? r[col[k]] : '');
  const pn = g('part_no').toUpperCase();
  if (!PART_RE.test(pn)) return null;
  let mpn = g('mfr_pn'); if (mpn === '0' || mpn === '-') mpn = '';
  let desc = g('description'); if (!desc && mpn) desc = mpn; // some rows put the description in Manufacturer Part No.
  const q = g('qty').replace(/[^\d.]/g, '');
  let uom = g('uom').toUpperCase(); if (['EACH', 'EA', 'PCS', "יח'"].includes(uom)) uom = 'EA';
  const mfr = g('mfr') === '0' ? '' : g('mfr');
  return { part_no: pn, description: desc, uom, qty: q ? Math.round(Number(q)) : null, manufacturer_part_no: mpn, manufacturer: mfr };
}

function rowsFromGrid(grid) {
  for (let h = 0; h < grid.length; h++) {
    const col = mapHeader(grid[h]); if (!col) continue;
    const out = grid.slice(h + 1).map((r) => toRow(r, col)).filter(Boolean);
    if (out.length) return out;
  }
  return [];
}

function htmlTables(html) {
  const tables = [];
  for (const t of String(html).match(/<table[\s\S]*?<\/table>/gi) || []) {
    const rows = (t.match(/<tr[\s\S]*?<\/tr>/gi) || []).map((tr) => (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map((c) => clean(c.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&'))));
    tables.push(rows.filter((r) => r.some(Boolean)));
  }
  return tables;
}

function textCells(body) {
  // one cell per non-blank line; a line holding only spaces is an empty cell
  return String(body).replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => clean(l));
}

function rowsFromText(body) {
  const cells = textCells(body);
  for (let i = 0; i < cells.length; i++) {
    if (!/^material$|part no/i.test(cells[i])) continue;
    let j = i; const hdr = [];
    while (j < cells.length && !PART_RE.test(cells[j].toUpperCase()) && hdr.length < 12) hdr.push(cells[j++]);
    const col = mapHeader(hdr); if (!col) continue;
    const out = [];
    while (j + hdr.length <= cells.length && PART_RE.test(cells[j].toUpperCase())) { const r = toRow(cells.slice(j, j + hdr.length), col); if (!r) break; out.push(r); j += hdr.length; }
    if (out.length) return out;
  }
  return [];
}

/** @returns {Array<{part_no,description,uom,qty,manufacturer_part_no,manufacturer}>} */
function parseRfqTable({ html, body }) {
  for (const g of htmlTables(html || '')) { const r = rowsFromGrid(g); if (r.length) return r; }
  return rowsFromText(body || '');
}
module.exports = { parseRfqTable, rowsFromText, htmlTables };
