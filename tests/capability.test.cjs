'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { checkCapability } = require('../core/checks/capability.cjs');
const { defaultCatalog } = require('../core/catalog/index.cjs');
const { normalizeSettings } = require('../core/settings.cjs');

test('capability: allowed material, unmapped/disabled process problems name what and where', () => {
  const cat = defaultCatalog();
  cat.processes = cat.processes.map((p) => (p.id === 'heat-treat' ? { ...p, enabled: false } : p));
  const r = checkCapability({ material: { raw: 'AL 6061-T6', source: 'title block' }, lines: [{ text: 'HEAT TREAT PER AMS 2770', where: 'note 3' }, { text: 'DLC COATING', where: 'note 9' }], catalog: cat });
  assert.strictEqual(r.status, 'accepted');
  assert.ok(r.problems.some((p) => /Heat treat "HEAT TREAT" \(note 3\) — disabled/.test(p.message)));
  assert.ok(r.problems.some((p) => /DLC coating "DLC" \(note 9\) — not in the processes list/.test(p.message)));
});
test('capability: rejected material is a Blocker naming grade/temper; no material -> pending', () => {
  const r = checkCapability({ material: { raw: '5052-H32', source: 'title block' }, lines: [], catalog: defaultCatalog() });
  assert.strictEqual(r.status, 'rejected');
  assert.match(r.problems[0].message, /^Aluminium 5052-H32 is not in the materials list/);
  assert.strictEqual(checkCapability({ material: null, lines: [], catalog: defaultCatalog() }).status, 'pending');
});
test('settings: old regex materials dropped, catalogs merged', () => {
  const s = normalizeSettings({ materials: [{ family: 'Aluminium', re: 'x' }], materialsCatalog: [{ id: 'delrin', enabled: false }] });
  assert.ok(!s.materials);
  assert.strictEqual(s.materialsCatalog.find((m) => m.id === 'delrin').enabled, false);
  assert.ok(s.processesCatalog.length >= 15 && s.customers.length === 5);
});
