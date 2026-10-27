// Validates the JS port of notes_extractor.py against the ORIGINAL Python results (friend_dump.py output).
// A) parity: the port fed the SAME pymupdf lines must give identical sheets (target: 0 differences).
// B) app path: analyzeFile() as the app runs it (MuPDF WASM text lines); must also be 0.
// Usage: node scripts/friend/compare.cjs <dump.json> <pdfDir> <report.json>
const fs = require('fs'); const path = require('path');
const { analyzePage } = require('../../core/requirements/page.cjs');
const { linesFromPymupdf } = require('../../core/requirements/lines.cjs');
const { buildSheets } = require('../../core/requirements/sheets.cjs');

const pyPage = (d) => ({ ...d, summary: d.summary && { heatTreat: d.summary[0], masking: d.summary[1], coatings: d.summary[2], paint: d.summary[3], flow: d.summary[4], flagged: d.summary[5] } });
const key = (r) => JSON.stringify(r);
// Unordered row match: exact first, then whitespace-only differences; the rest are real differences.
const ws = (r) => JSON.stringify(r.map((v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v)));
function diff(a, b) {
  const out = {};
  for (const name of Object.keys(a)) {
    const left = [...a[name]], right = [...b[name]]; let exact = 0, space = 0;
    for (const f of [key, ws]) {
      for (let i = left.length - 1; i >= 0; i--) { const j = right.findIndex((r) => f(r) === f(left[i])); if (j >= 0) { left.splice(i, 1); right.splice(j, 1); f === key ? exact++ : space++; } }
    }
    out[name] = { python: a[name].length, port: b[name].length, exact, whitespaceOnly: space, onlyPython: left, onlyPort: right };
  }
  return out;
}
(async () => {
  const [dumpFile, pdfDir, report] = process.argv.slice(2);
  const dump = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
  const py = dump.map(pyPage);
  const parity = dump.map((d) => ({ file: d.file, page: d.page, ...analyzePage(linesFromPymupdf(d.lines), d.width) }));
  const A = diff(buildSheets(py), buildSheets(parity));
  let B = null;
  if (pdfDir) {
    const { analyzeFile } = require('../../core/requirements/index.cjs');
    const app = [];
    for (const f of [...new Set(dump.map((d) => d.file))]) for (const r of await analyzeFile(path.join(pdfDir, f))) app.push({ file: f, ...r });
    B = diff(buildSheets(py), buildSheets(app));
  }
  const res = { pages: dump.length, parity: A, qrText: B };
  fs.writeFileSync(report, JSON.stringify(res, null, 1));
  const line = (o) => Object.entries(o).map(([k, v]) => `${k} py${v.python} port${v.port} exact${v.exact} ws${v.whitespaceOnly} onlyPy${v.onlyPython.length} onlyPort${v.onlyPort.length}`).join(' | ');
  console.log('PARITY', line(A)); if (B) console.log('APP   ', line(B));
})().catch((e) => { console.error(e); process.exit(1); });
