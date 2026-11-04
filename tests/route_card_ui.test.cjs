'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'views', 'routeCard.mjs')).href);
const rd = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

test('opLabel drops a repeated type and title', async () => {
  const { opLabel } = await load();
  assert.strictEqual(opLabel('עיבוד', 'עיבוד'), 'עיבוד');
  assert.strictEqual(opLabel('Machining', 'Machining'), 'Machining');
  assert.strictEqual(opLabel('Machining', 'CNC mill'), 'Machining \u00b7 CNC mill');
  assert.strictEqual(opLabel('בקרה', ''), 'בקרה');
});

test('sameRouteSource is true only when every row shares one source', async () => {
  const { sameRouteSource } = await load();
  assert.strictEqual(sameRouteSource(['טבלת מסלול', 'טבלת מסלול', 'טבלת מסלול']), true);
  assert.strictEqual(sameRouteSource(['Routing chart', 'Routing chart']), true);
  assert.strictEqual(sameRouteSource(['Routing chart', 'Note 6']), false);
  assert.strictEqual(sameRouteSource([]), false);
});

test('route card table uses MrtTable and hides a repeated source column', () => {
  const v = rd('src', 'views', 'RouteCardView.tsx');
  assert.match(v, /MrtTable/);
  assert.match(v, /opLabel/);
  assert.match(v, /sameRouteSource/);
  assert.match(v, /hideSrc/);
  assert.match(v, /qr-rcard-c-ins/);
});

test('footer actions sit on the start side (left in LTR, right in RTL)', () => {
  assert.match(rd('src', 'styles', 'wizard.css'), /\.qr-wiz-footer \{[^}]*justify-content:\s*flex-start/);
});

test('job tabs keep one chip border; assistant avatar has no frame', () => {
  const css = rd('src', 'styles', 'layers.css');
  assert.match(css, /mrt-workspace-tab__label[\s\S]*border:\s*0 !important/);
  assert.match(css, /\.qr-root \.qr-ai-avatar \{[\s\S]*border:\s*0 !important/);
  assert.match(rd('src', 'checklist', 'Checklist.tsx'), /ck-show-all/);
  assert.match(rd('src', 'checklist', 'Checklist.tsx'), /state !== 'no'/);
});
