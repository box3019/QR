'use strict';
// Multi-part ZIP/RAR package: grouping, in-process RAR, material triage, package and per-part PDF. Synthetic archives only.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { pathToFileURL } = require('url');
const { expand } = require('../core/intake/expand.cjs');
const { extractArchive, ZIP_NEST_DEPTH, CACHE_MARKER } = require('../core/intake/archive.cjs');
const { partKeyFromName, groupFilesByPart, attachPackageFiles } = require('../core/intake/package.cjs');
const { buildZip } = require('./zipstore.cjs');
const { buildRar4, buildRar5 } = require('./rarstore.cjs');
const { reportHtml, packageReportHtml, listOf, isIncluded } = require('../core/report.cjs');
const P = require('../electron/qrPrint.cjs');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'qrt-pkg-')); }
function write(dir, name, buf) { const f = path.join(dir, name); fs.writeFileSync(f, buf); return f; }
const part = (o) => ({ partNo: '518310', rev: 'A', customer: 'RAFAEL', title: 'BRACKET', problems: [], tasks: [], route: [{ seq: '10', type: 'machining', title: 'MACHINE', items: [] }], material: { normalized: 'Aluminium 6061-T651', raw: 'ALUMINUM 6061-T651', source: 'title block' }, status: 'accepted', ...o });

test('part key groups RAFAEL drawing, STEP, PAS and MLED', () => {
  assert.equal(partKeyFromName('518310-A-PD-39-518310_A.pdf'), '518310');
  assert.equal(partKeyFromName('518310-A-PD-39-518310_A.step'), '518310');
  assert.equal(partKeyFromName('518310-A-PD-39-518310_A-pas.pdf'), '518310');
  assert.equal(partKeyFromName('518310_MLED.xls'), '518310');
  const g = groupFilesByPart(['a/518310-A-PD-39.pdf', 'a/518310-A-PD-39.step', 'b/999001-B-PD-1.pdf']);
  assert.equal(g.get('518310').length, 2);
  assert.equal(g.get('999001').length, 1);
});

test('attachPackageFiles puts matching files on the part', () => {
  const files = ['/x/518310-A-PD-39.pdf', '/x/518310-A-PD-39.step', '/x/518310_MLED.xls', '/x/other.txt'];
  const parts = [{ partNo: '518310', drawing: { name: '518310-A-PD-39.pdf' } }];
  attachPackageFiles(parts, files);
  assert.ok(parts[0].packageFiles.includes('518310-A-PD-39.step'));
  assert.ok(parts[0].packageFiles.includes('518310_MLED.xls'));
});

test('multi-part zip unpacks and groups by part number', async () => {
  const d = tmp(); const cache = path.join(d, 'cache');
  const outer = write(d, 'rafael.zip', buildZip([
    { name: '518310-A-PD-39.pdf', data: '%PDF-1.4 a' },
    { name: '518310-A-PD-39.step', data: 'ISO-10303-21;' },
    { name: '518310_MLED.xls', data: 'xls' },
    { name: '777001-A-PD-01.pdf', data: '%PDF-1.4 b' },
    { name: '777001-A-PD-01.step', data: 'ISO-10303-21;' },
  ]));
  const { files } = await expand([outer], path.join(d, 'work'), { importCache: cache });
  const names = files.map((f) => path.basename(f)).sort();
  assert.ok(names.includes('518310-A-PD-39.pdf') && names.includes('777001-A-PD-01.step'));
  const g = groupFilesByPart(files);
  assert.equal(g.get('518310').length, 3);
  assert.equal(g.get('777001').length, 2);
});

test('RAR4 and RAR5 unpack in-process like ZIP, including nested zip', async () => {
  const d = tmp(); const cache = path.join(d, 'cache');
  const nested = buildZip([{ name: 'inner.pdf', data: '%PDF-1.4 n' }]);
  const entries = [
    { name: '518310-A-PD-39.pdf', data: '%PDF-1.4 a' },
    { name: '518310-A-PD-39.step', data: 'ISO-10303-21;' },
    { name: 'more.zip', data: nested },
  ];
  const r4 = write(d, 'pack4.rar', buildRar4(entries));
  const r5 = write(d, 'pack5.rar', buildRar5(entries));
  for (const f of [r4, r5]) {
    const { files } = await expand([f], path.join(d, 'w-' + path.basename(f)), { importCache: cache });
    const names = files.map((x) => path.basename(x));
    assert.ok(names.includes('518310-A-PD-39.pdf'), path.basename(f) + ' pdf');
    assert.ok(names.includes('inner.pdf'), path.basename(f) + ' nested zip');
    assert.ok(!names.some((n) => /\.zip$/i.test(n)));
  }
  assert.ok(fs.existsSync(path.join(cache, fs.readdirSync(cache)[0], CACHE_MARKER)));
});

test('RAR zip-slip and damaged archives are rejected with a clear error', async () => {
  const d = tmp();
  const evil = write(d, 'slip.rar', buildRar4([{ name: '../evil.txt', data: 'nope' }]));
  await assert.rejects(() => extractArchive(evil, path.join(d, 'out')), /Unsafe path/);
  assert.ok(!fs.existsSync(path.join(d, 'evil.txt')));
  fs.writeFileSync(path.join(d, 'bad.rar'), Buffer.from('Rar!\x1a\x07\x00not-a-rar'));
  await assert.rejects(() => extractArchive(path.join(d, 'bad.rar'), path.join(d, 'o1')), /damaged or unreadable/);
});

test('RAR nest depth matches ZIP (3) and never calls 7z.exe', async () => {
  const d = tmp(); const cache = path.join(d, 'cache');
  let buf = buildZip([{ name: 'deep.pdf', data: 'deep' }]);
  for (let i = 3; i >= 1; i--) buf = buildRar4([{ name: 'n' + i + '.rar', data: buf }]);
  const outer = write(d, 'n0.rar', buf);
  const { files } = await expand([outer], path.join(d, 'work'), { importCache: cache });
  assert.ok(!files.some((f) => /deep\.pdf$/i.test(f)));
  assert.ok(files.some((f) => /\.rar$/i.test(f)));
  assert.equal(ZIP_NEST_DEPTH, 3);
  const srcA = src('core/intake/archive.cjs');
  const rarStart = srcA.indexOf('if (isRarName(file))');
  const rarFn = srcA.slice(rarStart, srcA.indexOf('await sevenZip(file, outDir', rarStart));
  assert.ok(!/sevenZip\(/.test(rarFn));
  assert.match(srcA, /node-unrar-js/);
  assert.match(srcA, /never WinRAR/);
});

test('material triage: suitable, not suitable, unknown, manual move', async () => {
  const t = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'parts', 'triage.mjs')).href);
  const al = part({});
  const st = part({ partNo: 'SS1', material: { raw: 'STAINLESS STEEL 316', normalized: 'Stainless steel 316', source: 'note 1' }, status: 'rejected' });
  const un = part({ partNo: 'U1', material: null, status: 'pending' });
  assert.equal(t.autoTriage(al), 'suitable');
  assert.equal(t.autoTriage(st), 'notSuitable');
  assert.equal(t.autoTriage(un), 'unknown');
  const moved = t.moveTriage(st, 'suitable');
  assert.equal(t.triageListOf(moved), 'suitable');
  assert.equal(t.triageReason(moved).moved, true);
  const lists = t.triageLists([al, st, un, moved]);
  assert.equal(lists.suitable.length, 2);
  assert.equal(lists.notSuitable.length, 1);
  assert.equal(lists.unknown.length, 1);
  assert.equal(t.isIncluded(al), true);
  assert.equal(t.isIncluded(st), false);
  assert.equal(t.isIncluded(t.setInclude(st, true)), true);
});

test('package report cover lists both groups, processed count, numbered suitable summaries only', () => {
  const parts = [
    part({ partNo: '518310' }),
    part({ partNo: 'SS1', material: { raw: 'STEEL 4140', normalized: 'Steel 4140', source: 'title block' }, status: 'rejected' }),
    part({ partNo: 'U1', material: null, status: 'pending' }),
  ];
  assert.equal(listOf(parts[0]), 'suitable');
  assert.equal(listOf(parts[1]), 'notSuitable');
  assert.equal(isIncluded(parts[1]), false);
  const html = reportHtml(parts, 'en', { rfq: 'PKG-1', customer: 'RAFAEL', package: true });
  assert.match(html, /Package report/);
  assert.match(html, /Cover list/);
  assert.match(html, /Processed 1 of 3/);
  assert.match(html, /Suitable/);
  assert.match(html, /Not suitable/);
  assert.match(html, /Material not detected - check/);
  assert.match(html, /518310/);
  assert.match(html, /Steel 4140/);
  assert.match(html, /title block/);
  assert.match(html, /Number 1/);
  const pack = packageReportHtml(parts, 'en', { rfq: 'PKG-1' });
  const nSec = (pack.match(/<section class="part">/g) || []).length;
  assert.equal(nSec, 1);
  const he = reportHtml(parts, 'he', { package: true, rfq: 'PKG-1' });
  assert.match(he, /דוח חבילה/);
  assert.doesNotMatch(he, /Suitable|Not suitable|Processed/);
});

test('per-part PDF file name is the part number; package print uses mode', () => {
  assert.equal(P.partPdfFileName({ partNo: '518310-A' }), '518310-A.pdf');
  assert.equal(P.partPdfFileName({ partNo: 'P1:A/B' }), 'P1_A_B.pdf');
  const parts = [part({}), part({ partNo: 'P2' })];
  assert.deepStrictEqual(P.partsForPrint(parts, 2, 1, { mode: 'package' }).map((x) => x.partNo), ['518310', 'P2']);
  assert.deepStrictEqual(P.partsForPrint(parts, 2, 1, { mode: 'part' }).map((x) => x.partNo), ['P2']);
  const name = P.reportPdfFileName({ parts, step: 2, sel: 0, mode: 'package', meta: { label: 'PKG-1' } }, new Date(2026, 10, 2));
  assert.match(name, /PKG-1_QR_report_2026-11-02\.pdf/);
  const one = reportHtml([parts[0]], 'en', {});
  assert.match(one, /Number 1/);
  assert.doesNotMatch(one, /Package report/);
  const proj = src('src/ProjectView.tsx');
  assert.match(proj, /step === 2 && !partOpen \? 'package'/);
  assert.match(proj, /mode: 'part'/);
  assert.match(proj, /mode: 'package'/);
  assert.match(proj, /savePdfEach/);
});

test('UI: triage, per-part Print/Save PDF, save each, RAR pick, version 0.1.11', () => {
  const tri = src('src/components/wizard/TriageView.tsx');
  assert.match(tri, /tri-print/);
  assert.match(tri, /tri-save/);
  assert.match(tri, /tri-save-each/);
  assert.match(tri, /top\.print/);
  assert.match(tri, /top\.savePdf/);
  assert.match(tri, /tri\.saveEach/);
  const step = src('src/components/wizard/StepCheckParts.tsx');
  assert.match(step, /TriageView/);
  const pre = src('electron/preload.cjs');
  assert.match(pre, /savePdfEach/);
  const main = src('electron/main.cjs');
  assert.match(main, /qr:savePdfEach/);
  assert.match(main, /partPdfFileName/);
  assert.match(main, /mode === 'package'/);
  const pkg = JSON.parse(src('package.json'));
  assert.equal(pkg.version, '0.1.11');
  assert.ok(pkg.dependencies['node-unrar-js']);
  const en = JSON.parse(src('src/i18n/en.json')); const he = JSON.parse(src('src/i18n/he.json'));
  for (const k of ['tri.suitable', 'tri.notSuitable', 'tri.unknown', 'tri.toSuit', 'tri.toNot', 'tri.saveEach', 'st.mat.shopHelp', 'pdf.savedEach']) {
    assert.ok(en[k] && he[k], k);
  }
  assert.equal(en['tri.saveEach'], 'Save each part as separate PDF');
  assert.doesNotMatch(en['tri.unknown'], /N\/A|TBD|n\/a/);
  const st = src('src/settings/SettingsDialog.tsx');
  assert.match(st, /st\.mat\.shopHelp/);
});
