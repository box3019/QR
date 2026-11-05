'use strict';
// Drop from WinRAR / Explorer zip / 7-Zip: copy immediately into DropCache; arrayBuffer fallback; nested zip unchanged.
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path'); const { pathToFileURL } = require('url');
const D = require('../core/intake/dropStage.cjs');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'wizard', 'dropCapture.mjs')).href);

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'qr-drop-')); }

test('copyNow copies a WinRAR-style temp file into DropCache with a unique name', () => {
  const dir = tmp();
  const rar = path.join(dir, 'Rar$DRa0.123');
  fs.mkdirSync(rar);
  const srcFile = path.join(rar, 'H954654A-E-PD-01.pdf');
  fs.writeFileSync(srcFile, '%PDF-1.4 drawing');
  const destDir = D.newDropDir(path.join(dir, 'DropCache'));
  const r = D.copyNow(destDir, srcFile, 'H954654A-E-PD-01.pdf');
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(r.path.startsWith(destDir));
  assert.strictEqual(fs.readFileSync(r.path, 'utf8'), '%PDF-1.4 drawing');
  const r2 = D.copyNow(destDir, srcFile, 'H954654A-E-PD-01.pdf');
  assert.ok(r2.ok && r2.path !== r.path);
});

test('writeNow saves arrayBuffer bytes when there is no real path', () => {
  const destDir = D.newDropDir(path.join(tmp(), 'DropCache'));
  const r = D.writeNow(destDir, 'PLReport_H9546.zip', Buffer.from('PK\x03\x04nested'));
  assert.ok(r.ok);
  assert.strictEqual(path.basename(r.path), 'PLReport_H9546.zip');
  assert.ok(fs.readFileSync(r.path).slice(0, 2).toString() === 'PK');
  assert.ok(!D.writeNow(destDir, 'empty.bin', Buffer.alloc(0)).ok);
});

test('copyNow retries until the source appears, then falls back to bytes', async () => {
  const C = await load();
  const destDir = D.newDropDir(path.join(tmp(), 'DropCache'));
  const later = path.join(tmp(), 'soon.pdf');
  let tries = 0;
  const api = {
    startSession: () => ({ dir: destDir }),
    pathForFile: () => later,
    stagePath: (dir, src, name) => { tries++; if (!fs.existsSync(src)) return { ok: false, error: 'missing' }; return D.copyNow(dir, src, name); },
    stageBytes: (dir, name, bytes) => D.writeNow(dir, name, bytes),
    arrayBuffer: async () => Buffer.from('%PDF-bytes'),
    sleep: async () => { if (tries >= 2) fs.writeFileSync(later, '%PDF-path'); },
    log: () => {},
  };
  const r = await C.captureDroppedFiles([{ name: 'part.pdf' }], api, { tries: 4, delayMs: 1 });
  assert.deepEqual(r.failed, []);
  assert.equal(r.paths.length, 1);
  assert.ok(fs.readFileSync(r.paths[0], 'utf8').startsWith('%PDF'));
});

test('missing path uses arrayBuffer; total failure is reported, not ignored', async () => {
  const C = await load();
  const destDir = D.newDropDir(path.join(tmp(), 'DropCache'));
  const logs = [];
  const api = {
    startSession: () => ({ dir: destDir }),
    pathForFile: (f) => f.path || '',
    stagePath: () => { throw new Error('should not copy'); },
    stageBytes: (dir, name, bytes) => D.writeNow(dir, name, bytes),
    arrayBuffer: async (f) => f.bytes || null,
    sleep: async () => {},
    log: (m) => logs.push(m),
  };
  const ok = await C.captureDroppedFiles([{ name: 'virtual.pdf', bytes: Buffer.from('%PDF-virt') }], api);
  assert.equal(ok.failed.length, 0);
  assert.equal(fs.readFileSync(ok.paths[0], 'utf8'), '%PDF-virt');
  const bad = await C.captureDroppedFiles([{ name: 'gone.pas' }], api);
  assert.equal(bad.paths.length, 0);
  assert.equal(bad.failed[0].name, 'gone.pas');
  assert.ok(logs.some((m) => /gone\.pas/.test(m)));
});

test('first copy runs before any await (WinRAR window)', async () => {
  const C = await load();
  const destDir = D.newDropDir(path.join(tmp(), 'DropCache'));
  const order = [];
  const srcFile = path.join(tmp(), 'a.pdf'); fs.writeFileSync(srcFile, '%PDF-a');
  const api = {
    startSession: () => { order.push('session'); return { dir: destDir }; },
    pathForFile: () => { order.push('path'); return srcFile; },
    stagePath: (dir, src, name) => { order.push('copy'); return D.copyNow(dir, src, name); },
    stageBytes: () => ({ ok: false }),
    arrayBuffer: () => { order.push('bytes-start'); return new Promise((res) => setImmediate(() => { order.push('bytes-done'); res(Buffer.from('late')); })); },
    sleep: async () => {},
  };
  const p = C.captureDroppedFiles([{ name: 'a.pdf' }], api);
  assert.ok(order.indexOf('bytes-start') >= 0 && order.indexOf('bytes-start') < order.indexOf('copy'));
  assert.ok(order.indexOf('session') === 0);
  assert.ok(order.includes('copy'));
  assert.ok(!order.includes('bytes-done'), 'arrayBuffer must not finish before the first copy');
  await p;
});

test('drop handler captures before run; Outlook only when no File objects; nested zip is a normal file', () => {
  const drop = src('src/hooks/useDrop.ts');
  assert.match(drop, /captureDroppedFiles/);
  assert.match(drop, /arrayBuffer/);
  assert.match(drop, /stageDropPath/);
  assert.match(drop, /notice.*dropFailed|dropFailed|dropPartial/);
  assert.match(drop, /if \(!files\.length\)/);
  assert.match(src('src/App.tsx'), /setOver, notify/);
  const pre = src('electron/preload.cjs');
  assert.match(pre, /dropStart/);
  assert.match(pre, /stageDropPath/);
  assert.match(pre, /stageDropBytes/);
  assert.match(pre, /copyNow/);
  const main = src('electron/main.cjs');
  assert.match(main, /dropSessionsOf/);
  assert.match(main, /jobDrops/);
  assert.match(main, /qr:drop-log/);
  assert.match(main, /jobDrops\.get\(id\)/);
  const en = JSON.parse(src('src/i18n/en.json'));
  const he = JSON.parse(src('src/i18n/he.json'));
  assert.ok(en['notice.dropFailed'] && he['notice.dropFailed']);
  assert.ok(en['notice.dropPartial'] && he['notice.dropPartial']);
  assert.ok(!/[A-Za-z]/.test(he['notice.dropFailed'].replace(/\{list\}/g, '')));
  assert.doesNotMatch(drop, /\.zip/);
});

test('dropSessionsOf maps staged files back to the session folder', () => {
  const root = path.join(tmp(), 'DropCache');
  const dir = D.newDropDir(root);
  const f = path.join(dir, 'a.pdf');
  assert.strictEqual(D.dropSessionOf(f, root), dir);
  assert.deepEqual(D.dropSessionsOf([f, path.join(dir, 'b.step')], root), [dir]);
  assert.strictEqual(D.dropSessionOf('/other/a.pdf', root), '');
});
