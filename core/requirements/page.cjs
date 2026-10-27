'use strict';
// requirements/page: one page -> status (OK / NEEDS_OCR / NOT_FOUND), source mode, rows, material, processes, masking, summary.
const { findTable, parseTable } = require('./table.cjs');
const { parseNotesBlock } = require('./notes.cjs');
const { extractMaterial } = require('./material.cjs');
const { extractProcesses } = require('./processes.cjs');
const { summarize } = require('./flow.cjs');

function processPage(lines, pageWidth) {
  if (!lines.length) return { status: 'NEEDS_OCR', source: '', rows: [], box: null };
  const t = findTable(lines);
  if (t) { const { rows, box } = parseTable(lines, ...t); if (rows.length) return { status: 'OK', source: 'ROUTING TABLE', rows, box }; }
  const { rows, box } = parseNotesBlock(pageWidth, lines);
  if (rows.length) return { status: 'OK', source: 'NOTES BLOCK', rows, box };
  return { status: 'NOT_FOUND', source: '', rows: [], box: null };
}
/** Full friend pipeline for a page. */
function analyzePage(lines, pageWidth) {
  const p = processPage(lines, pageWidth);
  const material = extractMaterial(p.rows);
  const { procs, masks } = extractProcesses(p.rows);
  const summary = p.rows.length ? summarize(procs, masks) : null;
  return { ...p, material, procs, masks, summary };
}
module.exports = { processPage, analyzePage };
