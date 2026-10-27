'use strict';
// Tutorial: HE/RU/EN have the same steps, every field is filled, and no view mixes scripts.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'tutorial', 'steps.ts'), 'utf8').replace(/^[\s\S]*?export const TUT[^=]*=\s*/, '').replace(/;\s*$/, '');
const TUT = Function(`return (${src})`)();
const HEB = /[\u0590-\u05FF]/, CYR = /[\u0400-\u04FF]/, LAT = /[A-Za-z]{2,}/g;
const ALLOWED = new Set(['QR', 'ERP', 'PDF', 'STEP', 'ZIP', 'RAR', 'OCR', 'Excel']);
test('same number of steps in every language', () => { const n = TUT.en.steps.length; for (const k of ['he', 'ru']) assert.strictEqual(TUT[k].steps.length, n, k); });
test('no language mixing', () => {
  for (const [k, v] of Object.entries(TUT)) {
    const all = [...Object.values(v.ui), ...v.steps.flatMap((s) => [s.h, s.p])];
    for (const s of all) {
      assert.ok(s && s.trim(), k + ' empty');
      if (k === 'en') { assert.ok(!HEB.test(s) && !CYR.test(s), s); continue; }
      assert.ok(!(k === 'he' ? CYR : HEB).test(s), s);
      const latin = (s.match(LAT) || []).filter((w) => !ALLOWED.has(w)); assert.deepStrictEqual(latin, [], `${k}: ${s}`);
    }
  }
});
