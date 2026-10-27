'use strict';
// Guards for the Outlook add-in that once crashed Outlook (and got disabled by it).
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'.repeat(1)); const find = (p) => [path.join(__dirname, p), path.join(__dirname, '..', p), path.join(__dirname, '..', '..', p)].find(fs.existsSync);
const cs = fs.readFileSync(find('outlook-addin/QRAddin.cs'), 'utf8'); const nsh = fs.readFileSync(find('build/installer.nsh'), 'utf8');
test('uses Office interface definitions, no hand-declared COM interfaces', () => { assert.ok(!/ComImport/.test(cs)); assert.ok(/using Extensibility;/.test(cs)); });
test('every entry point catches and logs', () => { for (const m of ['OnConnection', 'OnDisconnection', 'OnStartupComplete', 'GetCustomUI', 'OnSend']) assert.ok(new RegExp(m + '\\([^)]*\\)\\s*\\{\\s*try').test(cs), m); assert.ok(/outlook-addin\.log/.test(cs)); });
test('installer never re-enables a disabled add-in', () => { assert.ok(/ReadRegDWORD \$0 HKCU "Software\\Microsoft\\Office\\Outlook\\Addins\\QR\.OutlookAddin" "LoadBehavior"/.test(nsh)); assert.ok(/IfNot\} \$\{isUpdated\}/.test(nsh)); assert.ok(!/DisabledItems|Resiliency/.test(nsh)); });test('installer leaves an existing add-in registration (CodeBase, LoadBehavior) alone', () => {
  const inst = nsh.slice(nsh.indexOf('!macro customInstall'), nsh.indexOf('!macroend', nsh.indexOf('!macro customInstall')));
  const guard = inst.indexOf('ReadRegStr $1 HKCU "Software\\Classes\\CLSID\\${QR_CLSID}\\InprocServer32" "CodeBase"');
  assert.ok(guard > 0); const ifs = inst.indexOf('${If} ${Errors}', guard); const end = inst.indexOf('${EndIf}', ifs);
  const calls = [...inst.matchAll(/!insertmacro QrAddinKeys/g)].map((m) => m.index);
  assert.ok(calls.length === 2 && calls.every((i) => i > ifs && i < end), 'add-in keys are written only inside the not-registered branch');
});
test('ribbon XML: Home tab, both mail context menus, read window; no insertBeforeMso', () => {
  for (const s of ['"TabMail"', 'ContextMenuMailItem', 'ContextMenuMultipleItems', 'Microsoft.Outlook.Mail.Read', 'TabReadMessage', "size='large'", "getImage='GetIcon'", "label='Send&#160;to&#160;QR'", 'supertip=', '<contextMenus>']) assert.ok(cs.includes(s), s);
  assert.ok(!/insertBeforeMso='/.test(cs)); assert.ok(/Class == 74/.test(cs), 'context menu Selection handled');
});