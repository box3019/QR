'use strict';
// Direct ZIP import: synthetic archives only (nested zip, data/files, Hebrew names, zip-slip, corrupt). No customer data.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { expand, sourceLabel } = require('../core/intake/expand.cjs');
const { extractArchive, decodeZipName, safeJoin, ZIP_NEST_DEPTH, CACHE_MARKER } = require('../core/intake/archive.cjs');
const { buildZip } = require('./zipstore.cjs');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'qrt-zip-')); }
function writeZip(dir, name, entries) { const f = path.join(dir, name); fs.writeFileSync(f, buildZip(entries)); return f; }

test('.ZIP is an archive regardless of case', () => {
  const { fileKind } = require('../core/intake/classify.cjs');
  assert.equal(fileKind('5799891_1_PRODUCT.ZIP'), 'archive');
  assert.equal(fileKind('pack.zip'), 'archive');
});

test('data/files layout and nested zip unpack in-process', async () => {
  const d = tmp(); const cache = path.join(d, 'cache'); const work = path.join(d, 'work');
  const nested = buildZip([{ name: 'Report_H9546.pdf', data: '%PDF-1.4 nested' }]);
  const outer = writeZip(d, '5799891_1_PRODUCT.ZIP', [
    { name: 'data/files/part-A.pdf', data: '%PDF-1.4 drawing' },
    { name: 'data/files/part-A.step', data: 'ISO-10303-21;' },
    { name: 'data/files/part-A.pas', data: 'pas' },
    { name: 'data/files/part_MLED.xls', data: 'xls' },
    { name: 'data/files/Report_H9546.zip', data: nested },
  ]);
  const { files, sources } = await expand([outer], work, { importCache: cache });
  const names = files.map((f) => path.basename(f)).sort();
  assert.ok(names.includes('part-A.pdf'));
  assert.ok(names.includes('part-A.step'));
  assert.ok(names.includes('part-A.pas'));
  assert.ok(names.includes('part_MLED.xls'));
  assert.ok(names.includes('Report_H9546.pdf'));
  assert.ok(!names.some((n) => /\.zip$/i.test(n)), 'nested zip itself is unpacked, not listed');
  const pdf = files.find((f) => /part-A\.pdf$/i.test(f));
  const src = sources.get(pdf);
  assert.ok(src.label.includes('5799891_1_PRODUCT.ZIP'));
  assert.ok(src.label.includes('data') && src.label.includes('part-A.pdf'));
  assert.ok(src.label.includes(' > '));
  assert.strictEqual(sourceLabel(['a.ZIP'], 'data/files/x.pdf').includes(' > '), true);
  assert.ok(fs.existsSync(path.join(cache, fs.readdirSync(cache)[0], CACHE_MARKER)));
});

test('Hebrew UTF-8 and CP862 entry names', async () => {
  const d = tmp(); const cache = path.join(d, 'cache');
  const utf = writeZip(d, 'he-utf.zip', [{ name: 'שרטוט.pdf', data: '%PDF-1.4', utf8: true }]);
  const dos = writeZip(d, 'he-dos.zip', [{ name: 'שרטוט.pdf', data: '%PDF-1.4', cp862: true }]);
  const a = await expand([utf], path.join(d, 'w1'), { importCache: cache });
  const b = await expand([dos], path.join(d, 'w2'), { importCache: cache });
  assert.ok(a.files.some((f) => path.basename(f) === 'שרטוט.pdf'), a.files.map((f) => path.basename(f)).join(','));
  assert.ok(b.files.some((f) => path.basename(f) === 'שרטוט.pdf'), b.files.map((f) => path.basename(f)).join(','));
  const buf = Buffer.from([0x80, 0x81, 0x82]); // alef bet gimel in CP862
  assert.ok(decodeZipName(buf, 0, []).startsWith('א'));
});

test('zip-slip paths are rejected', async () => {
  const d = tmp();
  const evil = writeZip(d, 'slip.zip', [{ name: '../evil.txt', data: 'nope' }]);
  await assert.rejects(() => extractArchive(evil, path.join(d, 'out')), /Unsafe path/);
  assert.ok(!fs.existsSync(path.join(d, 'evil.txt')));
  assert.throws(() => safeJoin(path.join(d, 'out'), '/tmp/abs.txt'), /Unsafe path/);
  assert.throws(() => safeJoin(path.join(d, 'out'), 'C:\\Windows\\x.txt'), /Unsafe path/);
});

test('corrupt and password-protected zips give a clear error', async () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'bad.zip'), Buffer.from('PK\x03\x04not-a-zip'));
  await assert.rejects(() => extractArchive(path.join(d, 'bad.zip'), path.join(d, 'o1')), /damaged or unreadable/);
  const locked = writeZip(d, 'locked.zip', [{ name: 'a.pdf', data: '%PDF', encrypted: true }]);
  await assert.rejects(() => extractArchive(locked, path.join(d, 'o2')), /password-protected/);
});

test('nested zip depth limit is 3', async () => {
  const d = tmp(); const cache = path.join(d, 'cache');
  let buf = buildZip([{ name: 'deep.pdf', data: 'deep' }]);
  for (let i = 3; i >= 1; i--) buf = buildZip([{ name: 'n' + i + '.zip', data: buf }]);
  const outer = path.join(d, 'n0.zip'); fs.writeFileSync(outer, buf);
  const { files } = await expand([outer], path.join(d, 'work'), { importCache: cache });
  assert.ok(!files.some((f) => /deep\.pdf$/i.test(f)), 'fourth level stays packed');
  assert.ok(files.some((f) => /\.zip$/i.test(f)), 'the leftover nested zip remains a file');
  assert.equal(ZIP_NEST_DEPTH, 3);
});

test('ZIP never falls back to 7z.exe', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'core', 'intake', 'archive.cjs'), 'utf8');
  const start = src.indexOf('if (isZipName(file))');
  const unzipFn = src.slice(start, src.indexOf('await sevenZip(file, outDir', start));
  assert.ok(start >= 0 && unzipFn.length > 20);
  assert.ok(!/sevenZip\(/.test(unzipFn), 'zip branch must not call 7z');
  assert.match(src, /yauzl/);
});

test('pick files and pick folder accept zip; drop uses the same run()', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.cjs'), 'utf8');
  const pre = fs.readFileSync(path.join(__dirname, '..', 'electron', 'preload.cjs'), 'utf8');
  const proj = fs.readFileSync(path.join(__dirname, '..', 'src', 'ProjectView.tsx'), 'utf8');
  assert.match(main, /extensions: \['pdf', 'zip'/);
  assert.match(main, /opts && opts\.zip/);
  assert.match(main, /extensions: \['zip', 'rar'\]/);
  assert.match(main, /LOCALAPPDATA.*ImportCache/);
  assert.match(pre, /pickFolder: \(opts\) => ipcRenderer\.invoke\('qr:pickFolder', opts\)/);
  assert.match(proj, /pickFolder\(\{ zip: true \}\)/);
  const drop = fs.readFileSync(path.join(__dirname, '..', 'src', 'hooks', 'useDrop.ts'), 'utf8');
  assert.match(drop, /pathForFile/);
  assert.match(drop, /captureDroppedFiles/);
  assert.doesNotMatch(drop, /\.zip/);
});
