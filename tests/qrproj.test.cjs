'use strict';
// .qrproj round trip: Save as -> Open gives back the same project (state, Hebrew text, every file byte for byte); damaged and unsafe files are refused.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path'); const crypto = require('crypto');
const Q = require('../core/qrproj.cjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'qrq-')); const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function fixture() {
  const d = tmp(); const pdf = path.join(d, 'XY10001A rev A.pdf'); const pdf2 = path.join(d, 'sub', 'שרטוט ב.pdf'); const step = path.join(d, 'XY10001A.step');
  fs.mkdirSync(path.dirname(pdf2)); fs.writeFileSync(pdf, crypto.randomBytes(5000)); fs.writeFileSync(pdf2, Buffer.concat([Buffer.alloc(9000, 7), crypto.randomBytes(100)])); fs.writeFileSync(step, 'ISO-10303-21;\nEND-ISO-10303-21;\n');
  const state = { step: 2, sel: 1, tab: 'drawing', dirty: true, savedAt: '2026-10-28T09:05:00.000Z', unknown: ['spec.pdf'],
    lastRun: { seconds: 12.5, files: ['XY10001A rev A.pdf', 'שרטוט ב.pdf'] }, rfqs: [{ rfq_no: '701751', customer: 'TEST', mail_key: 'mid:abc', subject: 'RFQ 701751 – בדיקה' }],
    parts: [{ id: 'part1', partNo: 'XY10001A', rev: 'A', title: 'ברקט', drawing: { path: pdf, name: path.basename(pdf), pages: [{ n: 1, width: 1500 }] }, model: { path: step, units: 'mm' }, problems: [], material: { normalized: 'Aluminium 6061-T651', qty: 0.5, parsed: null } },
             { id: 'part2', partNo: 'ZZ2', rev: 'B', drawing: { path: pdf2, name: 'שרטוט ב.pdf' }, model: null, notes: [], again: { drawing: pdf } }] };
  return { d, pdf, pdf2, step, state };
}
const norm = (v, base) => JSON.parse(JSON.stringify(v), (k, x) => (typeof x === 'string' && x.startsWith(base) ? '<P>/' + x.slice(base.length + 1).replace(/\\/g, '/') : x));
test('bundle: each existing file once, paths become markers, missing files stay as they are', () => {
  const f = fixture(); const b = Q.bundle({ ...f.state, gone: path.join(f.d, 'nope.pdf') });
  assert.strictEqual(b.files.length, 3); assert.deepStrictEqual(b.missing, [path.join(f.d, 'nope.pdf')]);
  assert.ok(b.state.parts[0].drawing.path.startsWith(Q.MARK + 'files/0001/')); assert.strictEqual(b.state.parts[1].again.drawing, b.state.parts[0].drawing.path, 'same file, same marker');
  assert.strictEqual(b.state.parts[0].drawing.name, 'XY10001A rev A.pdf', 'plain names are not paths'); assert.strictEqual(JSON.stringify(b.state).includes(f.d.replace(/\\/g, '\\\\')), JSON.stringify(b.state).includes(path.join(f.d, 'nope.pdf').replace(/\\/g, '\\\\')));
});
test('round trip: state identical, Hebrew intact, files byte for byte, project is self-contained', async () => {
  const f = fixture(); const out = path.join(tmp(), 'RFQ 701751.qrproj'); const r = Q.exportProject(f.state, out, { id: 'p1-abc', label: '701751', appVersion: '0.1.5' });
  assert.strictEqual(r.files, 3); assert.ok(fs.statSync(out).size > 100 && r.missing.length === 0);
  fs.rmSync(f.d, { recursive: true, force: true }); // the originals are gone: the .qrproj carries everything
  const dest = tmp(); const o = await Q.importProject(out, dest);
  assert.strictEqual(o.files, 3); assert.strictEqual(o.manifest.project.label, '701751'); assert.strictEqual(o.manifest.format, 'qrproj');
  const p0 = o.state.parts[0]; const p1 = o.state.parts[1];
  assert.ok(p0.drawing.path.startsWith(dest) && fs.existsSync(p0.drawing.path)); assert.strictEqual(path.basename(p1.drawing.path), 'שרטוט ב.pdf');
  assert.strictEqual(p0.drawing.path, p1.again.drawing); assert.strictEqual(fs.readFileSync(p0.model.path, 'utf8'), 'ISO-10303-21;\nEND-ISO-10303-21;\n');
  assert.strictEqual(fs.readFileSync(p1.drawing.path).length, 9100);
  const expect = fixture().state; // same shape, other paths: compare everything except paths
  for (const k of ['step', 'sel', 'tab', 'dirty', 'savedAt', 'unknown', 'lastRun', 'rfqs']) assert.deepStrictEqual(o.state[k], f.state[k], k);
  assert.deepStrictEqual(norm({ ...o.state, parts: [] }, dest), norm({ ...f.state, parts: [] }, 'zzz'));
  assert.strictEqual(p0.title, 'ברקט'); assert.strictEqual(o.state.rfqs[0].subject, 'RFQ 701751 – בדיקה'); assert.deepStrictEqual(p0.material, f.state.parts[0].material); assert.deepStrictEqual(p0.drawing.pages, [{ n: 1, width: 1500 }]);
  // saving the imported project again gives the same files and the same state
  const out2 = path.join(tmp(), 'again.qrproj'); Q.exportProject(o.state, out2, {}); const o2 = await Q.importProject(out2, tmp());
  assert.deepStrictEqual(o2.manifest.files.map((x) => [x.name, x.sha256]), o.manifest.files.map((x) => [x.name, x.sha256]));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(o2.state), (k, x) => x), o2.state); assert.strictEqual(o2.state.parts[1].partNo, 'ZZ2');
  assert.strictEqual(sha(p0.drawing.path), o.manifest.files[0].sha256);
});
test('a damaged project file is refused, not half opened', async () => {
  const f = fixture(); const out = path.join(tmp(), 'a.qrproj'); Q.exportProject(f.state, out, {});
  const buf = fs.readFileSync(out); const bad = Buffer.from(buf); bad[Math.floor(bad.length / 2)] ^= 0xff; const p = path.join(tmp(), 'bad.qrproj'); fs.writeFileSync(p, bad);
  await assert.rejects(() => Q.importProject(p, tmp()), /Not a QR project|damaged|incomplete|invalid|CRC|inflate/i);
  fs.writeFileSync(p, 'this is not a zip'); await assert.rejects(() => Q.importProject(p, tmp()), /Not a QR project file/);
});
test('zip-slip and foreign zips are refused', async () => {
  const w = (name, files) => { const p = path.join(tmp(), name); Q.writeZip(p, files); return p; }; const B = (o) => Buffer.from(JSON.stringify(o));
  const sh = crypto.createHash('sha256').update('x').digest('hex'); const mk = (rel, entry) => w('evil.qrproj', [{ name: 'manifest.json', data: B({ format: 'qrproj', version: 1, files: [{ rel, name: 'e', sha256: sh }] }) }, { name: 'project.json', data: B({}) }, ...(entry ? [{ name: entry, data: Buffer.from('x') }] : [])]);
  const dest = tmp(); await assert.rejects(() => Q.importProject(mk('files/0001/../../evil.txt', null), dest), /Unsafe path/); await assert.rejects(() => Q.importProject(mk('../../evil.txt', null), dest), /Unsafe path/); await assert.rejects(() => Q.importProject(mk('/abs/evil.txt', null), dest), /Unsafe path/);
  await assert.rejects(() => Q.importProject(mk('files/0001/../../evil.txt', 'files/0001/../../evil.txt'), dest), /Not a QR project|invalid relative path|Unsafe/); assert.ok(!fs.existsSync(path.join(dest, '..', 'evil.txt')));
  await assert.rejects(() => Q.importProject(w('other.qrproj', [{ name: 'manifest.json', data: B({ format: 'other' }) }, { name: 'project.json', data: B({}) }]), tmp()), /wrong format/);
  await assert.rejects(() => Q.importProject(w('new.qrproj', [{ name: 'manifest.json', data: B({ format: 'qrproj', version: 9 }) }, { name: 'project.json', data: B({}) }]), tmp()), /newer QR/);
  await assert.rejects(() => Q.importProject(w('none.qrproj', [{ name: 'x.txt', data: Buffer.from('1') }]), tmp()), /Not a QR project file/);
});
test('the zip is a standard zip (crc32 known value, tar can list it)', () => {
  assert.strictEqual(Q.crc32(Buffer.from('123456789')), 0xcbf43926);
  const f = fixture(); const out = path.join(tmp(), 's.qrproj'); Q.exportProject(f.state, out, {});
  const r = require('child_process').spawnSync('tar', ['-tf', out], { encoding: 'utf8' }); if (r.error || r.status !== 0) return; // no system tar: skip
  assert.match(r.stdout, /manifest\.json/); assert.match(r.stdout, /project\.json/); assert.match(r.stdout, /files\/0001\//);
});
