'use strict';
// No UTF-8-read-as-cp1252 garbage (e.g. "\u00e2\u0153\u2022" instead of a check mark) anywhere in the UI source or dictionaries.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
test('no mojibake in src', () => { for (const f of walk(path.join(__dirname, '..', 'src')).filter((x) => /\.(tsx?|mjs|json|css)$/.test(x))) {
  const s = fs.readFileSync(f, 'utf8'); assert.doesNotMatch(s, /\u00e2[\u0080-\u00bf\u0153\u20ac\u2020\u2021\u201a-\u201e]|\u00c3[\u0080-\u00bf]|\u00d7[\u0090-\u00aa]/, f); } });