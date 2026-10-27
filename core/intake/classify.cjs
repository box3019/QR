'use strict';
// intake/classify: file kind from the file name only (no content). Tolerates doubled extensions (.pdf.pdf, .pdf.PDF).
const path = require('path');
const KINDS = {
  drawing: ['.pdf', '.tif', '.tiff', '.dwg', '.dxf'],
  model: ['.step', '.stp', '.igs', '.iges', '.x_t', '.x_b', '.sldprt', '.prt'],
  archive: ['.zip', '.rar', '.7z'],
  email: ['.msg', '.eml'],
};
/** Real extension, lower-case; ".pdf.pdf" / ".pdf.PDF" collapse to ".pdf". */
function realExt(name) {
  const base = path.basename(String(name)).toLowerCase();
  let ext = path.extname(base);
  const inner = path.extname(base.slice(0, -ext.length || undefined));
  if (inner && inner === ext) ext = inner;
  return ext;
}
/** @returns {'drawing'|'model'|'archive'|'email'|'other'} */
function fileKind(name) {
  const e = realExt(name);
  for (const [k, list] of Object.entries(KINDS)) if (list.includes(e)) return k;
  return 'other';
}
/** Models that QR can read a header from (STEP/IGES) sort before Parasolid etc. */
const modelRank = (f) => (/\.(step|stp)$/i.test(f) ? 0 : /\.(igs|iges)$/i.test(f) ? 1 : 2);
module.exports = { fileKind, realExt, modelRank, KINDS };
