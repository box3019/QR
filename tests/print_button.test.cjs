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
  const historyPos = bar.indexOf('btn-history');
  assert.ok(printPos < historyPos, 'Print button should come before History button');
});

test('Print button is disabled when no parts are loaded', () => {
  const a = src('src/App.tsx');
  assert.ok(/disabled=\{!\(m\.nParts > 0\)\}/.test(a) || /disabled=\{!m\.nParts/.test(a), 'Print button should be disabled when nParts is 0');
});

test('Print button triggers qr.print IPC', () => {
  const a = src('src/App.tsx');
  assert.ok(/onClick=\{.*qr\(\)\.print/.test(a), 'Print button should call qr().print');
});

test('print IPC handler exists in main process', () => {
  const m = src('electron/main.cjs');
  assert.ok(/ipcMain\.handle\('qr:print'/.test(m), 'qr:print handler should exist');
  assert.ok(/webContents\.print\(/.test(m), 'print handler should use webContents.print');
  assert.ok(/printBackground:\s*true/.test(m), 'print handler should enable printBackground');
});

test('print method is exposed in preload', () => {
  const p = src('electron/preload.cjs');
  assert.ok(/print:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('qr:print'\)/.test(p), 'print method should be exposed');
});

test('Print icon is defined', () => {
  const i = src('src/components/Ico.tsx');
  assert.ok(/print:\s*'M/.test(i), 'print icon should be defined');
});

test('Print translations exist in EN and HE', () => {
  for (const l of ['en', 'he']) {
    const j = JSON.parse(src('src/i18n/' + l + '.json'));
    assert.ok(j['top.print'], l + ' top.print');
    assert.ok(j['tip.print'], l + ' tip.print');
    assert.ok(j['dis.nothingToPrint'], l + ' dis.nothingToPrint');
  }
});

test('Print stylesheet exists with proper rules', () => {
  const css = src('src/styles/wizard.css');
  assert.ok(/@media print/.test(css), 'Print media query should exist');
  assert.ok(/\.qr-topbar[^}]*display:\s*none/s.test(css), 'Topbar should be hidden in print');
  assert.ok(/\.qr-statusbar[^}]*display:\s*none/s.test(css), 'Status bar should be hidden in print');
  assert.ok(/background:\s*#fff\s*!important/.test(css), 'Print should have white background');
  assert.ok(/color:\s*#000\s*!important/.test(css), 'Print should have dark text');
});
