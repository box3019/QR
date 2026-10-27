'use strict';
// Guards for the Outlook add-in that once crashed Outlook (and got disabled by it).
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'.repeat(1)); const find = (p) => [path.join(__dirname, p), path.join(__dirname, '..', p), path.join(__dirname, '..', '..', p)].find(fs.existsSync);
const cs = fs.readFileSync(find('outlook-addin/QRAddin.cs'), 'utf8'); const nsh = fs.readFileSync(find('build/installer.nsh'), 'utf8');
test('uses Office interface definitions, no hand-declared COM interfaces', () => { assert.ok(!/ComImport/.test(cs)); assert.ok(/using Extensibility;/.test(cs)); });
test('every entry point catches and logs', () => { for (const m of ['OnConnection', 'OnDisconnection', 'OnStartupComplete', 'GetCustomUI', 'OnSend']) assert.ok(new RegExp(m + '\\([^)]*\\)\\s*\\{\\s*try').test(cs), m); assert.ok(/outlook-addin\.log/.test(cs)); });
test('installer never re-enables a disabled add-in', () => { assert.ok(/ReadRegDWORD \$0 HKCU "Software\\Microsoft\\Office\\Outlook\\Addins\\QR\.OutlookAddin" "LoadBehavior"/.test(nsh)); assert.ok(/IfNot\} \$\{isUpdated\}/.test(nsh)); assert.ok(!/DisabledItems|Resiliency/.test(nsh)); });