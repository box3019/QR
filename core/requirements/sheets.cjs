'use strict';
// requirements/sheets: page results -> the six Excel sheets, same columns and order as notes_extractor.py.
const HEAD = {
  Requirements: ['File', 'Page', 'Source', 'Section', 'No.', 'Text', 'Extra (cat no / qty)', 'Category'],
  Summary: ['File', 'Page', 'Status', 'Source', 'Items'],
  Material: ['File', 'Page', 'Family', 'Alloy', 'Temper', 'Form', 'Standards', 'Raw dimensions', 'Cat no', 'Qty', 'Unit', 'Source text'],
  Processes: ['File', 'Page', 'No.', 'Process', 'Subtype', 'Layer', 'Detail', 'Standards / specs', 'Type / Class', 'Thickness', 'Coats', 'Color', 'Hardness', 'Temperature', 'Case depth', 'Flags', 'Source text'],
  Masking: ['File', 'Page', 'No.', 'Method', 'Areas masked', 'Before process', 'Standards', 'Flags', 'Source text'],
  'Process summary': ['File', 'Page', 'Heat treat', 'Masking', 'Coatings (in order)', 'Paint', 'Flow', 'Flagged'],
};
const WIDTHS = { Requirements: [24, 6, 15, 24, 7, 90, 26, 18], Summary: [24, 6, 14, 15, 8], Material: [24, 6, 12, 14, 9, 11, 34, 24, 13, 8, 6, 70], Processes: [24, 6, 7, 11, 30, 8, 34, 34, 18, 26, 6, 14, 12, 16, 12, 34, 80], Masking: [24, 6, 7, 22, 34, 40, 24, 30, 80], 'Process summary': [24, 6, 30, 40, 50, 44, 50, 9] };
const WRAP = { Requirements: 6, Processes: 17, Masking: 9 };

/** pages: [{file, page, status, source, rows, material, procs, masks, summary}] */
function buildSheets(pages) {
  const S = Object.fromEntries(Object.keys(HEAD).map((k) => [k, []]));
  for (const p of pages) {
    const f = p.file, n = p.page;
    for (const r of p.rows) S.Requirements.push([f, n, p.source, r.section, r.no, r.text, r.extra, r.cat]);
    if (p.error) { S.Summary.push([f, '', 'ERROR: ' + p.error, '', 0]); continue; }
    S.Summary.push([f, n, p.status, p.source, p.rows.length]);
    const m = p.material; if (m) S.Material.push([f, n, m.family, m.alloy, m.temper, m.form, m.stds, m.dims, m.catno, m.qty, m.unit, m.src]);
    for (const q of p.procs) S.Processes.push([f, n, q.no, q.process, q.subtype, q.layer, q.detail, q.stds, q.typecls, q.thick, q.coats, q.color, q.hard, q.temp, q.case, q.flags, q.src]);
    for (const k of p.masks) S.Masking.push([f, n, k.no, k.method, k.areas, k.before, k.stds, k.flags, k.src]);
    if (p.rows.length && p.summary) { const s = p.summary; S['Process summary'].push([f, n, s.heatTreat, s.masking, s.coatings, s.paint, s.flow, s.flagged]); }
  }
  return S;
}
module.exports = { HEAD, WIDTHS, WRAP, buildSheets };
