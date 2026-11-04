'use strict';
// Print button: visible in the topbar, disabled when no parts loaded, triggers print IPC. Synthetic only.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');

test('Print button is in the topbar next to FileMenu', () => {
  const a = src('src/App.tsx');
  const bar = a.slice(a.indexOf('qr-topbar mrt-workspace-topbar-chrome'), a.indexOf('className="qr-projs"'));
  assert.ok(/btn-print/.test(bar), 'btn-print should be in topbar');
  assert.ok(/top\.print/.test(bar), 'top.print translation key should be used');
  assert.ok(/tip\.print/.test(bar), 'tip.print tooltip key should be used');
  const fileMenuPos = bar.indexOf('<FileMenu');
  const printPos = bar.indexOf('btn-print');
  assert.ok(fileMenuPos < printPos, 'Print button should come after FileMenu');
  const savePdfPos = bar.indexOf('btn-save-pdf');
  const morePos = bar.indexOf('TopMore');
  assert.ok(printPos < savePdfPos, 'Save PDF button should come after Print');
  assert.ok(savePdfPos < morePos, 'More (History) should come after Save PDF');
  assert.ok(/top\.savePdf/.test(bar), 'top.savePdf translation key should be used');
  assert.ok(/tip\.savePdf/.test(bar), 'tip.savePdf tooltip key should be used');
});

test('Save PDF button is disabled when no parts are loaded', () => {
  const a = src('src/App.tsx');
  const chunk = a.slice(a.indexOf('btn-save-pdf') - 200, a.indexOf('btn-save-pdf') + 400);
  assert.ok(/disabled=\{!\(m\.nParts > 0\)\}/.test(chunk) || /disabled=\{!m\.nParts/.test(chunk), 'Save PDF should be disabled when nParts is 0');
});

test('Save PDF button triggers qr.savePdf IPC with the same payload as Print', () => {
  const a = src('src/App.tsx');
  assert.ok(/qr\(\)\.savePdf\?\.?\(payload\)/.test(a), 'Save PDF should call qr().savePdf with the report payload');
  assert.ok(/pdf\.openFolder/.test(a) && /openPath/.test(a), 'success notice offers Open folder');
});

test('Print button is disabled when no parts are loaded', () => {
  const a = src('src/App.tsx');
  assert.ok(/disabled=\{!\(m\.nParts > 0\)\}/.test(a) || /disabled=\{!m\.nParts/.test(a), 'Print button should be disabled when nParts is 0');
});

test('Print button triggers qr.print IPC', () => {
  const a = src('src/App.tsx');
  assert.ok(/qr\(\)\.print\?\.?\(payload\)/.test(a) || /qr\(\)\.print\?\.\(payload\)/.test(a) || /qr\(\)\.print\?\(payload\)/.test(a), 'Print button should call qr().print with the report payload');
  assert.ok(/__qrPrintPayload/.test(a), 'Print uses the current project payload, not the live window');
});

test('print IPC handler exists in main process', () => {
  const m = src('electron/main.cjs');
  assert.ok(/ipcMain\.handle\('qr:print'/.test(m), 'qr:print handler should exist');
  assert.ok(/launchElectronHtmlPrintDialog/.test(m), 'print handler should print report HTML in a hidden window');
  assert.ok(/reportHtmlFromPayload/.test(m) && /reportHtml/.test(m), 'print handler should use the existing report');
  assert.ok(/ipcMain\.handle\('qr:savePdf'/.test(m), 'qr:savePdf handler should exist');
  assert.ok(/saveElectronHtmlReportPdf/.test(m), 'savePdf uses the shared report PDF renderer');
  assert.ok(/showSaveDialog/.test(m) && /lastPdfFolder/.test(m), 'savePdf uses a native save dialog and remembers the folder');
});

test('print method is exposed in preload', () => {
  const p = src('electron/preload.cjs');
  assert.ok(/print:\s*\(payload\)\s*=>\s*ipcRenderer\.invoke\('qr:print',\s*payload\)/.test(p), 'print method should be exposed');
  assert.ok(/savePdf:\s*\(payload,\s*target\)\s*=>\s*ipcRenderer\.invoke\('qr:savePdf',\s*payload,\s*target\)/.test(p), 'savePdf method should be exposed');
  assert.ok(/savePdfEach:\s*\(payload,\s*targetDir\)\s*=>\s*ipcRenderer\.invoke\('qr:savePdfEach',\s*payload,\s*targetDir\)/.test(p), 'savePdfEach method should be exposed');
});

test('Print icon is defined', () => {
  const i = src('src/components/Ico.tsx');
  assert.ok(/print:\s*'M/.test(i), 'print icon should be defined');
  assert.ok(/pdf:\s*'M/.test(i), 'pdf icon should be defined');
});

test('Print translations exist in EN and HE', () => {
  for (const l of ['en', 'he']) {
    const j = JSON.parse(src('src/i18n/' + l + '.json'));
    assert.ok(j['top.print'], l + ' top.print');
    assert.ok(j['tip.print'], l + ' tip.print');
    assert.ok(j['dis.nothingToPrint'], l + ' dis.nothingToPrint');
    assert.ok(j['top.savePdf'], l + ' top.savePdf');
    assert.ok(!/\n/.test(j['top.savePdf']), l + ' Save PDF label is one line');
    assert.ok(j['tip.savePdf'] && j['pdf.saved'] && j['pdf.openFolder'] && j['pdf.failed'], l + ' pdf strings');
  }
  const en = JSON.parse(src('src/i18n/en.json'));
  assert.strictEqual(en['top.savePdf'], 'Save PDF');
  assert.ok(!/abbr|PDF file|Save as/i.test(en['top.savePdf']));
});

test('Print stylesheet exists with proper rules', () => {
  const css = src('src/styles/wizard.css');
  assert.ok(/@media print/.test(css), 'Print media query should exist');
  assert.ok(/\.qr-topbar[^}]*display:\s*none/s.test(css), 'Topbar should be hidden in print');
  assert.ok(/\.qr-statusbar[^}]*display:\s*none/s.test(css), 'Status bar should be hidden in print');
  assert.ok(/background:\s*#fff\s*!important/.test(css), 'Print should have white background');
  assert.ok(/color:\s*#000\s*!important/.test(css), 'Print should have dark text');
});
