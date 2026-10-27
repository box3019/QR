const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { readEmail } = require('../core/email/index.cjs');
const { rowsFromText, htmlTables } = require('../core/email/rfqTable.cjs');
const { detectCustomer } = require('../core/email/rfq.cjs');
const FIX = process.env.QR_FIXTURES || 'C:\\Users\\AlexK\\agent-tools\\qr-testdata\\fixtures';
test('text table with one cell per line', () => {
  const r = rowsFromText('Material\n\n Item Description \n\nכמות \n\nAB12345A\n\nSpacer\n\n10\n\nXY99999B\n\n \n\n2\n');
  assert.deepEqual(r.map((x) => [x.part_no, x.qty]), [['AB12345A', 10], ['XY99999B', 2]]);
});
test('html table', () => { assert.equal(htmlTables('<table><tr><td>Part No</td><td>Qty</td></tr><tr><td>AB12345A</td><td>5</td></tr></table>')[0].length, 2); });
test('customer hints', () => { assert.equal(detectCustomer('לקוח סופי רפאל'), 'RAFAEL'); assert.equal(detectCustomer('hello'), null); });
test('RFQ 701751 .msg: 6 parts with quantities', { skip: !fs.existsSync(path.join(FIX, 'RFQ_701751.msg')) }, async () => {
  const { rfq, attachmentFiles } = await readEmail(path.join(FIX, 'RFQ_701751.msg'), fs.mkdtempSync(path.join(os.tmpdir(), 'qrt-')));
  assert.equal(rfq.rfq_no, '701751'); assert.equal(rfq.assembly, 'BQ21000A'); assert.equal(rfq.customer, 'RAFAEL');
  assert.equal(rfq.intermediary, 'pcb-technologies.com'); assert.equal(rfq.original_sender.name, 'Ilanit Yosef');
  assert.deepEqual(rfq.rows.map((x) => x.qty), [3717, 463, 462, 1850, 1, 1]);
  assert.equal(attachmentFiles.length, 6); assert.ok(rfq.requirements.some((l) => /FAI/.test(l)));
});
