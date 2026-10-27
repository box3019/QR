// acceptance on real drawings, text layer only (OCR is covered by the Electron selftest)
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const { runPipeline } = require('../core/pipeline.cjs');
const D = process.env.QR_TESTDATA || 'C:\\Users\\AlexK\\agent-tools\\qr-testdata';
const has = (f) => fs.existsSync(path.join(D, f));
const run = async (fs_) => (await runPipeline(fs_.map((f) => path.join(D, f)), { ocr: false })).parts;
test('RAFAEL BQ43596A: M12 vs M14 insert blocker', { skip: !has('BQ43596A_d.pdf') }, async () => {
  const [p] = await run(['BQ43596A_d.pdf']); assert.equal(p.partNo, 'BQ43596A'); assert.ok(p.problems.some((x) => x.severity === 'Blocker' && /M12X1\.25/.test(x.message) && /M14X1\.5/.test(x.message)));
});
test('KLA matbug: AL 6061-T651 accepted', { skip: !has('KLA_matbug_d.pdf') }, async () => {
  const [p] = await run(['KLA_matbug_d.pdf']); assert.equal(p.status, 'accepted'); assert.match(p.material.normalized || '', /6061/);
});
