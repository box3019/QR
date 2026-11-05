'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const S = require('../core/checklist/suggest.cjs');

test('tap drill is suggested for a thread with no hole size, and skipped when the drawing states the drill', () => {
  const th = { key: 'thread', spec: 'M5x0.8', line: 'M5x0.8-6H THRU' };
  const s = S.suggestFor(th, 'mm');
  assert.ok(s && s.kind === 'tapDrill' && /5|4/.test(s.d), JSON.stringify(s));
  assert.equal(S.suggestFor({ key: 'thread', spec: 'M5x0.8', line: 'M5x0.8 TAP DRILL 4.2' }, 'mm'), null);
});
test('Helicoil / Keensert get a manufacturer drill; dowel pin gets H7', () => {
  const h = S.suggestFor({ key: 'helicoil', spec: 'M5x0.8', line: 'INSTALL HELICOIL M5X0.8' }, 'mm');
  assert.ok(h && h.kind === 'insertDrill' && h.d.indexOf('5.2') >= 0, JSON.stringify(h));
  const p = S.suggestFor({ key: 'pin', spec: '3 X 8 ISO 2338', line: 'PIN DOWEL 3 X 8 ISO 2338' }, 'mm');
  assert.ok(p && p.kind === 'pinFit' && /3/.test(p.d), JSON.stringify(p));
  const lab = S.suggestLabel(h, (k, v) => ({ 'ck.hole.insertDrill': 'manufacturer drill ' + (v && v.d), 'ck.suggest': 'suggested, not on drawing' }[k]));
  assert.match(lab, /suggested, not on drawing/);
});
test('holeStated recognises Ø / DIA / TAP DRILL / H7', () => {
  assert.equal(S.holeStated({ line: 'Ø6.3' }), true);
  assert.equal(S.holeStated({ line: 'DIA 6.3' }), true);
  assert.equal(S.holeStated({ line: 'TAP DRILL 5.2 MM' }), true);
  assert.equal(S.holeStated({ line: 'HOLE H7' }), true);
  assert.equal(S.holeStated({ line: 'M5x0.8 THRU' }), false);
});
