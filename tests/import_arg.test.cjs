'use strict';
// Outlook 'Send to QR' hand-off: --import <dir> parsing and .msg listing; installer registers HKCU only.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { importArg, msgFiles } = require('../electron/importArg.cjs');
test('parses --import', () => { assert.strictEqual(importArg(['QR.exe']), null); assert.strictEqual(importArg(['QR.exe', '--import']), null); assert.strictEqual(importArg(['QR.exe', '--import', 'C:\\t\\x']), path.resolve('C:\\t\\x')); });
test('lists only msg/eml, sorted', () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qri-')); for (const f of ['2 b.msg', '1 a.msg', 'x.txt', 'c.EML']) fs.writeFileSync(path.join(d, f), '');
  assert.deepStrictEqual(msgFiles(d).map((f) => path.basename(f)), ['1 a.msg', '2 b.msg', 'c.EML']); assert.deepStrictEqual(msgFiles(path.join(d, 'none')), []); });
test('installer writes HKCU only and cleans up on uninstall', () => { const s = fs.readFileSync(path.join(__dirname, '..', 'build', 'installer.nsh'), 'utf8');
  assert.ok(!/HKLM|HKCR/.test(s)); assert.match(s, /QrAddinDel[\s\S]*DeleteRegKey HKCU \"Software\\Microsoft\\Office\\Outlook\\Addins\\QR\.OutlookAddin\"[\s\S]*customUnInstall[\s\S]*QrAddinDel/); assert.match(s, /Software\\QR" "ExePath"/); });
