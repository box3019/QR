'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const c = require('../core/customers/index.cjs');
const { buildRfq } = require('../core/email/rfq.cjs');
const { readEmail } = require('../core/email/index.cjs');
const FIX = process.env.QR_FIXTURES || 'C:\\Users\\AlexK\\agent-tools\\qr-testdata\\fixtures';
const PCB = { id: 'C-PCB', name: 'PCB Technologies', base: 'RAFAEL', enabled: true, detect: { emailDomains: ['pcb-technologies.com'], keywords: [], partNoPatterns: [], filenamePatterns: [] } };

test('built-ins detect from data; GENERIC fallback', () => {
  const L = c.mergeCustomers();
  assert.strictEqual(c.detectProfile({ text: 'PRODUCTION ROUTING CHART' }, L).id, 'RAFAEL');
  assert.strictEqual(c.detectProfile({ text: 'KLA FORMAT' }, L).id, 'KLA');
  assert.strictEqual(c.detectProfile({ text: 'DWG 1096B020-001' }, L).id, 'ELTA');
  assert.strictEqual(c.detectProfile({ text: 'nothing' }, L).id, 'GENERIC');
  assert.strictEqual(c.detectProfile({ text: 'KLA FORMAT' }, L.map((x) => (x.id === 'KLA' ? { ...x, enabled: false } : x))).id, 'GENERIC');
});
test('custom customer by e-mail domain wins; base profile inherited', () => {
  const L = c.mergeCustomers([PCB]);
  const p = c.detectProfile({ text: 'לקוח סופי רפאל', emails: ['x@pcb-technologies.com'] }, L);
  assert.deepStrictEqual([p.id, p.base, p.why], ['C-PCB', 'RAFAEL', 'e-mail pcb-technologies.com']);
  const rfq = buildRfq({ subject: 'RFQ 701751', body: 'From: Ilanit <ilanit@pcb-technologies.com>\nלקוח סופי רפאל', sender: { email: 'a@b.com' } }, [], 'x.msg', L);
  assert.strictEqual(rfq.customer, 'PCB Technologies');
  assert.strictEqual(buildRfq({ subject: 'RFQ', body: 'לקוח סופי רפאל', sender: {} }, [], 'x', c.mergeCustomers()).customer, 'RAFAEL');
});
test('RFQ 701751 .msg resolves to the custom customer', { skip: !fs.existsSync(path.join(FIX, 'RFQ_701751.msg')) }, async () => {
  const { rfq } = await readEmail(path.join(FIX, 'RFQ_701751.msg'), fs.mkdtempSync(path.join(os.tmpdir(), 'qrc-')), { customers: c.mergeCustomers([PCB]) });
  assert.strictEqual(rfq.customer, 'PCB Technologies');
});
test('patterns, merge, duplicate, built-ins not deletable', () => {
  assert.ok(new RegExp('^' + c.simplePattern('####@###-###') + '$').test('1096B020-001'));
  const L = c.mergeCustomers([{ id: 'KLA', name: 'KLA Corp', enabled: false, detect: { keywords: ['KLA'] } }]);
  assert.strictEqual(L.length, 5); assert.strictEqual(L.find((x) => x.id === 'KLA').name, 'KLA Corp');
  const d = c.newCustomer(L.find((x) => x.id === 'ELTA'), L.map((x) => x.id));
  assert.ok(!d.builtin && d.base === 'ELTA' && d.id === 'C-ELTA');
  assert.strictEqual(c.mergeCustomers([{ ...d, base: 'NOPE' }]).find((x) => x.id === 'C-ELTA').base, 'GENERIC');
});
