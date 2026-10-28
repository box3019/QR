'use strict';
// Routing-chart OCR helpers on SYNTHETIC pixels (no OCR engine, no drawing).
const test = require('node:test'); const assert = require('node:assert');
const O = require('../core/ocr/chart.cjs');
const W = 600, H = 400;
const page = () => {
  const g = new Uint8Array(W * H).fill(255);
  const vline = (x, y0, y1) => { for (let y = y0; y <= y1; y++) g[y * W + x] = 0; };
  const hline = (y, x0, x1) => { for (let x = x0; x <= x1; x++) g[y * W + x] = 0; };
  vline(50, 20, 380); vline(550, 20, 380); vline(120, 20, 380);
  for (const y of [20, 100, 200, 300, 380]) hline(y, 50, 550);
  for (let y = 140; y < 150; y++) for (let x = 200; x < 206; x++) g[y * W + x] = 0; // a glyph-sized blob inside a cell
  return g;
};
test('findAnchor: PRODUCTION ROUTING CHART words, tolerant to I/1 and L; not found elsewhere', () => {
  const T = (text, x, y = 10) => ({ text, x, y, w: 40, h: 10 });
  const a = O.findAnchor([T('PRODUCTION', 100), T('ROUTING', 150), T('CHART', 200), T('NOTES', 400)]);
  assert.deepStrictEqual([a.x, a.y], [100, 10]);
  assert.ok(O.findAnchor([T('PRODUCT1ON', 100), T('ROUT1NG', 150)]));
  assert.strictEqual(O.findAnchor([T('ROUTING', 100), T('NOTES', 150)]), null);
  assert.strictEqual(O.findAnchor([]), null);
});
test('detectBox: nearest long vertical rules around the anchor', () => {
  const b = O.detectBox(page(), W, H, 300, 21, { minRun: 120 });
  assert.ok(b); assert.ok(b.x0 === 120 || b.x0 === 50); assert.strictEqual(b.x1, 550); assert.ok(b.y1 - b.y0 > 300);
  assert.strictEqual(O.detectBox(new Uint8Array(W * H).fill(255), W, H, 300, 21), null);
});
test('horizontalRules / verticalRules find the table grid', () => {
  assert.deepStrictEqual(O.horizontalRules(page(), W, H).map((r) => r[0]), [20, 100, 200, 300, 380]);
  assert.deepStrictEqual(O.verticalRules(page(), W, H).map((r) => r[0]), [50, 120, 550]);
});
test('eraseRules whitens ruling lines but keeps glyph-sized ink', () => {
  const g = O.eraseRules(page(), W, H);
  assert.strictEqual(g[100 * W + 300], 255); assert.strictEqual(g[200 * W + 50], 255);
  assert.strictEqual(g[145 * W + 202], 0);
});
test('cellLines groups words into lines left to right; fixNo repairs OCR digits', () => {
  const w = (text, x0, y0) => ({ text, x0, x1: x0 + 30, y0, y1: y0 + 12, conf: 80 });
  const l = O.cellLines([w('B', 100, 10), w('A', 40, 11), w('NEXT', 40, 40)]);
  assert.deepStrictEqual(l.map((x) => x.text), ['A B', 'NEXT']);
  assert.strictEqual(O.fixNo('4O.S'), '40.5'); assert.strictEqual(O.fixNo('2 0,1.'), '20.1'); assert.strictEqual(O.fixNo('l0'), '10');
});
