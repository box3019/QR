'use strict';
// Wizard: step order/state, which steps open without parts, minimal toolbar per step, viewer tabs, i18n EN/HE.
const test = require('node:test'); const assert = require('node:assert'); const path = require('path'); const { pathToFileURL } = require('url');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'wizard', 'steps.mjs')).href);
test('four steps, state per step', async () => { const w = await load(); assert.deepStrictEqual(w.STEPS, [1, 2, 3, 4]);
  assert.deepStrictEqual(w.STEPS.map((n) => w.stepState(n, 3)), ['done', 'done', 'current', 'todo']); assert.strictEqual(w.nextStep(4), 4); assert.strictEqual(w.nextStep(1), 2); });
test('only intake opens without parts; any step with parts', async () => { const w = await load();
  assert.deepStrictEqual(w.STEPS.map((n) => w.canOpen(n, false)), [true, false, false, false]); assert.deepStrictEqual(w.STEPS.map((n) => w.canOpen(n, true)), [true, true, true, true]); });
test('minimal toolbar: add only in intake, details only after intake', async () => { const w = await load();
  assert.strictEqual(w.toolbarFor(1, true).addFiles, false); assert.strictEqual(w.toolbarFor(1, false).addFolder, false); assert.strictEqual(w.toolbarFor(2, true).addFiles, false); assert.strictEqual(w.toolbarFor(1, true).details, false);
  assert.strictEqual(w.toolbarFor(3, true).details, true); assert.strictEqual(w.toolbarFor(2, false).details, false); for (const n of [1, 2, 3, 4]) assert.ok(w.toolbarFor(n, true).help && w.toolbarFor(n, true).settings); });
test('viewer tabs: model/data only with details', async () => { const w = await load(); assert.deepStrictEqual(w.viewerTabs(false), ['drawing', 'route']); assert.deepStrictEqual(w.viewerTabs(true), ['drawing', 'route', 'model', 'data']); });
test('wizard i18n complete in EN and HE, HE has no Latin', () => { const en = require('../src/i18n/en.json'), he = require('../src/i18n/he.json');
  const keys = Object.keys(en).filter((k) => /^(wz|as|ctx)\./.test(k)); assert.ok(keys.length >= 30);
  for (const k of keys) { assert.ok(he[k], 'he ' + k); assert.ok(!/[A-Za-z]/.test(he[k].replace(/\{\w+\}/g, '')), 'latin in he ' + k); } });
