'use strict';
// History of the last 20 projects: newest first, 21st drops the oldest from the list but keeps its data; search; Step 1 recent 5.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path'); const { pathToFileURL } = require('url');
const H = require('../core/history.cjs'); const P = require('../core/projects.cjs');
const imp = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'projects', 'history.mjs')).href);
const e = (i, o = {}) => ({ id: 'p' + String(i).padStart(4, '0'), label: 'RFQ' + i, customer: i % 2 ? 'KLA' : 'RAFAEL', nParts: 2, groups: { ready: 1, needsDoc: 1 }, step: 2, partNos: ['PN' + i], opened: new Date(2026, 9, 27, 10, i).toISOString(), ...o });
test('21st entry drops the oldest from the list; its project data stays on disk', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qrh-'));
  for (let i = 1; i <= 21; i++) { P.saveProject(base, e(i).id, { step: 2, parts: [] }); const r = H.touchHistory(base, e(i)); if (i === 21) assert.deepStrictEqual(r.dropped, [e(1).id]); }
  const l = H.readHistory(base); assert.strictEqual(l.length, 20); assert.strictEqual(l[0].id, e(21).id); assert.ok(!l.some((x) => x.id === e(1).id));
  assert.ok(fs.existsSync(path.join(base, 'projects', e(1).id, 'project.json'))); assert.deepStrictEqual(H.loadProject(base, e(1).id), { step: 2, parts: [] });
});
test('reopening moves it to the top without duplicates', () => { const r = H.upsert([e(1), e(2), e(3)], e(3, { step: 4 })); assert.deepStrictEqual(r.list.map((x) => x.id), [e(3).id, e(1).id, e(2).id]); assert.strictEqual(r.list[0].step, 4); });
test('Remove from history keeps the data unless the user chose to delete it', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qrh-')); for (const i of [1, 2]) { P.saveProject(base, e(i).id, { step: 1 }); H.touchHistory(base, e(i)); }
  H.removeHistory(base, e(1).id, false); assert.ok(fs.existsSync(path.join(base, 'projects', e(1).id)));
  H.removeHistory(base, e(2).id, true); assert.ok(!fs.existsSync(path.join(base, 'projects', e(2).id))); assert.strictEqual(H.readHistory(base).length, 0);
  assert.throws(() => H.removeHistory(base, '../x', true));
});
test('search by RFQ, part number or customer; recent 5 with parts only', async () => {
  const m = await imp(); const l = [1, 2, 3, 4, 5, 6, 7].map((i) => e(i)); l.push(e(8, { nParts: 0 }));
  assert.deepStrictEqual(m.filterHistory(l, 'rfq3').map((x) => x.label), ['RFQ3']); assert.deepStrictEqual(m.filterHistory(l, 'pn5').map((x) => x.label), ['RFQ5']);
  assert.strictEqual(m.filterHistory(l, 'rafael').length, 4); assert.strictEqual(m.filterHistory(l, '').length, 8);
  assert.strictEqual(m.recent([e(8, { nParts: 0 }), ...l]).length, 5); assert.ok(!m.recent([e(8, { nParts: 0 })]).length);
});
test('entry: groups summary, step, part numbers', async () => {
  const m = await imp(); const parts = [{ partNo: 'A', problems: [], tasks: [] }, { partNo: 'B', problems: [], tasks: [{ type: 'uploadDocument', status: 'open' }] }];
  const x = m.historyEntry('p0001', { label: 'BQ64023A', customer: 'RAFAEL', step: 3 }, parts, 'T'); assert.deepStrictEqual(x.groups, { ready: 1, needsDoc: 1 }); assert.strictEqual(x.step, 3); assert.deepStrictEqual(x.partNos, ['A', 'B']);
  assert.ok(m.changed(null, x)); assert.ok(!m.changed(x, { ...x })); assert.ok(m.changed(x, { ...x, step: 4 }));
});
test('History button, dialog and recent list: tooltips, EN/HE, HE without Latin', () => {
  const en = require('../src/i18n/en.json'), he = require('../src/i18n/he.json'); const ks = Object.keys(en).filter((k) => k.startsWith('hist.')).concat(['top.history', 'tip.history']);
  for (const k of ks) { assert.ok(he[k], k); assert.doesNotMatch(he[k].replace(/\{\w+\}/g, ''), /[A-Za-z]/, k); }
  for (const f of ['HistoryDialog.tsx', 'RecentList.tsx']) { const s = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'history', f), 'utf8'); for (const b of s.match(/<button[^>]*>/g)) assert.match(b, /title=/, b); }
});
