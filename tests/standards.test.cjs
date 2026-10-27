'use strict';
// Item F: standards library — detect, threads, tables, store, resolve, attach (tasks + questions), export copy.
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path'); const os = require('os');
const D = path.join(__dirname, '..', 'core', 'standards');
const { detectCallouts } = require(D + '/detect.cjs');
const { parseThread, compareThreads } = require(D + '/threads.cjs');
const { bundledRow } = require(D + '/tables.cjs');
const { openStore } = require(D + '/store.cjs');
const S = require(D + '/index.cjs');
const { problem } = require('../core/i18n/messages.cjs');
const J = (f) => JSON.parse(fs.readFileSync(path.join(D, 'data', f), 'utf8'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'qrstd'));

test('every table records source and revision, no PDFs bundled', () => {
  for (const f of fs.readdirSync(path.join(D, 'data'))) { assert.match(f, /\.json$/); const t = J(f); assert.ok(t.source, f); assert.ok(t.rev, f); }
});
test('AS5202 table: 19 sizes, dash 03 spot values', () => {
  const r = bundledRow('AS5202', '03'); assert.ok(r, 'row 03'); assert.match(JSON.stringify(r), /3750-24-UNJF/);
  assert.ok(Object.keys(J('as5202.json').rows || J('as5202.json')).length >= 19 || (J('as5202.json').rows || []).length >= 19);
});
test('AS568 table: all dash sizes, spot values, all cross-checked', () => {
  const t = J('as568.json'); const n = Object.keys(t.rows).length; assert.ok(n >= 390, String(n));
  assert.deepStrictEqual(t.rows['012'], { ID: '0.364', IDtol: '0.005', CS: '0.070', CStol: '0.003' });
  assert.strictEqual(t.rows['214'].ID, '0.984'); assert.strictEqual(t.rows['214'].CS, '0.139');
  assert.strictEqual(t.rows['325'].CS, '0.210'); assert.strictEqual(t.rows['475'].ID, '25.940');
  assert.ok(Object.values(t.rows).every((r) => r.verified !== false));
});
test('M83248/1 uses AS568 sizes under its own id', () => { const r = bundledRow('M83248/1', '906'); assert.ok(r); assert.strictEqual(r.dims.ID.in, '0.468'); });
test('UN tap table and ISO M table', () => {
  const u = J('un_tap.json'); assert.ok(Object.keys(u.rows).length >= 50);
  const q = Object.values(u.rows).find((r) => r.majorIn === 0.25 && r.tpi === 20); assert.ok(q); assert.strictEqual(q.series, 'UNC'); assert.ok(Math.abs(q.basicMinorIn - 0.1959) < 0.001);
  const m = J('iso_m.json').rows; assert.strictEqual(m['M6x1'].tapDrill, 5); assert.strictEqual(m['M10x1.5'].coarse, true); assert.ok(Math.abs(m['M8x1.25'].D1 - 6.647) < 0.001);
});
test('detect callouts', () => {
  const c = detectCallouts('PORT PER AS5202-03\nO-RING AS568-012\nM83248/1-906\nINSERT MS51830-202\nHELICOIL NASM21209C4-10\n1/4-28 UNJF-3B\nM6x1-6H');
  const kinds = c.map((x) => x.kind); for (const k of ['port', 'oring', 'insert-key', 'insert-coil', 'thread']) assert.ok(kinds.includes(k), k);
});
test('threads: parse and UNF vs UNJF 3B flag', () => {
  const a = parseThread('.4375-20 UNF-2B'); const b = parseThread('.4375-20 UNJF-3B'); assert.ok(a && b);
  const f = compareThreads(a, b).map((x) => x.type); assert.ok(f.includes('series')); assert.ok(f.includes('class'));
  assert.ok(Math.abs(parseThread('M6x1').pitch - 1) < 1e-9);
});
test('store: once per checksum, customer scope first, confirm remembered', () => {
  const b = tmp(); const st = openStore(b); const f = path.join(b, 'x.pdf'); fs.writeFileSync(f, 'abc');
  const e1 = st.putDoc({ id: 'ABC-1', rev: 'B', customer: 'KLA', file: f }); const e2 = st.putDoc({ id: 'ABC-1', rev: 'B', customer: 'KLA', file: f });
  assert.ok(e2.reused); assert.strictEqual(fs.readdirSync(path.join(b, 'library', 'blobs')).length, 1);
  assert.ok(st.findDoc('ABC-1', 'KLA')); assert.ok(!st.findDoc('ABC-1', 'ELTA'));
  st.confirm('AS568', '012', '', { ID: 1 }, { source: 'library' }); assert.ok(openStore(b).getResolution('AS568', '012', ''));
});
test('attach: resolved port with flags, needsDoc tasks, kit questions', async () => {
  const part = { partNo: 'P1', customer: 'KLA', problems: [], tasks: [] };
  const out = await S.attachStandards(part, 'PORT AS5202-03 .4375-20 UNF-2B\nINSERT NASM33537-202', { base: tmp(), problem });
  const port = out.find((r) => r.std === 'AS5202'); assert.strictEqual(port.status, 'resolved');
  assert.ok(part.problems.some((p) => p.key === 'std.kit.fitting'));
  assert.ok(part.tasks.some((t) => t.std && t.type === 'uploadDocument'));
});
test('export copies linked docs once', () => {
  const b = tmp(); const f = path.join(b, 'a.pdf'); fs.writeFileSync(f, 'x');
  const out = require(D + '/export.cjs').copyStandardDocs([{ standards: [{ std: 'AS568', doc: { file: f, rev: 'D' } }, { std: 'AS568', doc: { file: f, rev: 'D' } }] }], path.join(b, 'out'));
  assert.strictEqual(out.length, 1);
});
test('report has a standards section', () => {
  const h = require('../core/report.cjs').reportHtml([{ partNo: 'P', standards: [{ std: 'AS568', dash: '012', status: 'resolved', dims: { ID: { mm: 9.246, in: '0.364' } }, flags: [] }], problems: [], tasks: [] }], 'en');
  assert.match(h, /Standards/); assert.match(h, /9\.246 mm/);
});
test('Keensert MS51830 table: cross-checked rows and unverified single-source rows', () => {
  const r = bundledRow('MS51830', '202'); assert.ok(r); assert.strictEqual(r.verified, true); assert.strictEqual(r.dims.tapDrill.in, '.332'); assert.strictEqual(r.dims.csk.in, '.385');
  const u = bundledRow('MS51830', '108'); assert.ok(u); assert.strictEqual(u.verified, false);
  assert.strictEqual(Object.keys(J('ms51830.json').rows).length, 16);
});
test('Helicoil STI table: agreeing rows verified, differing rows not', () => {
  const { stiRow } = require(D + '/tables.cjs');
  const a = stiRow('1/4-20 UNC'); assert.strictEqual(a.verified, true); assert.strictEqual(a.dims.drillIn.in, '0.2656');
  assert.strictEqual(stiRow('1/4-28 UNF').verified, false); assert.strictEqual(Object.keys(J('helicoil_sti.json').rows).length, 23);
});
test('Helicoil callout resolves STI hole by thread on the same line', async () => {
  const part = { partNo: 'P2', customer: 'X', problems: [], tasks: [] };
  const out = await S.attachStandards(part, 'INSTALL HELICOIL MS21209C1/4-20 UNC', { base: tmp(), problem });
  const h = out.find((r) => r.kind === 'insert-coil'); assert.ok(h); assert.ok(h.dims && h.dims.drillIn, JSON.stringify(h));
});
test('UNJ and MJ minor diameters are computed and labeled', () => {
  const q = Object.values(J('un_tap.json').rows).find((r) => r.majorIn === 0.25 && r.tpi === 20); assert.ok(Math.abs(q.unjMinorMinIn - 0.2013) < 0.0002);
  const m = J('iso_m.json').rows['M6x1']; assert.ok(Math.abs(m.mjD1min - 5.026) < 0.001); assert.strictEqual(m.mjVerified, false);
});
test('UNF vs UNJF is flagged even when the size differs too', () => {
  const f = compareThreads(parseThread('.4375-20 UNF-2B'), parseThread('.3750-24 UNJF-3B')).map((x) => x.type);
  assert.ok(f.includes('size')); assert.ok(f.includes('series')); assert.ok(f.includes('class'));
});
test('table extraction from uploaded text, stored and used for the next drawing', async () => {
  const rows = S.extractTables('TABLE 1\n-012  .364  .005  .070  .003\n  13 .426 .005 .070 .003\nNOTES 1 2'); assert.deepStrictEqual(Object.keys(rows).sort(), ['012', '13']); assert.strictEqual(rows['012'].c1, '.364');
  const b = tmp(); const f = path.join(b, 'XYZ-100.pdf'); fs.writeFileSync(f, 'x');
  const e = await S.uploadStandard(b, { id: 'XYZ-100', rev: 'C', customer: 'ACME', file: f }, async () => '07 .5 .25\n');
  assert.strictEqual(e.tableRows, 1); assert.ok(openStore(b).getTable('XYZ-100', 'ACME'));
});
