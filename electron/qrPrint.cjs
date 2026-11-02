'use strict';
// Print the RFQ report HTML in a hidden BrowserWindow (never the live UI).
// Acrobat/Reader: detached `/p` so the Acrobat print dialog opens with printer choice.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const EMPTY_PRINT_ERROR = 'Print document rendered empty';
const LOAD_TIMEOUT_MS = 20000;

/** Steps 2/3: the selected part card. Step 4 (and others): the full summary. */
function partsForPrint(parts, step, sel) {
  const list = Array.isArray(parts) ? parts : [];
  if ((step === 2 || step === 3) && list.length) {
    const i = Math.min(Math.max(0, Number(sel) || 0), list.length - 1);
    return [list[i]];
  }
  return list;
}

function printDocumentStatsJs() {
  return `(() => {
    const b = document.body;
    if (!b) return { bodyHeight: 0, rowCount: 0 };
    const box = b.getBoundingClientRect();
    const bodyHeight = Math.max(b.scrollHeight || 0, b.offsetHeight || 0, box && box.height || 0);
    const rowCount = document.querySelectorAll('table tr, section.part').length;
    return { bodyHeight, rowCount };
  })()`;
}

function isPrintDocumentReady(info) {
  return !!info && Number(info.bodyHeight) > 80 && Number(info.rowCount) > 0;
}

function parseRegValue(out, name) {
  const label = name || '(Default)';
  const re = new RegExp((label === '(Default)' ? '\\(Default\\)' : label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) + '\\s+REG_\\w+\\s+(.+)$', 'im');
  const m = String(out || '').match(re);
  return m ? m[1].trim() : '';
}

function parseOpenCommand(cmd) {
  const s = String(cmd || '').trim();
  if (!s) return '';
  if (s.startsWith('"')) {
    const end = s.indexOf('"', 1);
    if (end > 1) return s.slice(1, end);
  }
  return s.split(/\s+/)[0];
}

function isAcrobatExe(exe) {
  const b = path.basename(String(exe || '').replace(/"/g, '')).toLowerCase();
  return b === 'acrobat.exe' || b === 'acrord32.exe' || b === 'acrord.exe' || /^acrord/i.test(b) || b.includes('acrobat');
}

function defaultRegQuery(key, valueName) {
  const args = ['query', key];
  if (valueName) args.push('/v', valueName); else args.push('/ve');
  const out = execFileSync('reg', args, { encoding: 'utf8' });
  return parseRegValue(out, valueName || '(Default)');
}

/** HKCU FileExts .pdf UserChoice -> HKCR\\<ProgId>\\shell\\open\\command */
function resolvePdfOpenCommand(runReg) {
  const query = runReg || defaultRegQuery;
  const progId = String(query('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.pdf\\UserChoice', 'ProgId') || '').trim();
  if (!progId) return { exe: '', progId: '', command: '' };
  const command = query('HKCR\\' + progId + '\\shell\\open\\command', '') || '';
  return { exe: parseOpenCommand(command), progId, command };
}

async function openPdfForPrint({ pdfPath, shell, spawnFn, resolve, log }) {
  let info = { exe: '', progId: '' };
  try { info = (resolve || resolvePdfOpenCommand)(); } catch (e) { log && log('pdf registry: ' + ((e && e.message) || e)); }
  if (info.exe && isAcrobatExe(info.exe)) {
    const child = (spawnFn || spawn)(info.exe, ['/p', pdfPath], { detached: true, stdio: 'ignore', windowsHide: false });
    if (child && typeof child.unref === 'function') child.unref();
    return { method: 'acrobat', exe: info.exe };
  }
  if (shell && typeof shell.openPath === 'function') {
    const err = await shell.openPath(pdfPath);
    if (err) return { method: 'none', exe: info.exe || '', error: err };
    return { method: 'openPath', exe: info.exe || '' };
  }
  return { method: 'none', exe: info.exe || '' };
}

function waitDidFinishLoad(webContents, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Print document load timed out')), ms);
    const ok = () => { clearTimeout(t); resolve(); };
    const fail = (_e, code, desc) => { clearTimeout(t); reject(new Error(desc || String(code) || 'load failed')); };
    webContents.once('did-finish-load', ok);
    webContents.once('did-fail-load', fail);
  });
}

async function launchElectronHtmlPrintDialog({ html, BrowserWindow, shell, spawnFn, resolvePdf, log, timeoutMs }) {
  if (!html || !String(html).trim()) throw new Error(EMPTY_PRINT_ERROR);
  const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const htmlPath = path.join(os.tmpdir(), 'qr-print-' + stamp + '.html');
  const pdfPath = path.join(os.tmpdir(), 'qr-print-' + stamp + '.pdf');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const w = new BrowserWindow({ show: false, width: 794, height: 1123, webPreferences: { sandbox: false } });
  let openedWithPdfApp = false;
  try {
    const loaded = waitDidFinishLoad(w.webContents, timeoutMs || LOAD_TIMEOUT_MS);
    w.loadFile(htmlPath);
    await loaded;
    const stats = await w.webContents.executeJavaScript(printDocumentStatsJs(), true);
    if (!isPrintDocumentReady(stats)) throw new Error(EMPTY_PRINT_ERROR);
    const buf = await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true, margins: { marginType: 'default' } });
    if (!buf || buf.length < 2048) throw new Error(EMPTY_PRINT_ERROR);
    fs.writeFileSync(pdfPath, buf);
    try {
      const r = await openPdfForPrint({ pdfPath, shell, spawnFn, resolve: resolvePdf, log });
      openedWithPdfApp = r.method === 'acrobat' || r.method === 'openPath';
    } catch (e) { log && log('pdf open: ' + ((e && e.message) || e)); }
    if (!openedWithPdfApp) {
      await new Promise((resolve, reject) => {
        w.webContents.print({ silent: false, printBackground: true, pageSize: 'A4' }, (ok, reason) => {
          if (!ok && reason !== 'cancelled') reject(new Error(reason || 'print failed'));
          else resolve();
        });
      });
    }
    return { ok: true, pdfPath, bytes: buf.length };
  } finally {
    try { fs.unlinkSync(htmlPath); } catch {}
    try { if (w && !w.isDestroyed()) w.destroy(); } catch {}
  }
}

module.exports = {
  EMPTY_PRINT_ERROR, LOAD_TIMEOUT_MS, partsForPrint, printDocumentStatsJs, isPrintDocumentReady,
  parseRegValue, parseOpenCommand, isAcrobatExe, resolvePdfOpenCommand, openPdfForPrint,
  launchElectronHtmlPrintDialog, waitDidFinishLoad,
};
