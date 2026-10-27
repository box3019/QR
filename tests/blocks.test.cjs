'use strict';
// Part card blocks: order, one action, no duplicates, bidi isolation, leading zeros, tiles filter, i18n coverage.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const { pathToFileURL } = require('url');
const load = (...p) => import(pathToFileURL(path.join(__dirname, '..', 'src', ...p)).href);
const en = require('../src/i18n/en.json'), he = require('../src/i18n/he.json');
const M = require('../core/i18n/messages.cjs'); const { lz, parseThread } = require('../core/standards/threads.cjs');

const pg = { page: 1, material: { family: 'Aluminum', alloy: '6061', temper: 'T6', form: 'bar' }, procs: [{ process: 'Coating', subtype: 'Anodize', flags: 'NO STANDARD', stds: '' }], summary: { coatings: 'Anodize' }, rows: [1] };
const part = {
  partNo: 'A-1', rev: 'B', drawing: { pages: [] }, requirements: [pg], status: 'accepted', tasks: [],
  standards: [
    { id: 'S1', std: 'AS5202', dash: '06', status: 'resolved', flags: [], dims: { A: { in: '0.3750', mm: 9.525 } }, doc: null },
    { id: 'S2', std: 'MS33649', dash: '08', status: 'resolved', flags: [{ type: 'size', drawing: '0.3750-24 UNJF-3B', required: '0.5000-20 UNJF-3B' }], dims: null },
    { id: 'S3', std: 'AS5857', dash: '', status: 'needsDoc', flags: [] },
    { id: 'S4', std: 'AS568', dash: '210', status: 'needsConfirm', flags: [] },
  ],
  problems: [
    { id: 'P1', severity: 'Question', status: 'open', key: 'std.thread', message: 'x' },
    { id: 'P2', severity: 'Question', status: 'open', key: 'std.kit.insert', message: 'y' },
    { id: 'P3', severity: 'Info', status: 'open', key: 'std.newer', message: 'z' },
  ],
};
const mod = () => load('parts', 'blocks.mjs');
const find = (it) => (b) => b.id === it;

test('blocks: action-needed first, green after, grey last', async () => {
  const { buildBlocks, STATUS_ORDER } = await mod(); const b = buildBlocks(part);
  const o = b.map((x) => STATUS_ORDER[x.status]); assert.deepStrictEqual(o, [...o].sort((x, y) => x - y));
  assert.strictEqual(b[0].status, 'bad'); assert.strictEqual(b[b.length - 1].status, 'none');
  assert.strictEqual(b.filter((x) => x.kind === 'none').length, 1, 'all "not on drawing" fields in ONE block');
});
test('blocks: one block per standard and per present field, at most ONE action each', async () => {
  const { buildBlocks } = await mod(); const b = buildBlocks(part);
  assert.strictEqual(b.filter((x) => x.kind === 'standard').length, 4);
  assert.ok(b.find((x) => x.id === 'f:1:material' && x.status === 'ok')); assert.ok(b.find((x) => x.id === 'f:1:coatings' && x.status === 'warn'));
  for (const x of b) assert.ok(x.action === null || typeof x.action.kind === 'string');
  const by = Object.fromEntries(b.filter((x) => x.kind === 'standard').map((x) => [x.std.std, x]));
  assert.strictEqual(by.MS33649.status, 'bad'); assert.strictEqual(by.MS33649.action.kind, 'ask');
  assert.strictEqual(by.AS5857.status, 'warn'); assert.strictEqual(by.AS5857.action.kind, 'upload');
  assert.strictEqual(by.AS568.action.kind, 'confirm'); assert.strictEqual(by.AS5202.status, 'ok'); assert.strictEqual(by.AS5202.action, null);
  assert.strictEqual(b.find((x) => x.id === 'f:1:coatings').action.kind, 'upload', 'no standard named -> upload');
});
test('blocks: each mismatch appears once (std.thread problem is not repeated in the questions block)', async () => {
  const { buildBlocks } = await mod(); const q = buildBlocks(part).find((x) => x.kind === 'questions');
  assert.strictEqual(q.line.vars.n, 1); assert.ok(q.details.list.every((p) => p.key !== 'std.thread'));
  const std = buildBlocks(part).find((x) => x.std && x.std.std === 'MS33649'); assert.strictEqual(std.details.flags.length, 1);
});
test('blocks: all good part shows no action blocks', async () => {
  const { buildBlocks, allGood } = await mod();
  const ok = buildBlocks({ ...part, standards: [part.standards[0]], problems: [], requirements: [{ ...pg, procs: [{ process: 'Coating', subtype: 'Anodize', flags: '', stds: 'MIL-A-8625' }] }] });
  assert.ok(allGood(ok)); assert.ok(!allGood(buildBlocks(part)));
});
test('blocks: missing material is a question block, not "not on drawing"', async () => {
  const { buildBlocks } = await mod(); const b = buildBlocks({ ...part, requirements: [{ ...pg, material: null }], standards: [], problems: [] });
  const m = b.find((x) => x.id === 'f:material'); assert.strictEqual(m.status, 'warn'); assert.strictEqual(m.action.kind, 'ask');
  const none = b.find((x) => x.kind === 'none'); assert.ok(!none.line.vars.list.includes('bd.s.material'));
});
test('tiles: counts and filter', async () => {
  const g = await load('parts', 'groups.mjs'); const ps = [{ problems: [], tasks: [] }, { problems: [], tasks: [] }, { problems: [], tasks: [{ type: 'uploadDocument', status: 'open' }] }, { status: 'rejected', problems: [], tasks: [] }];
  assert.deepStrictEqual(g.tileCounts(ps), { ready: 2, needsDoc: 1, needsAnswer: 0, notOurs: 1 });
  assert.deepStrictEqual(g.filterGroups(g.groupParts(ps), 'needsDoc').map((x) => x.key), ['needsDoc']); assert.strictEqual(g.filterGroups(g.groupParts(ps), null).length, 3);
  assert.deepStrictEqual(Object.values(g.DOT).sort(), ['bad', 'ok', 'warn', 'warn']);
});
test('bidi: HE flag line is label first, every code token isolated LTR', () => {
  const r = M.render('std.thread', { std: 'MS33649-08', drawing: '0.3750-24 UNJF-3B', required: '0.5000-20 UNJF-3B', what: 'size' }, 'he').message;
  assert.match(r, /^\u2066MS33649-08\u2069: גודל: \u20660\.3750-24 UNJF-3B\u2069 ← \u20660\.5000-20 UNJF-3B\u2069$/);
  const e = M.render('std.thread', { std: 'MS33649-08', drawing: 'a', required: 'b', what: 'size' }, 'en').message; assert.match(e, /^MS33649-08: size: a → b$/);
  for (const k of ['std.kit.fitting', 'std.kit.insert', 'std.kit.oring']) { const s = M.render(k, { std: 'MS33649-08' }, 'he').message; assert.ok(s.includes('\u2066MS33649-08\u2069'), k); }
});
test('leading zeros: .3750 is always 0.3750; thread raw is normalised', () => {
  assert.strictEqual(lz('.3750'), '0.3750'); assert.strictEqual(lz('1.250'), '1.250'); assert.strictEqual(lz('0.332'), '0.332'); assert.strictEqual(lz('.375-24'), '0.375-24');
  assert.match(parseThread('.3750-24 UNJF-3B').raw, /^0\.3750-24 UNJF-3B$/);
});
test('UI: code tokens go through <bdi dir="ltr"> (.qr-code isolate); no banner; no repeated not-in-drawing text', () => {
  const b = fs.readFileSync(path.join(__dirname, '..', 'src/components/partcard/BlockCard.tsx'), 'utf8'); const c = fs.readFileSync(path.join(__dirname, '..', 'src/components/partcard/PartCard.tsx'), 'utf8');
  assert.match(b, /<bdi dir="ltr" className="qr-code">/); assert.doesNotMatch(c, /card-flags/); assert.doesNotMatch(c, /bd\.notOn/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src/styles/system.css'), 'utf8'), /\.qr-code \{ direction: ltr; unicode-bidi: isolate; \}/);
});
test('i18n: every blk./tile./std.dim. key exists in EN and HE; HE has no Latin letters', () => {
  for (const k of Object.keys(en).filter((x) => /^(blk|tile)\./.test(x))) { assert.ok(he[k], k); assert.doesNotMatch(he[k].replace(/\{[^}]+\}/g, ''), /[A-Za-z]/, k); }
  const src = ['src/components/partcard/BlockCard.tsx', 'src/parts/blocks.mjs', 'src/ui/Tiles.tsx', 'src/views/Parts.tsx'].map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  for (const m of src.matchAll(/'((?:blk|tile|tip\.blk)\.[A-Za-z]+(?:\.[A-Za-z]+)*)'/g)) { assert.ok(en[m[1]] && he[m[1]], m[1]); }
});

test('HE customer letter uses the localized message with isolates (no English leak)', () => {
  const { buildQuestions } = require('../core/questions.cjs');
  const part = { partNo: 'X', rev: 'A', tasks: [], problems: [{ severity: 'Question', status: 'open', message: 'AS5202-03: size: a → b', suggestion: 'Ask', messageHe: 'AS5202-03: גודל', suggestionHe: 'לשאול' }] };
  const q = buildQuestions([part], 'he')[0].questions[0].text;
  assert.match(q, /גודל/); assert.doesNotMatch(q, /size/);
});
