'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { questionsHtml, questionsText, sampleQuestion } = require('../core/questions.cjs');
const part = { partNo: 'X1', rev: 'A', customer: 'RAFAEL', problems: [
  { severity: 'Blocker', category: 'Material', message: 'Aluminium 5052-H32 is not in the materials list — "AL 5052-H32" (title block).', status: 'open' },
  { severity: 'Question', category: 'Process', message: 'DLC coating "DLC" (note 9) — not in the processes list.', status: 'open', internal: true },
  { severity: 'Question', category: 'Threads', message: 'Insert quantity 10 in the table, 8 holes on the view.', status: 'open' }], tasks: [] };
test('Hebrew export: RTL, translated, internal process problems excluded', () => {
  const h = questionsHtml([part], 'he');
  assert.match(h, /dir="rtl"/); assert.match(h, /שאלות ללקוח/); assert.match(h, /אינו בין החומרים/); assert.match(h, /כמות האינסרטים/);
  assert.doesNotMatch(h, /DLC/);
  assert.match(questionsText([part], 'he'), /^מק"ט X1/);
  assert.match(questionsHtml([part], 'en'), /dir="ltr"/);
  assert.match(sampleQuestion('he'), /[\u0590-\u05FF]/); assert.match(sampleQuestion('en'), /^Insert quantity/);
});
