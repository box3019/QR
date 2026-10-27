'use strict';
// QR main process: window, settings, pipeline (PDF text + OCR + analysis), previews and exports.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { runPipeline } = require('../core/pipeline.cjs');
const { createMainWindow } = require('./window.cjs');
const { saveOutlookSelection } = require('../core/email/outlook.cjs');
const { renderPreview } = require('../core/pdf.cjs');
const { normalizeSettings, catalogOf } = require('../core/settings.cjs');
const { entryPattern } = require('../core/catalog/index.cjs');
const { newCustomer } = require('../core/customers/index.cjs');
const { questionsHtml, questionsText, buildQuestions, sampleQuestion, localizePart } = require('../core/questions.cjs');

app.setName('QR');
// Isolated profile for automated tests (own settings + own single-instance lock), never used by the shortcuts.
if (process.env.QR_PROFILE_DIR) app.setPath('userData', process.env.QR_PROFILE_DIR);
// Startup log: %APPDATA%\QR\logs\main.log is written on every start so a silent failure is always diagnosable.
function mainLog(msg) {
  try { const f = path.join(app.getPath('userData'), 'logs', 'main.log'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.appendFileSync(f, `[${new Date().toISOString()}] [${process.pid}] ${msg}\n`); } catch {}
}
mainLog(`start v${app.getVersion()} exe=${process.execPath} packaged=${app.isPackaged}`);
// Never show the main-process crash dialog: log to %APPDATA%\QR\qr-error.log and keep running.
function logError(kind, e) {
  try { const f = path.join(app.getPath('userData'), 'qr-error.log'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.appendFileSync(f, `[${new Date().toISOString()}] ${kind}: ${(e && e.stack) || e}\n`); } catch {}
  try { win && win.webContents.send('qr:event', { type: 'error', text: `${kind}: ${(e && e.message) || e}` }); } catch {}
}
process.on('uncaughtException', (e) => { mainLog('uncaughtException ' + ((e && e.stack) || e)); logError('uncaughtException', e); });
process.on('unhandledRejection', (e) => logError('unhandledRejection', e));
const settingsFile = () => path.join(app.getPath('userData'), 'qr-settings.json');
function loadSettings() { let raw = null; try { raw = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch {} return normalizeSettings(raw); }
function saveSettings(s) { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2)); }
const sevenZipPath = () => (app.isPackaged ? path.join(process.resourcesPath, '7zip', '7z.exe') : path.join(__dirname, '..', 'vendor', '7zip', '7z.exe'));
const langPath = () => (app.isPackaged ? path.join(process.resourcesPath, 'ocr') : path.join(__dirname, '..', 'ocr'));

let win = null;
let lastResult = { parts: [], unknown: [], files: [] };

function createWindow() {
  win = createMainWindow({ log: mainLog, stateFile: path.join(app.getPath('userData'), 'window.json'), maximize: process.env.QR_MAXIMIZE !== '0', icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false } });
  const devUrl = process.env.QR_DEV_URL;
  if (devUrl) win.loadURL(devUrl); else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

const slim = (part) => part; // pipeline already strips tokens from parts
ipcMain.handle('qr:getSettings', () => loadSettings());
ipcMain.handle('qr:questionSample', (_e, lang) => sampleQuestion(lang));
ipcMain.handle('qr:newCustomer', (_e, from, ids) => newCustomer(from, ids));
ipcMain.handle('qr:catalogPatterns', (_e, entries) => (entries || []).map((x) => entryPattern(x) || ''));
ipcMain.handle('qr:setSettings', (_e, s) => { const n = normalizeSettings({ ...loadSettings(), ...s }); saveSettings(n); return n; });
ipcMain.handle('qr:pickFiles', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Drawings, models, ZIP/RAR/7z, e-mails', extensions: ['pdf', 'zip', 'rar', '7z', 'msg', 'eml', 'step', 'stp', 'igs', 'iges', 'sldprt', 'x_t', 'x_b'] }, { name: 'All files', extensions: ['*'] }] });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('qr:pickFolder', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); return r.canceled ? '' : r.filePaths[0]; });
ipcMain.handle('qr:process', async (e, paths, job) => {
  const s = loadSettings();
  const emit = (ev) => { try { e.sender.send('qr:event', { ...(ev.type === 'part' ? { ...ev, part: slim(ev.part) } : ev), job: job || null }); } catch {} };
  const t0 = Date.now();
  const res = await runPipeline(paths, { ...s, langPath: langPath(), ocrCachePath: path.join(app.getPath('userData'), 'ocr-cache'), libraryBase: app.getPath('userData'), sevenZip: sevenZipPath(), catalog: catalogOf(s), customers: s.customers }, (ev) => { if (ev && ev.part) localizePart(ev.part); emit(ev); });
  (res.parts || []).forEach(localizePart);
  res.seconds = Math.round((Date.now() - t0) / 1000);
  lastResult = res;
  return res;
});
ipcMain.handle('qr:preview', async (_e, file, page, maxPx) => {
  const r = await renderPreview(file, page, maxPx || 2400);
  return { ...r, png: 'data:image/png;base64,' + Buffer.from(r.png).toString('base64') };
});

async function htmlToPdf(html, out) {
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const pdf = await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'default' } });
  w.destroy();
  fs.writeFileSync(out, pdf);
}
async function pickSave(defName, filters, target) {
  if (target) return target; // used by automated tests
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), defName), filters });
  return r.canceled ? '' : r.filePath;
}
ipcMain.handle('qr:questionsPreview', (_e, parts, lang) => ({ html: questionsHtml(parts, lang), groups: buildQuestions(parts, lang) }));
ipcMain.handle('qr:exportQuestions', async (_e, parts, lang, target) => {
  const first = parts[0] || {};
  const out = await pickSave(`Questions_${first.partNo || 'QR'}_${lang}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }], target);
  if (!out) return null;
  await htmlToPdf(questionsHtml(parts, lang, { customer: first.customer }), out);
  const txt = out.replace(/\.pdf$/i, '') + '.txt';
  fs.writeFileSync(txt, '\ufeff' + questionsText(parts, lang), 'utf8');
  return { pdf: out, txt };
});
function summaryRows(parts) {
  return parts.map((p) => ({ Part: p.partNo, Rev: p.rev, Customer: p.customer, Title: p.title, Material: p.material?.normalized || p.material?.raw || '', Status: p.status === 'rejected' ? 'Rejected: ' + p.rejectReason : 'Accepted', Readiness: p.readiness, Blockers: p.problems.filter((x) => x.severity === 'Blocker').length, Questions: p.problems.filter((x) => x.severity === 'Question').length, Tasks: p.tasks.filter((t) => t.status !== 'done').length, Model: p.model ? path.basename(p.model.path) : 'not found', 'Text mode': p.textMode }));
}
ipcMain.handle('qr:exportSummary', async (_e, parts, kind, target) => {
  const rows = summaryRows(parts);
  const out = await pickSave(`QR_Order_Summary.${kind}`, [{ name: kind.toUpperCase(), extensions: [kind] }], target);
  if (!out) return null;
  if (kind === 'csv') {
    const cols = Object.keys(rows[0] || { Part: '' });
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    fs.writeFileSync(out, '\ufeff' + [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\r\n'), 'utf8');
  } else {
    const cols = Object.keys(rows[0] || { Part: '' });
    const e = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    await htmlToPdf(`<!doctype html><meta charset="utf-8"><style>body{font-family:'Segoe UI',Arial;font-size:11px;margin:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #94a3b8;padding:4px 6px;text-align:left}th{background:#e2e8f0}</style><h2>QR order summary</h2><p>${new Date().toLocaleString('en-GB')}</p><table><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td>${e(r[c])}</td>`).join('')}</tr>`).join('')}</table>`, out);
  }
  return { path: out };
});
ipcMain.handle('qr:exportReport', async (_e, parts, lang, meta, target) => {
  const { reportHtml } = require('../core/report.cjs'); const m = meta || {};
  const out = await pickSave(`QR_Report_${String(m.rfq || (parts[0] || {}).partNo || 'RFQ').replace(/[^\w.-]+/g, '_')}_${lang}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }], target);
  if (!out) return null;
  await htmlToPdf(reportHtml(parts || [], lang, m), out);
  const docs = require('../core/standards/export.cjs').copyStandardDocs(parts || [], out.replace(/\.pdf$/i, '') + '_standards');
  return { path: out, docs };
});
ipcMain.handle('qr:exportRequirements', async (_e, parts, target) => {
  const { buildSheets } = require('../core/requirements/sheets.cjs'); const { writeXlsx } = require('../core/requirements/xlsx.cjs');
  const pages = (parts || []).flatMap((p) => (p.requirements || []).map((r) => ({ file: p.drawing.name, ...r })));
  const out = await pickSave('QR_Requirements.xlsx', [{ name: 'Excel', extensions: ['xlsx'] }], target);
  if (!out) return null;
  fs.writeFileSync(out, writeXlsx(buildSheets(pages)));
  return { path: out };
});
// projects (tabs): %APPDATA%\QR\projects\<id>, reopened on restart
const projects = require('../core/projects.cjs');
ipcMain.handle('qr:projects:list', () => projects.listProjects(app.getPath('userData')));
ipcMain.handle('qr:projects:save', (_e, id, data) => projects.saveProject(app.getPath('userData'), id, data));
ipcMain.handle('qr:projects:index', (_e, idx) => projects.saveIndex(app.getPath('userData'), idx));
const history = require('../core/history.cjs');
ipcMain.handle('qr:history:list', () => history.readHistory(app.getPath('userData')));
ipcMain.handle('qr:history:touch', (_e, entry) => history.touchHistory(app.getPath('userData'), entry).list);
ipcMain.handle('qr:history:remove', (_e, id, deleteData) => history.removeHistory(app.getPath('userData'), id, !!deleteData));
ipcMain.handle('qr:projects:load', (_e, id) => history.loadProject(app.getPath('userData'), id));
ipcMain.handle('qr:peekRfq', (_e, paths) => projects.peekRfq(paths, require('../core/email/readers.cjs').readMail));
ipcMain.handle('qr:outlookSelection', () => saveOutlookSelection(path.join(app.getPath('temp'), 'qr-outlook', String(Date.now()))));
ipcMain.handle('qr:std:confirm', (_e, s, customer) => require('../core/standards/index.cjs').confirmStandard(app.getPath('userData'), s, customer));
ipcMain.handle('qr:std:upload', async (_e, s, customer, owner) => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'PDF', extensions: ['pdf'] }, { name: 'All files', extensions: ['*'] }] });
  if (r.canceled) return null;
  return require('../core/standards/index.cjs').uploadStandard(app.getPath('userData'), { id: s.std, rev: s.rev || '', customer, file: r.filePaths[0], owner, paid: s.paid });
});
ipcMain.handle('qr:std:open', (_e, file) => shell.openPath(file));
ipcMain.handle('qr:openPath', (_e, p) => shell.showItemInFolder(p));

// Single instance: a second launch focuses the existing window instead of starting a hidden duplicate.
// Outlook 'Send to QR': QR.exe --import <dir> (first launch or a second instance).
const { importArg, msgFiles } = require('./importArg.cjs');
let pendingImport = importArg(process.argv);
function sendImport(dir) { const files = msgFiles(dir); mainLog('import ' + dir + ' files=' + files.length); if (!files.length) return; if (win && !win.isDestroyed() && !win.webContents.isLoading()) win.webContents.send('qr:import', files); else pendingImport = dir; }
if (!app.requestSingleInstanceLock()) { mainLog('another instance holds the lock; exiting'); app.quit(); }
else {
  app.on('second-instance', (_e, argv) => { const d = importArg(argv || []); if (d) setTimeout(() => sendImport(d), 50); mainLog('second-instance: focusing'); if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } else createWindow(); });
  app.whenReady().then(() => { mainLog('ready'); createWindow(); win.webContents.once('did-finish-load', () => { if (pendingImport) { const d = pendingImport; pendingImport = null; setTimeout(() => sendImport(d), 300); } }); }).catch((e) => mainLog('whenReady failed ' + e));
  app.on('window-all-closed', () => app.quit());
}
app.on('window-all-closed', () => app.quit());
