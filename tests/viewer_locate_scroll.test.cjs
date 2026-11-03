'use strict';
// After the first locate click the highlight must sit inside the viewport. The viewer
// resize handler used to re-centre the sheet (fit) and throw the box off-screen.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'wizard', 'dropGuard.mjs')).href);
const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');

const inView = (box, scroll, viewW, viewH) => {
  const left = box.left - scroll.left, top = box.top - scroll.top;
  return left >= -1 && top >= -1 && left + box.w <= viewW + 1 && top + box.h <= viewH + 1;
};

test('after the first locate click the highlight box is inside the viewport', async () => {
  const m = await load();
  const viewW = 800, viewH = 600, imgW = 2600, imgH = 1840;
  const bbox = { x: 220, y: 140, w: 90, h: 36 };
  const z = m.zoomToBox(viewW, viewH, imgW, imgH, bbox);
  const s = m.scrollToBox(viewW, viewH, imgW, imgH, z, bbox);
  const k = (1500 * z) / imgW;
  const box = { left: bbox.x * k, top: bbox.y * k, w: bbox.w * k, h: bbox.h * k };
  assert.ok(inView(box, s, viewW, viewH), 'locate scroll keeps the box in view');
  const W = 1500 * z, H = W * imgH / imgW;
  const c = m.centerScroll(viewW, viewH, W, H);
  assert.ok(!inView(box, c, viewW, viewH) || Math.abs(c.left - s.left) > 8 || Math.abs(c.top - s.top) > 8, 'sheet-centre scroll is not the locate scroll');
});

test('Viewer resize/fit recentering is skipped after a locate zoom', () => {
  const v = src('views/Viewer.tsx');
  assert.match(v, /locateRef/);
  assert.match(v, /if \(locateRef\.current\)/);
  assert.match(v, /scrollLocate/);
  assert.match(v, /locateRef\.current = true/);
  assert.doesNotMatch(v, /new ResizeObserver\(\(\) => \{ if \(autoRef\.current\) refit\(\); else recenter\(\); \}\)/);
});
