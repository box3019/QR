'use strict';
// No pill / capsule shapes: border-radius 999px, 9999px, 50% or rounded-full only on lines marked /* circle */.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
test('no pill radius in src', () => {
  const bad = [];
  for (const f of walk(path.join(__dirname, '..', 'src')).filter((f) => /\.(css|tsx?|ts)$/.test(f))) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if ((/border-?radius\s*:\s*['"]?(999+px|50%)/i.test(l) || /borderRadius:\s*['"]?(999|50%)/.test(l) || /\brounded-full\b/.test(l)) && !/circle/.test(l)) bad.push(path.basename(f) + ':' + (i + 1) + ' ' + l.trim().slice(0, 80));
  });
  assert.deepStrictEqual(bad, []);
});
