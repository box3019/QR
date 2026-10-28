'use strict';
// One line per item: concise normalized labels, abbreviation dictionary complete in EN and HE, global nowrap rule. The runtime check is scripts/check-layout.cjs ("item wraps").
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..'); const rd = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replace(/^\uFEFF/, '');
test('materialShort: full words only, trimmed at a natural break', async () => {
  const { materialShort } = await import(pathToFileURL(path.join(root, 'core', 'checklist', 'short.mjs')).href);
  assert.strictEqual(materialShort('Delrin (POM / acetal)'), 'Delrin (POM)'); assert.strictEqual(materialShort('Aluminum 6061-T6 (AMS 4027), sheet'), 'Aluminum 6061-T6');
  assert.strictEqual(materialShort('Stainless Steel 316L per AMS 5648'), 'Stainless Steel 316L'); assert.strictEqual(materialShort('Teflon (PTFE)'), 'Teflon (PTFE)');
  for (const x of ['Aluminium 7075-T651 plate', 'Titanium Ti-6Al-4V annealed bar', 'Inconel 718 solution treated and aged per AMS 5663', 'Copper C110', 'Carbon steel 1018']) { const m = materialShort(x); assert.ok(m.length <= 26, x); assert.ok(!/^(?:Al|SS|Cu|CS|AS)\b/.test(m), 'no abbreviated metal names: ' + m); }
});
test('the summary has no abbreviation dictionary and no abbreviation level', () => {
  const tsx = rd('src', 'checklist', 'ChecklistSummary.tsx'); const css = rd('src', 'styles', 'wizard.css');
  assert.ok(!/ck\.sa\./.test(tsx) && !/data-lvl=\{lvl\}/.test(tsx)); assert.ok(!/data-lvl="2"\] \.qr-cks-p/.test(css));
  for (const l of ['en', 'he']) assert.ok(!Object.keys(JSON.parse(rd('src', 'i18n', l + '.json'))).some((k) => /^ck\.sa\./.test(k)), l + ' no ck.sa keys');
  assert.ok(/ck\.items\.one/.test(tsx) && /ck\.items\.many/.test(tsx) && /data-testid="cks-expand"/.test(tsx) && /ChecklistBody/.test(tsx), 'N items fallback and expandable row');
  assert.strictEqual(JSON.parse(rd('src', 'i18n', 'en.json'))['ck.g.precision'], 'Inspection');
});
test('global nowrap rule for headers, buttons, stat labels, chips, tags', () => {
  const css = rd('src', 'styles', 'wizard.css'); const m = css.match(/\.qr-root th, [^{]*\{[^}]*white-space:\s*nowrap/); assert.ok(m, 'rule present');
  for (const sel of ['th', 'button', '.qr-stat-l', '.qr-chip', '.qr-pcard-tag']) assert.ok(m[0].includes(sel), sel);
});
