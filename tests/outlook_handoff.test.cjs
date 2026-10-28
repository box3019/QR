'use strict';
// Outlook 'Send to QR' while QR is already running: the second instance's argv (Chromium moves its switches in front of the folder), window to front,
// dedupe by e-mail identity (not RFQ number), and no silent failure (notice with the reason).
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path'); const { pathToFileURL } = require('url');
const { importArg, msgFiles, importProblem, bringToFront } = require('../electron/importArg.cjs');
const { mailKey } = require('../core/email/key.cjs');
const P = require('../core/projects.cjs');
const load = (f) => import(pathToFileURL(path.join(__dirname, '..', 'src', f)).href);
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'qrh-'));

test('second-instance argv: the folder is found behind Chromium switches (the 10:39 bug)', () => {
  const d = tmp();
  assert.strictEqual(importArg(['QR.exe', '--import', '--allow-file-access-from-files', '--allow-file-access-from-files', d]), path.resolve(d));
  assert.strictEqual(importArg(['QR.exe', '--import', '--allow-file-access-from-files', d]), path.resolve(d));
  assert.strictEqual(importArg(['QR.exe', '--import', d]), path.resolve(d), 'first launch');
  assert.strictEqual(importArg(['QR.exe', '--import=' + d, '--x']), path.resolve(d));
  assert.strictEqual(importArg(['QR.exe', '--import', '--allow-file-access-from-files', 'C:\\app', d]), path.resolve(d), 'last existing folder wins over the app path');
  assert.strictEqual(importArg(['QR.exe', '--import', '--allow-file-access-from-files']), null);
  assert.strictEqual(importArg(['QR.exe', '--allow-file-access-from-files']), null);
});
test('an unusable folder is reported, not ignored', () => {
  const d = tmp(); assert.strictEqual(importProblem(d), 'noMail'); assert.strictEqual(importProblem(path.join(d, 'gone')), 'noFolder');
  fs.writeFileSync(path.join(d, 'a.msg'), ''); assert.strictEqual(msgFiles(d).length, 1);
  const m = src('electron/main.cjs');
  assert.match(m, /if \(!files\.length\) \{ notify\(\{ code: importProblem\(dir\), dir \}\); return; \}/);
  assert.match(m, /second-instance[^\n]*bringToFront\(win, app\)[^\n]*sendImport\(d\)/); assert.match(m, /second-instance argv=/, 'argv is logged for diagnosis');
  assert.match(m, /pendingNotice/); assert.match(src('electron/preload.cjs'), /onNotify/);
});
test('bringToFront restores, shows and raises the window', () => {
  const calls = []; const win = { isDestroyed: () => false, isMinimized: () => true, restore: () => calls.push('restore'), show: () => calls.push('show'), setAlwaysOnTop: (b) => calls.push('top' + b), focus: () => calls.push('focus') };
  assert.strictEqual(bringToFront(win, { focus: (o) => calls.push('app' + o.steal) }), true);
  assert.deepStrictEqual(calls, ['restore', 'show', 'toptrue', 'focus', 'topfalse', 'apptrue']);
  assert.strictEqual(bringToFront({ isDestroyed: () => true }, null), false); assert.strictEqual(bringToFront(null, null), false);
});
test('mail key: Message-ID, else a fingerprint; another e-mail of the same RFQ never matches', () => {
  assert.strictEqual(mailKey({ messageId: '<AbC@x.com>', subject: 'a' }), 'mid:abc@x.com');
  const a = { subject: 'FW: RFQ-702903', sender: { email: 'g@s.com' }, date: '2026-10-28T08:00:00Z', attachments: [{ name: 'a.pdf', data: Buffer.alloc(3) }] };
  assert.strictEqual(mailKey(a), mailKey({ ...a })); assert.match(mailKey(a), /^fp:[0-9a-f]{40}$/);
  assert.notStrictEqual(mailKey(a), mailKey({ ...a, date: '2026-10-28T09:00:00Z' })); assert.notStrictEqual(mailKey(a), mailKey({ ...a, attachments: [] }));
  assert.strictEqual(mailKey({}), ''); assert.strictEqual(mailKey(null), '');
});
test('peekMail collects the keys of the e-mails in an import', async () => {
  const r = await P.peekMail(['a.pdf', 'b.msg', 'c.eml'], async (f) => ({ subject: 'RFQ 702903', messageId: f }), (m) => mailKey(m));
  assert.deepStrictEqual(r, { rfq: '702903', keys: ['mid:b.msg', 'mid:c.eml'] });
  assert.deepStrictEqual(await P.peekMail(['x.msg'], async () => { throw new Error('bad'); }, mailKey), { rfq: null, keys: [] });
});
test('open RFQ 701751 and a new e-mail RFQ 702903: a NEW tab; the same e-mail again: focus', async () => {
  const s = await load('projects/store.mjs');
  const open = s.tabMeta({ rfqs: [{ rfq_no: '701751', mail_key: 'mid:one' }], parts: [{ partNo: 'X1', problems: [] }] }); assert.deepStrictEqual(open.mailKeys, ['mid:one']);
  const tabs = [{ id: 'a', ...open, status: 'ready' }];
  assert.deepStrictEqual(s.routeOutlook(tabs, ['mid:two'], 'a'), { kind: 'new' });
  assert.deepStrictEqual(s.routeOutlook(tabs, ['mid:one'], 'a'), { kind: 'focus', id: 'a' });
  assert.deepStrictEqual(s.routeOutlook([{ id: 'a', key: '702903', status: 'ready' }], ['mid:two'], 'a'), { kind: 'new' }, 'same RFQ number but another e-mail');
});
test('an e-mail with no usable drawings explains why (inline pictures, Excel only, specs only, unreadable)', async () => {
  const n = await load('projects/notice.mjs'); const rf = [{ subject: 'RFQ 702903' }];
  assert.strictEqual(n.noPartsReason({ files: [], rfqs: rf }).key, 'noAttach');
  assert.strictEqual(n.noPartsReason({ files: ['quote.xlsx', 'a.docx'], rfqs: rf }).key, 'otherOnly');
  assert.match(n.noPartsReason({ files: ['quote.xlsx'], rfqs: rf }).vars.names, /quote\.xlsx/);
  assert.strictEqual(n.noPartsReason({ files: ['a.pdf'], unknown: ['a.pdf'], rfqs: rf }).key, 'specOnly');
  assert.strictEqual(n.noPartsReason({ files: ['a.pdf'], errors: [{ file: 'C:\\t\\a.pdf' }], rfqs: rf }).key, 'unreadable');
  assert.strictEqual(n.noPartsReason({ files: ['a.pdf'], rfqs: rf }).key, 'noDrawings'); assert.strictEqual(n.noPartsReason({}).key, 'noAttach');
  assert.strictEqual(n.noPartsReason({ files: [], rfqs: rf }).vars.subject, '"RFQ 702903"');
  const en = require('../src/i18n/en.json'); const he = require('../src/i18n/he.json');
  for (const k of ['noMail', 'noFolder', 'sameMail', 'noAttach', 'otherOnly', 'specOnly', 'unreadable', 'noDrawings', 'title', 'close']) { assert.ok(en['notice.' + k], k); assert.match(he['notice.' + k], /[\u0590-\u05FF]/, k); }
  assert.match(src('src/ProjectView.tsx'), /noPartsReason\(r\)/); assert.match(src('src/App.tsx'), /<Notice text=\{notice\}/);
});
