'use strict';
// Print the RFQ report HTML in a hidden BrowserWindow (never the live UI).
// Acrobat/Reader: detached `/p` so the Acrobat print dialog opens with printer choice.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawn, execFileSync } = require('child_process');

const EMPTY_PRINT_ERROR = 'Print document rendered empty';
const LOAD_TIMEOUT_MS = 20000;
const PDF_PRINT_OPTS = { pageSize: 'A4', printBackground: true, preferCSSPageSize: true, margins: { marginType: 'default' } };

/** Steps 2/3 with a part open, or mode 'part': that part. mode 'package': the whole package. Otherwise the full list. */
function partsForPrint(parts, step, sel, payload) {
  const list = Array.isArray(parts) ? parts : [];
  const mode = payload && payload.mode;
  if (mode === 'package') return list;
  const one = mode === 'part' || (payload && payload.partOpen) || ((step === 2 || step === 3) && mode !== 'package');
  if (one && list.length) {
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

/** Windows file name: strip reserved characters, trailing dots/spaces, and cap length. */
function sanitizeWinFileName(s) {
  const t = String(s || '').trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  return t || 'QR';
}

function reportPdfStem(parts, step, sel, meta, payload) {
  const list = partsForPrint(parts, step, sel, payload);
  if (payload && payload.mode === 'package') {
    const m = meta || {};
    return String(m.rfq || m.label || m.key || 'package' || '').trim();
  }
  if ((payload && (payload.mode === 'part' || payload.partOpen) || step === 2 || step === 3) && list[0]) return String(list[0].partNo || list[0].title || '').trim();
  const m = meta || {};
  return String(m.rfq || m.label || m.key || (list[0] && (list[0].partNo || list[0].title)) || '').trim();
}

function partPdfFileName(part, now) {
  return sanitizeWinFileName((part && (part.partNo || part.title)) || 'part') + '_' + ymdLocal(now) + '.pdf';
}

function ymdLocal(d) {
  const x = d instanceof Date ? d : new Date(d || Date.now());
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

function reportPdfFileName(payload, now) {
  const p = payload || {};
  const date = ymdLocal(now);
  const one = p.mode === 'part' || p.partOpen || ((p.step === 2 || p.step === 3) && p.mode !== 'package');
  if (one) {
    const list = partsForPrint(p.parts, p.step, p.sel, p);
    return partPdfFileName(list[0] || { partNo: reportPdfStem(p.parts, p.step, p.sel, p.meta, p) }, now);
  }
  return sanitizeWinFileName(reportPdfStem(p.parts, p.step, p.sel, p.meta, p) || 'package') + '_summary_' + date + '.pdf';
}

/** If dest exists, suggest " (2)", " (3)", … before the extension. */
function uniquePdfPath(dest, existsFn, used) {
  const exists = existsFn || ((p) => { try { return fs.existsSync(p); } catch { return false; } });
  const seen = used || new Set();
  const key = (p) => String(p).toLowerCase();
  if (!exists(dest) && !seen.has(key(dest))) return dest;
  const ext = path.extname(dest) || '.pdf';
  const stem = dest.slice(0, dest.length - ext.length);
  let n = 2, p;
  do { p = stem + ' (' + n + ')' + ext; n++; } while (exists(p) || seen.has(key(p)));
  return p;
}

function defaultPdfDir(last, documents, existsFn) {
  const exists = existsFn || ((p) => { try { return fs.existsSync(p) && fs.statSync(p).isDirectory(); } catch { return false; } });
  if (last && exists(last)) return last;
  return documents || '';
}

/** Hidden BrowserWindow + empty-render guard + printToPDF. Used by Print and Save PDF. */
async function renderReportPdfInHiddenWindow({ html, BrowserWindow, log, timeoutMs }) {
  if (!html || !String(html).trim()) throw new Error(EMPTY_PRINT_ERROR);
  const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const htmlPath = path.join(os.tmpdir(), 'qr-print-' + stamp + '.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const w = new BrowserWindow({ show: false, width: 794, height: 1123, webPreferences: { sandbox: false } });
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try { fs.unlinkSync(htmlPath); } catch {}
    try { if (w && !w.isDestroyed()) w.destroy(); } catch {}
  };
  try {
    const loaded = waitDidFinishLoad(w.webContents, timeoutMs || LOAD_TIMEOUT_MS);
    w.loadFile(htmlPath);
    await loaded;
    const stats = await w.webContents.executeJavaScript(printDocumentStatsJs(), true);
    if (!isPrintDocumentReady(stats)) throw new Error(EMPTY_PRINT_ERROR);
    const buf = await w.webContents.printToPDF(PDF_PRINT_OPTS);
    if (!buf || buf.length < 2048) throw new Error(EMPTY_PRINT_ERROR);
    return { buf, bytes: buf.length, window: w, cleanup };
  } catch (e) {
    log && log('report pdf: ' + ((e && e.message) || e));
    cleanup();
    throw e;
  }
}

async function launchElectronHtmlPrintDialog({ html, BrowserWindow, shell, spawnFn, resolvePdf, log, timeoutMs }) {
  const rendered = await renderReportPdfInHiddenWindow({ html, BrowserWindow, log, timeoutMs });
  const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const pdfPath = path.join(os.tmpdir(), 'qr-print-' + stamp + '.pdf');
  let openedWithPdfApp = false;
  try {
    fs.writeFileSync(pdfPath, rendered.buf);
    try {
      const r = await openPdfForPrint({ pdfPath, shell, spawnFn, resolve: resolvePdf, log });
      openedWithPdfApp = r.method === 'acrobat' || r.method === 'openPath';
    } catch (e) { log && log('pdf open: ' + ((e && e.message) || e)); }
    if (!openedWithPdfApp) {
      const w = rendered.window;
      await new Promise((resolve, reject) => {
        w.webContents.print({ silent: false, printBackground: true, pageSize: 'A4' }, (ok, reason) => {
          if (!ok && reason !== 'cancelled') reject(new Error(reason || 'print failed'));
          else resolve();
        });
      });
    }
    return { ok: true, pdfPath, bytes: rendered.bytes };
  } finally {
    rendered.cleanup();
  }
}

async function saveElectronHtmlReportPdf({ html, dest, BrowserWindow, log, timeoutMs }) {
  if (!dest) throw new Error('No save path');
  const rendered = await renderReportPdfInHiddenWindow({ html, BrowserWindow, log, timeoutMs });
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, rendered.buf);
    return { ok: true, path: dest, bytes: rendered.bytes };
  } finally {
    rendered.cleanup();
  }
}

function listSystemPrinters(webContents) {
  if (!webContents) return Promise.resolve([]);
  const fn = webContents.getPrintersAsync || (typeof webContents.getPrinters === 'function' ? () => webContents.getPrinters() : null);
  if (!fn) return Promise.resolve([]);
  return Promise.resolve(fn.call(webContents)).then((list) => (Array.isArray(list) ? list : []).map((p) => ({
    name: String((p && p.name) || ''),
    displayName: String((p && (p.displayName || p.name)) || ''),
    isDefault: !!(p && p.isDefault),
  })).filter((p) => p.name));
}

function autoLandscapeFile(file) {
  const w = Number(file && file.width) || 0;
  const h = Number(file && file.height) || 0;
  return !!(w && h && w > h);
}

function drawingPrintOptions(file, options) {
  const o = options || {};
  const copies = Math.max(1, Math.min(99, Math.round(Number(o.copies) || 1)));
  const landscape = o.landscape === true || (o.landscape !== false && o.landscape !== 'portrait' && autoLandscapeFile(file));
  return {
    silent: true,
    printBackground: true,
    deviceName: o.deviceName || o.printer || undefined,
    copies,
    pageSize: o.paperSize === 'A3' ? 'A3' : 'A4',
    landscape: !!landscape,
    margins: { marginType: o.fit === false ? 'printableArea' : 'none' },
  };
}

async function printDrawingPdfsSilent({ files, options, BrowserWindow, existsFn, log, timeoutMs }) {
  const exists = existsFn || ((p) => { try { return fs.existsSync(p); } catch { return false; } });
  const list = (files || []).filter((f) => f && f.path && /\.pdf$/i.test(f.path));
  if (!list.length) throw new Error('No drawing files to print');
  const printed = [];
  const skipped = [];
  for (const file of list) {
    if (!exists(file.path)) { skipped.push({ path: file.path, error: 'missing' }); continue; }
    const w = new BrowserWindow({ show: false, width: 800, height: 1100, webPreferences: { sandbox: false, plugins: true } });
    try {
      const loaded = waitDidFinishLoad(w.webContents, timeoutMs || LOAD_TIMEOUT_MS);
      w.loadURL(pathToFileURL(file.path).href);
      await loaded;
      const opts = drawingPrintOptions(file, options);
      await new Promise((resolve, reject) => {
        w.webContents.print(opts, (ok, reason) => {
          if (!ok && reason && reason !== 'cancelled') reject(new Error(reason));
          else resolve({ ok, reason });
        });
      });
      printed.push({ path: file.path, ok: true });
    } catch (e) {
      log && log('drawing print: ' + ((e && e.message) || e));
      skipped.push({ path: file.path, error: (e && e.message) || String(e) });
    } finally {
      try { if (w && !w.isDestroyed()) w.destroy(); } catch {}
    }
  }
  if (!printed.length) throw new Error((skipped[0] && skipped[0].error) || 'print failed');
  return { ok: true, printed: printed.length, files: printed, skipped };
}

module.exports = {
  EMPTY_PRINT_ERROR, LOAD_TIMEOUT_MS, PDF_PRINT_OPTS, partsForPrint, printDocumentStatsJs, isPrintDocumentReady,
  parseRegValue, parseOpenCommand, isAcrobatExe, resolvePdfOpenCommand, openPdfForPrint,
  launchElectronHtmlPrintDialog, saveElectronHtmlReportPdf, renderReportPdfInHiddenWindow, waitDidFinishLoad,
  sanitizeWinFileName, reportPdfStem, reportPdfFileName, partPdfFileName, uniquePdfPath, defaultPdfDir, ymdLocal,
  listSystemPrinters, drawingPrintOptions, autoLandscapeFile, printDrawingPdfsSilent,
};
