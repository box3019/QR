'use strict';
// One line per item: concise normalized labels, abbreviation dictionary complete in EN and HE, global nowrap rule. The runtime check is scripts/check-layout.cjs ("item wraps").
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..'); const rd = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replace(/^\uFEFF/, '');
test('materialShort: concise normalized material labels', async () => {
  const { materialShort } = await import(pathToFileURL(path.join(root, 'core', 'checklist', 'short.mjs')).href);
  assert.strictEqual(materialShort('Delrin (POM / acetal)'), 'Delrin (POM)'); assert.strictEqual(materialShort('Aluminum 6061-T6 (AMS 4027), sheet'), 'Al 6061-T6');
  assert.strictEqual(materialShort('Stainless Steel 316L per AMS 5648'), 'SS 316L'); assert.strictEqual(materialShort('Teflon (PTFE)'), 'Teflon (PTFE)');
  for (const x of ['Aluminium 7075-T651 plate', 'Titanium Ti-6Al-4V annealed bar', 'Inconel 718 solution treated and aged per AMS 5663']) assert.ok(materialShort(x).length <= 18, x);
});
test('every checklist label has a short form (ck.sa.*) in EN and HE; the Inspection header is one short word', () => {
  for (const l of ['en', 'he']) { const j = JSON.parse(rd('src', 'i18n', l + '.json'));
    for (const k of Object.keys(j).filter((x) => /^ck\.s\./.test(x))) { const sa = j[k.replace('ck.s.', 'ck.sa.')]; assert.ok(sa, l + ' ' + k); assert.ok(sa.length <= j[k].length, l + ' ' + k + ' short form not longer'); }
    assert.ok(!/\s/.test(j['ck.g.precision']), l + ' header is one word'); }
  assert.strictEqual(JSON.parse(rd('src', 'i18n', 'en.json'))['ck.g.precision'], 'Inspection');
});
test('global nowrap rule for headers, buttons, stat labels, chips, tags', () => {
  const css = rd('src', 'styles', 'wizard.css'); const m = css.match(/\.qr-root th, [^{]*\{[^}]*white-space:\s*nowrap/); assert.ok(m, 'rule present');
  for (const sel of ['th', 'button', '.qr-stat-l', '.qr-chip', '.qr-pcard-tag']) assert.ok(m[0].includes(sel), sel);
});
