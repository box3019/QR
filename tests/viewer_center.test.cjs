'use strict';
// The drawing viewer is LTR whatever the UI language, starts as a centred fit-whole-sheet, and re-centres on resize / part switch.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'wizard', 'dropGuard.mjs')).href);
const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
test('zoomToBox: the box fills about 40 % of the viewport and stays in zoom limits', async () => { const m = await load();
  const z = m.zoomToBox(800, 600, 1600, 1200, { x: 100, y: 80, w: 80, h: 40 }, 0.4);
  const k = (1500 * z) / 1600; const boxW = 80 * k, boxH = 40 * k;
  assert.ok(Math.abs(Math.max(boxW / 800, boxH / 600) - 0.4) < 0.02, 'fill ~40%');
  assert.ok(z >= 0.1 && z <= 8);
  const s = m.scrollToBox(800, 600, 1600, 1200, z, { x: 100, y: 80, w: 80, h: 40 });
  assert.ok(s.left >= 0 && s.top >= 0);
  assert.strictEqual(m.zoomToBox(0, 600, 100, 100, { x: 0, y: 0, w: 10, h: 10 }), 1);
});
test('fitSheet: the whole sheet fits (width AND height) and never exceeds the view; same result for HE and EN (pure geometry)', async () => { const m = await load();
  for (const [vw, vh] of [[640, 700], [900, 600], [1100, 900], [380, 800]]) for (const [iw, ih] of [[2600, 1840], [1840, 2600], [2600, 2600]]) {
    const z = m.fitSheet(vw, vh, iw, ih); const W = 1500 * z; const H = W * ih / iw;
    assert.ok(W <= vw + 0.01 && H <= vh + 0.01, `fits ${vw}x${vh} img ${iw}x${ih}: ${W.toFixed(0)}x${H.toFixed(0)}`);
    assert.ok(Math.abs(W - (vw - 16)) < 1 || Math.abs(H - (vh - 16)) < 1 || z <= 0.1 + 1e-9, 'touches one edge (largest fit)'); }
  assert.strictEqual(m.fitSheet(0, 500, 100, 100), 1); });
test('centerScroll: centres bigger content, never negative', async () => { const m = await load();
  assert.deepStrictEqual(m.centerScroll(600, 400, 1000, 900), { left: 200, top: 250 }); assert.deepStrictEqual(m.centerScroll(600, 400, 500, 300), { left: 0, top: 0 }); });
test('Viewer: dir=ltr on the root and the viewport, fit on part/sheet change, ResizeObserver re-fit/re-centre, double-click fit, wheel zoom keeps working', () => { const v = src('views/Viewer.tsx'); const c = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'layers.css'), 'utf8');
  assert.match(v, /className="qr-draw" dir="ltr"/); assert.match(v, /className="qr-draw-vp"[^>]*dir="ltr"/);
  assert.match(v, /fitSheet\(/); assert.match(v, /new ResizeObserver\(/); assert.match(v, /part\.drawing\.path, page\]/); assert.match(v, /onDoubleClick=/); assert.match(v, /'wheel'/); assert.match(v, /onMouseMove=/); assert.match(v, /dw-fit/); assert.match(v, /zoomToBox\(/);
  assert.match(c, /\.qr-draw-vp>\.qr-sheet\{margin:auto/); assert.match(c, /\.qr-draw-vp\{[^}]*direction:ltr/); assert.match(c, /\.qr-draw-vp\{[^}]*overflow:auto/); });
