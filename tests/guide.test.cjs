'use strict';
// Guided part-check: one task at a time, marks, auto-advance, locate payload. Synthetic data only.
const test = require('node:test'); const assert = require('node:assert'); const path = require('path'); const { pathToFileURL } = require('url');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src/parts/guide.mjs')).href);
const blocks = [
  { id: 'f:material', kind: 'material', status: 'warn', titleKey: 'bd.s.material', value: 'Aluminium 6061' },
  { id: 'std:1', kind: 'standard', status: 'ok', title: 'AS5202-06' },
  { id: 'f:1:coatings', kind: 'field', status: 'warn', titleKey: 'bd.s.coatings' },
  { id: 'f:none', kind: 'none', status: 'none', titleKey: 'blk.none' },
];
test('guide skips the grey none block and seeds ok as done', async () => {
  const g = await load(); const tasks = g.guideTasks(blocks);
  assert.deepStrictEqual(tasks.map((b) => b.id), ['f:material', 'std:1', 'f:1:coatings']);
  const marks = g.initialMarks(tasks);
  assert.strictEqual(marks['std:1'], 'done');
  assert.strictEqual(g.firstTaskIndex(tasks, marks), 0);
  assert.strictEqual(g.taskState(tasks[1], marks), 'done');
  assert.strictEqual(g.taskState(tasks[0], marks), 'todo');
});
test('confirm then auto-advance to the next open task, then summary', async () => {
  const g = await load(); const tasks = g.guideTasks(blocks); let marks = g.initialMarks(tasks);
  marks = g.applyMark(marks, 'f:material', 'done');
  assert.strictEqual(g.nextTaskIndex(tasks, marks, 0), 2);
  marks = g.applyMark(marks, 'f:1:coatings', 'problem');
  assert.strictEqual(g.nextTaskIndex(tasks, marks, 2), 3);
  assert.strictEqual(g.taskState(tasks[2], marks), 'problem');
});
test('locateBlock uses the material value and a critical tone on a bad block', async () => {
  const g = await load();
  const part = { drawing: { pages: [{ n: 1, tokens: [{ text: 'ALUMINIUM 6061-T6', x: 10, y: 20, w: 80, h: 8 }] }] } };
  const loc = g.locateBlock(part, { id: 'f:material', kind: 'material', status: 'bad', value: 'Aluminium 6061', page: 1 });
  assert.ok(loc && loc.bbox && loc.bbox.w > 0); assert.strictEqual(loc.tone, 'critical'); assert.strictEqual(loc.page, 1);
  assert.strictEqual(g.locateBlock(part, { id: 'x', kind: 'field', value: '' }), null);
});
test('missing documents skip route-card stage; open questions skip info', async () => {
  const g = await load();
  const part = { tasks: [{ type: 'uploadDocument', stage: 'routecard', status: 'open' }, { type: 'uploadDocument', status: 'open' }, { type: 'uploadDocument', status: 'done' }],
    problems: [{ severity: 'Info', status: 'open' }, { severity: 'Question', status: 'open' }, { severity: 'Blocker', status: 'resolved' }] };
  assert.strictEqual(g.missingDocs(part).length, 1);
  assert.strictEqual(g.openQuestions(part).length, 1);
});
