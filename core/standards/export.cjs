'use strict';
// Copies the stored standard documents linked to the parts into the export folder (RFQ package).
const fs = require('fs'); const path = require('path');
function copyStandardDocs(parts, dir) {
  const seen = new Set(); const out = [];
  for (const p of parts || []) for (const s of p.standards || []) {
    const f = s.doc && s.doc.file; if (!f || seen.has(f) || !fs.existsSync(f)) continue; seen.add(f);
    fs.mkdirSync(dir, { recursive: true });
    const name = `${s.std}${s.doc.rev ? '_' + s.doc.rev : ''}${path.extname(f)}`.replace(/[^\w.-]+/g, '_');
    const to = path.join(dir, name); fs.copyFileSync(f, to); out.push(to);
  }
  return out;
}
module.exports = { copyStandardDocs };
