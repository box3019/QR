'use strict';
// Materials whitelist (families): SYNTHETIC strings only. Aluminium, steels, brass, bronze are ours; the rest is not.
const test = require('node:test'); const assert = require('node:assert');
const F = require('../core/catalog/families.cjs');
const { matchMaterial, defaultCatalog } = require('../core/catalog/index.cjs');
const p = (s) => F.parseMaterial(s);
const g = (s) => { const m = p(s); return m ? m.group + '|' + m.grade + '|' + m.temper : null; };

test('aluminium: wrought series with tempers, bare alloy-temper, EN AW, UNS, specs', () => {
  assert.strictEqual(g('6061-T6 BAR'), 'aluminium-wrought|6061|T6');
  assert.strictEqual(g('ALUMINUM ALLOY 7075-T7351 PLATE'), 'aluminium-wrought|7075|T7351');
  assert.strictEqual(g('1100-H14'), 'aluminium-wrought|1100|H14');
  assert.strictEqual(g('5052 H32 SHEET'), 'aluminium-wrought|5052|H32');
  assert.strictEqual(g('EN AW-5083-H111'), 'aluminium-wrought|5083|H111');
  assert.strictEqual(g('UNS A96061'), 'aluminium-wrought|6061|');
  assert.strictEqual(g('AL 7075-T73 PER AMS 4078'), 'aluminium-wrought|7075|T73');
  assert.strictEqual(g('ALUMINUM 2024-T351 QQ-A-250/4'), 'aluminium-wrought|2024|T351');
  assert.strictEqual(g('ALUMINUM 5052-H32 PER ASTM B209'), 'aluminium-wrought|5052|H32');
  assert.strictEqual(p('AMS 4027 SHEET').group, 'aluminium-wrought');
});
test('aluminium: cast alloys', () => {
  assert.strictEqual(g('A356.0-T6 CASTING'), 'aluminium-cast|A356|T6');
  assert.strictEqual(p('A356.0-T6 CASTING').form, 'casting');
});
test('steels: carbon, alloy, stainless, tool (AISI/SAE, UNS, W.Nr, EN, AMS)', () => {
  assert.strictEqual(p('AISI 1018 STEEL BAR').group, 'steel-carbon');
  assert.strictEqual(p('4140 STEEL PER AMS 6349').group, 'steel-alloy');
  assert.strictEqual(p('42CrMo4').group, 'steel-alloy');
  assert.strictEqual(p('42CrMo4').grade, '42CrMo4');
  assert.strictEqual(p('SAE 4130').group, 'steel-alloy');
  assert.strictEqual(p('1.4301').group, 'stainless');
  assert.strictEqual(p('SS 316L').grade, '316L');
  assert.strictEqual(p('AISI 304').group, 'stainless');
  assert.strictEqual(p('SAE 410').group, 'stainless');
  assert.strictEqual(g('17-4PH H1025 PER AMS 5643'), 'stainless|17-4PH|H1025');
  assert.strictEqual(p('D2 TOOL STEEL').group, 'tool-steel');
  assert.strictEqual(p('A2 tool steel').group, 'tool-steel');
});
test('brass and bronze: UNS C, EN/DIN, ASTM B16/B124/B150, QQ-B; "aluminium bronze" is bronze', () => {
  for (const s of ['C26000 BRASS', 'BRASS C36000 ROD', 'CuZn39Pb3', 'CUZN37', 'CW614N', 'ASTM B124 C37700', 'ASTM B16 FREE-CUTTING BRASS', 'QQ-B-626 COMP 360']) assert.strictEqual(p(s).group, 'brass', s);
  for (const s of ['PHOSPHOR BRONZE C51000', 'C54400 BRONZE', 'ALUMINUM BRONZE C95400', 'C63000', 'TIN BRONZE C93200', 'CuSn8', 'CuAl10Ni5Fe4', 'ASTM B150 C63000', 'QQ-B-750']) assert.strictEqual(p(s).group, 'bronze', s);
  assert.strictEqual(p('C36000 ROD').form, 'rod');
});
test('not recognised: titanium, other plastics (Delrin/POM and Teflon/PTFE are ours), nickel alloys, iron; other copper is its own (disabled) group', () => {
  for (const s of ['TITANIUM TI-6AL-4V', 'NYLON 6/6', 'PEEK', 'INCONEL 718', 'GRAY IRON', 'SILVER PLATING PER ASTM B700']) assert.strictEqual(p(s), null, s);
  assert.strictEqual(p('COPPER C11000').group, 'copper-other');
});
test('stock size and form are normalised; one line EN and HE', () => {
  const m = p('ALUMINUM ALLOY 6061-T651 PLATE L=144. W=48. T=0.5 INCH COMMERCIAL');
  assert.deepStrictEqual({ ...m.stock }, { l: 144, w: 48, t: 0.5, d: null, unit: 'inch' });
  assert.strictEqual(m.name, 'Aluminium 6061-T651');
  assert.strictEqual(F.oneLine(m, 'en'), 'Aluminium 6061-T651, plate 144×48×0.5"');
  assert.strictEqual(F.oneLine(m, 'he', 'אלומיניום 6061-T651'), 'אלומיניום 6061-T651, פלטה 144×48×0.5"');
  assert.ok(!/[A-Za-z]{4,}/.test(F.oneLine(m, 'he', 'אלומיניום 6061-T651').replace(/6061-T651/, '')));
  assert.strictEqual(F.sizeText({ d: 25, unit: 'mm' }), 'Ø25 mm');
});
test('catalog: families are rows in the editable list; group on/off decides, explicit alloys win', () => {
  const cat = defaultCatalog().materials;
  const rules = cat.filter((r) => r.rule);
  assert.deepStrictEqual(rules.map((r) => r.group).sort(), ['aluminium-cast', 'aluminium-wrought', 'brass', 'bronze', 'copper-other', 'plastic-pom', 'plastic-ptfe', 'stainless', 'steel-alloy', 'steel-carbon', 'tool-steel']);
  for (const r of rules) { assert.ok(r.nameEn && r.nameHe); assert.strictEqual(r.enabled, r.group !== 'copper-other'); }
  for (const s of ['6061-T651 PLATE', 'CuZn39Pb3', 'C51000 PHOSPHOR BRONZE', 'AISI 304', 'A356.0-T6 CASTING', 'D2 TOOL STEEL']) assert.strictEqual(matchMaterial(s, cat).allowed, true, s);
  const t = matchMaterial('TITANIUM TI-6AL-4V', cat); assert.strictEqual(t.allowed, false); assert.match(t.reason, /not in the materials list/);
  const off = cat.map((r) => (r.group === 'brass' ? { ...r, enabled: false } : r));
  const b = matchMaterial('C36000 BRASS ROD', off); assert.strictEqual(b.allowed, false); assert.match(b.reason, /disabled/);
  assert.strictEqual(matchMaterial('C51000 BRONZE', off).allowed, true);
  assert.strictEqual(matchMaterial('COPPER C11000', cat).allowed, false);
});

