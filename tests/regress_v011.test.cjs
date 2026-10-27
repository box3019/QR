// regressions from Alex's v0.1.1 feedback (rev 'S', C36000 as a part, SMAAF5303A without drawing, stale "Other documents")
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { detectPartNo, isMaterialCode, revFromFileName } = require('../core/analyze.cjs');
const { runPipeline } = require('../core/pipeline.cjs');
const FIX = process.env.QR_FIXTURES || 'C:\\Users\\AlexK\\agent-tools\\qr-testdata\\fixtures';
test('rev from RAFAEL file name', () => {
  assert.equal(revFromFileName('L67639A-C-PD-L67639A_C.pdf', 'L67639A'), 'C');
  assert.equal(revFromFileName('BO27516A-A-PD-BO27516A_A-pas.pdf.PDF', 'BO27516A'), 'A');
});
test('material code is not a part number', () => {
  assert.ok(isMaterialCode('C36000', 'COPPER ALLOY C36000-H02 ROUND ROD'));
  const r = detectPartNo('COPPER ALLOY C36000-H02 C36000 C36000 SMAAF5303A', 'RAFAEL', 'SMAAF5303A-C-PD-SMAAF5303A_C.pdf');
  assert.equal(r.partNo, 'SMAAF5303A'); assert.equal(r.rev, 'C');
});
test('RFQ 701751 e-mail: 6 parts, true revs, quantities, no C36000, nothing unmatched', { skip: !fs.existsSync(path.join(FIX, 'RFQ_701751.msg')) }, async () => {
  const r = await runPipeline([path.join(FIX, 'RFQ_701751.msg')], { ocr: false });
  const got = Object.fromEntries(r.parts.map((p) => [p.partNo, [p.rev, p.rfq && p.rfq.qty]]));
  assert.deepEqual(got, { L67639A: ['C', 463], M18504A: ['C', 462], SMAAF5303A: ['C', 1850], BG06332A: ['A', 3717], BO27516A: ['A', 1], BO27503A: ['A', 1] });
  assert.deepEqual(r.rfqs[0].match, { rows_without_drawing: [], parts_without_row: [] });
});
test('a new run never carries files from the previous run', { skip: !fs.existsSync(path.join(FIX, 'RFQ_701751.msg')) }, async () => {
  await runPipeline([path.join(FIX, 'RFQ_701751.msg')], { ocr: false });
  const pdf = path.join(path.dirname(FIX), 'KLA_matbug_d.pdf');
  const r = await runPipeline([pdf], { ocr: false });
  assert.deepEqual(r.files, ['KLA_matbug_d.pdf']); assert.deepEqual(r.other, []); assert.deepEqual(r.rfqs, []);
});

test('rev from file name with a copy suffix', () => { assert.equal(revFromFileName('bq66535a_a 1.pdf', 'BQ66535A'), 'A'); });
