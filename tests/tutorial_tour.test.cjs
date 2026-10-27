'use strict';
// Every spotlight target exists in the UI; texts complete in HE/RU/EN, at most 2 short sentences, no technical words, no Latin in HE/RU.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const src = walk(path.join(__dirname, '..', 'src')).filter((f) => /\.tsx$/.test(f) && !/tutorial[\\/]/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const has = (id) => {
  const m = id.match(/^step-(\d)$/); if (m) return /data-testid=\{'step-' \+ n\}/.test(src) && +m[1] >= 1 && +m[1] <= 4;
  return new RegExp(`data-testid="${id}"|testid="${id}"|data-testid=\\{'${id}'\\}`).test(src);
};
test('tour targets exist and texts are complete', async () => {
  const { TOUR, TOUR_TEXT, tourFor } = await import('../src/tutorial/tour.mjs');
  for (const s of TOUR) assert.ok(has(s.target), 'missing data-testid ' + s.target);
  for (const [l, T] of Object.entries(TOUR_TEXT)) for (const s of TOUR) {
    const v = T.s[s.id]; assert.ok(v && v[0] && v[1], l + ' ' + s.id);
    const n = (v[1].match(/[.!?…](\s|$)/g) || []).length; assert.ok(n <= 2, l + ' ' + s.id + ' sentences ' + n);
    assert.doesNotMatch(v.join(' '), /\b(OCR|PDF|XLSX|JSON|IPC|API|regex|parser)\b/i, l + ' ' + s.id);
    if (l !== 'en') assert.doesNotMatch(v.join(' ').replace(/QR/g, ''), /[A-Za-z]/, l + ' ' + s.id + ' latin');
  }
  assert.equal(TOUR_TEXT.he.dir, 'rtl'); for (const st of [1, 2, 3, 4]) assert.ok(tourFor(st).length > 0, 'stage ' + st);
  assert.equal(tourFor().length, TOUR.length);
});
