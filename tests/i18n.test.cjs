'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const path = require('path');
const en = require('../src/i18n/en.json'); const he = require('../src/i18n/he.json');
const src = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? src(path.join(d, e.name)) : /\.tsx$/.test(e.name) ? [path.join(d, e.name)] : []));
const files = src(path.join(__dirname, '..', 'src'));

test('en and he have the same keys; Hebrew values are Hebrew', () => {
  assert.deepStrictEqual(Object.keys(he).sort(), Object.keys(en).sort());
  const heb = Object.entries(he).filter(([k, v]) => /[\u0590-\u05FF]/.test(v));
  assert.ok(heb.length > Object.keys(he).length * 0.85, 'most Hebrew strings translated');
});
test('every literal t() key exists', () => {
  for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bt\('([a-zA-Z.]+)'(?!\s*\+)/g)) {
    if (m[1].endsWith('.')) continue; // dynamic prefix: t('tab.' + k)
    assert.ok(m[1] in en, `${path.basename(f)}: missing key ${m[1]}`);
  }
});
test('no hard-coded English UI text in components', () => {
  const allowed = /^(English|OCR|QR|RFQ \{|DPI|T6…|✕|✓|↺|⌖|·|—|-|\+|\(|\)|\/|Outlook|עברית|עברית \(Hebrew\))$/;
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/>([^<>{}\n]*[A-Za-z]{3,}[^<>{}\n]*)</g)) {
      const txt = m[1].trim();
      if (!txt || allowed.test(txt) || /^[\w.]+\(/.test(txt) || /=>|&&|\?|===|^:/.test(txt)) continue;
      assert.fail(`${path.basename(f)}: hard-coded text "${txt}"`);
    }
  }
});
