'use strict';
// Parts list grouping: fixed order, empty groups hidden, indices preserved, status precedence.
const test = require('node:test'); const assert = require('node:assert'); const path = require('path'); const { pathToFileURL } = require('url');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'parts', 'groups.mjs')).href);
const P = (o) => ({ status: 'accepted', problems: [], tasks: [], ...o });
const ok = P({}), doc = P({ tasks: [{ type: 'uploadDocument', status: 'open' }] }), ask = P({ problems: [{ severity: 'Question', status: 'open' }] }), no = P({ status: 'rejected' });
test('order is ready, needsDoc, needsAnswer, notOurs', async () => { const g = await load(); assert.deepStrictEqual(g.GROUP_ORDER, ['ready', 'needsDoc', 'needsAnswer', 'notOurs']);
  assert.deepStrictEqual(g.groupParts([no, ask, doc, ok]).map((x) => x.key), g.GROUP_ORDER); });
test('empty groups hidden', async () => { const g = await load(); assert.deepStrictEqual(g.groupParts([ok, no, ok]).map((x) => [x.key, x.items.length]), [['ready', 2], ['notOurs', 1]]); assert.deepStrictEqual(g.groupParts([]), []); });
test('original index kept for selection', async () => { const g = await load(); const r = g.groupParts([no, ok, ask]); assert.deepStrictEqual(r.map((x) => x.items.map((y) => y.index)), [[1], [2], [0]]); assert.strictEqual(r[0].items[0].part, ok); });
test('status precedence', async () => { const g = await load();
  assert.strictEqual(g.plainStatus(P({ status: 'rejected', tasks: doc.tasks })), 'notOurs');
  assert.strictEqual(g.plainStatus(P({ tasks: doc.tasks, problems: ask.problems })), 'needsDoc');
  assert.strictEqual(g.plainStatus(P({ problems: [{ severity: 'Blocker', status: 'resolved' }] })), 'ready');
  assert.strictEqual(g.plainStatus(P({ problems: [{ internal: true, status: 'open' }] })), 'notOurs');
  assert.strictEqual(g.plainStatus(P({ status: 'pending' })), 'needsAnswer');
  assert.strictEqual(g.plainStatus(P({ tasks: [{ type: 'uploadDocument', status: 'done' }] })), 'ready'); });
test('i18n has every group in EN and HE, HE without Latin', () => { for (const l of ['en', 'he']) { const j = require(`../src/i18n/${l}.json`);
  for (const k of ['pg.ready', 'pg.needsDoc', 'pg.needsAnswer', 'pg.notOurs', 'pg.collapse', 'pg.expand']) { assert.ok(j[k], l + ' ' + k); if (l === 'he') assert.ok(!/[A-Za-z]/.test(j[k]), k); } } });
