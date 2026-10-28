// Checklist hit rates per part on the test sets (plain node, no QR launch). Counts only, no customer names. Usage: node scripts/ck-hitrates.cjs <testDataDir> <out.json>
const path = require('path'); const fs = require('fs');
const { runPipeline } = require('../core/pipeline.cjs'); const { normalizeSettings } = require('../core/settings.cjs');
const [data, out] = process.argv.slice(2);
const SETS = [['set1', ['BQ43596A_d.pdf']], ['set2', ['ELTA_ex1.pdf', 'ELTA_ex2.pdf']], ['set3', ['KLA_matbug_d.pdf']], ['set4', ['KLA_ex3.pdf']], ['set5', ['ELBIT_ex4.pdf']]];
(async () => {
  const live = await import('../core/checklist/live.mjs'); const settings = normalizeSettings({}); const res = {};
  for (const [name, files] of SETS) {
    const r = await runPipeline(files.map((f) => path.join(data, f)), settings, () => {});
    res[name] = r.parts.map((p, i) => { const ev = live.evaluate(p, settings); const st = {}; for (const row of ev.rows) st[row.id] = row.state + (row.items.length ? ':' + row.items.length : '');
      return { part: i + 1, read: ev.read, rows: st, tight: ev.tight.length, tightKinds: ev.tight.reduce((m, x) => ((m[x.kind] = (m[x.kind] || 0) + 1), m), {}), withZone: ev.tight.filter((x) => x.zone).length, zoneEstimated: ev.tight.filter((x) => x.zone && x.zone.estimated).length, precision: ev.precision.level, complexity: ev.complexity.level + ':' + ev.complexity.points, order: ev.order.join('>') }; });
    console.log(name, res[name].length, 'parts');
  }
  fs.writeFileSync(out, JSON.stringify(res, null, 1)); console.log('DONE');
})().catch((e) => { console.error(e); process.exit(1); });
