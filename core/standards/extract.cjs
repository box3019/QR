'use strict';
// Table extraction from an uploaded standard: rows that start with a dash/size number followed by numbers.
// Result is stored as an extracted (unverified) table; the user confirms a row once in the part card.
function extractTables(text, columns) {
  const rows = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = line.trim().match(/^(?:[A-Z]{2,}[\d/]*-|-)?(\d{1,3}[A-Z]?)\s+((?:[-+]?\d*\.\d+|\d+)(?:\s+(?:±\s*)?[-+]?\d*\.\d+|\s+\d+)+)\s*$/);
    if (!m) continue;
    const nums = m[2].replace(/±\s*/g, '').trim().split(/\s+/); if (nums.length < 2) continue;
    const dash = m[1].length === 1 ? '0' + m[1] : m[1]; if (rows[dash]) continue;
    const r = {}; nums.forEach((v, i) => { r[(columns && columns[i]) || 'c' + (i + 1)] = v; }); r.verified = false; rows[dash] = r;
  }
  return rows;
}
module.exports = { extractTables };
