const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { fileKind, realExt } = require('../core/intake/classify.cjs');
const { flattenSingleFolder, archiveMagic } = require('../core/intake/archive.cjs');
const { expand } = require('../core/intake/expand.cjs');
const FIX = process.env.QR_FIXTURES || 'C:\\Users\\AlexK\\agent-tools\\qr-testdata\\fixtures';
test('classify by name, doubled extensions, spaces', () => {
  assert.equal(realExt('A-pas.pdf.PDF'), '.pdf'); assert.equal(fileKind('XY10002A-A-PD-XY10002A_A.pdf.PDF'), 'drawing');
  assert.equal(fileKind('x.pdf.pdf'), 'drawing'); assert.equal(fileKind('My part rev A.STEP'), 'model');
  assert.equal(fileKind('a.x_t'), 'model'); assert.equal(fileKind('a.pas'), 'other'); assert.equal(fileKind('a_36.xls'), 'other');
  assert.equal(fileKind('a.RAR'), 'archive'); assert.equal(fileKind('b.7z'), 'archive'); assert.equal(fileKind('m.msg'), 'email');
  assert.equal(fileKind('PRODUCT.ZIP_1_5820277'), 'other');
  assert.equal(archiveMagic(Buffer.from('PK\x03\x04data')), 'zip');
  assert.equal(archiveMagic(Buffer.from('Rar!\x1a\x07\x00')), 'rar');
  assert.equal(archiveMagic(Buffer.from('%PDF-1.4')), '');
});
test('flatten a single same-name folder', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qrt-')); fs.mkdirSync(path.join(d, 'X')); fs.writeFileSync(path.join(d, 'X', 'a.pdf'), 'x');
  assert.ok(flattenSingleFolder(d)); assert.ok(fs.existsSync(path.join(d, 'a.pdf')));
});
test('RAR batch (RAFAEL) unpacks with bundled 7-Zip', { skip: !fs.existsSync(path.join(FIX, 'RAFAEL_batch1.rar')) }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qrt-'));
  const { files } = await expand([path.join(FIX, 'RAFAEL_batch1.rar')], tmp);
  const pdf = files.filter((f) => fileKind(f) === 'drawing'), mdl = files.filter((f) => fileKind(f) === 'model');
  assert.ok(pdf.length >= 8, 'pdfs ' + pdf.length); assert.ok(mdl.length >= 7, 'models ' + mdl.length);
});
