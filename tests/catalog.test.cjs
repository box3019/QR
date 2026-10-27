'use strict';
const test = require('node:test');
const assert = require('node:assert');
const c = require('../core/catalog/index.cjs');
const { materials, processes } = c.defaultCatalog();

test('catalog defaults: Alex list, EN+HE names, aliases', () => {
  assert.deepStrictEqual(materials.map((m) => m.id), ['al-6061', 'al-7075', 'al-7050', 'al-2024', 'delrin', 'teflon']);
  for (const e of [...materials, ...processes]) { assert.ok(e.nameEn && e.nameHe && e.aliases.length, e.id); assert.ok(c.entryPattern(e)); }
  assert.ok(processes.some((p) => p.id === 'primer-br127') && processes.some((p) => p.id === 'clean-room'));
});
test('aliasPattern: flexible separators, no glued digits', () => {
  const re = new RegExp(c.aliasPattern('QQ-A-250/11'), 'i');
  assert.ok(re.test('PER QQ A 250/11')); assert.ok(!re.test('QQ-A-250/110'));
  assert.ok(!new RegExp(c.aliasPattern('6061'), 'i').test('16061'));
  assert.ok(new RegExp(c.aliasPattern('AMS 4027'), 'i').test('AMS4027N'));
});
test('matchMaterial: grades, tempers, specs, not-in-list naming', () => {
  const m = (r) => c.matchMaterial(r, materials);
  assert.strictEqual(m('AL_6061-T651').found, 'Aluminium 6061-T651');
  assert.ok(m('PLATE 2.25" AMS 4027N 6061-T651').allowed);
  assert.ok(m('AL 7075-T6 ASTM B211').allowed);
  assert.strictEqual(m('AL 7075-T6 ASTM B211').entry.id, 'al-7075');
  assert.ok(m('DELRIN 150').allowed && m('PTFE').allowed && m('POM-C').allowed);
  assert.strictEqual(m('ALUMINUM 5052-H32 PER ASTM B209').reason, 'Aluminium 5052-H32 is not in the materials list');
  assert.match(m('6061-T5').reason, /temper T5 is not in the list/);
  assert.match(m('STAINLESS STEEL 303').reason, /Stainless steel 303/);
  const off = materials.map((x) => (x.id === 'teflon' ? { ...x, enabled: false } : x));
  assert.match(c.matchMaterial('TEFLON', off).reason, /disabled/);
});
test('detectProcesses: mapping, negation, unmapped', () => {
  const r = c.detectProcesses([{ text: 'BLACK ANODIZE PER MIL-A-8625 TYPE II', where: 'note 5' }, { text: 'DO NOT PAINT', where: 'note 6' }, { text: 'DLC BY PLASCOTEC', where: 'note 13' }, { text: 'PRIMER BR127', where: 'note 8' }], processes);
  const by = Object.fromEntries(r.map((p) => [p.key, p]));
  assert.strictEqual(by.anodize.entry.id, 'coating');
  assert.strictEqual(by.dlc.status, 'unmapped');
  assert.ok(!by.paint || by.paint.where !== 'note 6');
  assert.ok(r.some((p) => p.entry && p.entry.id === 'primer-br127'));
});
test('mergeCatalog keeps user edits and added rows, ignores old regex lists', () => {
  const merged = c.mergeCatalog(materials, [{ id: 'al-2024', enabled: false }, { id: 'x-5052', grade: '5052', aliases: ['5052'], enabled: true }]);
  assert.strictEqual(merged.find((x) => x.id === 'al-2024').enabled, false);
  assert.ok(merged.find((x) => x.id === 'x-5052'));
  assert.strictEqual(c.mergeCatalog(materials, [{ family: 'Aluminium', re: 'X' }]).length, materials.length);
});
