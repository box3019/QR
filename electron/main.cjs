'use strict';
// QR main process: window, settings, pipeline (PDF text + OCR + analysis), previews and exports.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { runPipeline } = require('../core/pipeline.cjs');
const { renderPreview } = require('../core/pdf.cjs');
const { DEFAULT_ALLOW } = require('../core/analyze.cjs');
const { questionsHtml, questionsText, buildQuestions } = require('../core/questions.cjs');

app.setName('QR');
const settingsFile = () => path.join(app.getPath('userData'), 'qr-settings.json');
const DEFAULTS = {
  textSize: 'normal',
  questionsLanguage: 'he',
  ocrDpi: 400,
  ocr: true,
  materials: DEFAULT_ALLOW.map((m) => ({ ...m, enabled: true })),
  companyFolder: '',
  searchRoots: ['\\\\fileserver-sr\\erp$\\Inspection'],
};
function loadSettings() { try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch { return { ...DEFAULTS }; } }
function saveSettings(s) { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2)); }
const langPath = () => (app.isPackaged ? path.join(process.resourcesPath, 'ocr') : path.join(__dirname, '..', 'ocr'));

let win = null;
let lastResult = { parts: [], unknown: [], files: [] };

function createWindow() {
  win = new BrowserWindow({
    title: 'QR', width: 1600, height: 980, minWidth: 1100, minHeight: 700, show: false, backgroundColor: '#f1f5f9',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  win.removeMenu();
  win.on('page-title-updated', (e) => e.preventDefault());
  const devUrl = process.env.QR_DEV_URL;
  if (devUrl) win.loadURL(devUrl); else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => { if (process.env.QR_MAXIMIZE !== '0') win.maximize(); win.show(); });
}

const slim = (part) => part; // pipeline already strips tokens from parts
ipcMain.handle('qr:getSettings', () => loadSettings());
ipcMain.handle('qr:setSettings', (_e, s) => { const n = { ...loadSettings(), ...s }; saveSettings(n); return n; });
ipcMain.handle('qr:pickFiles', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Drawings, models, ZIP', extensions: ['pdf', 'zip', 'step', 'stp', 'igs', 'iges', 'sldprt', 'x_t'] }, { name: 'All files', extensions: ['*'] }] });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('qr:pickFolder', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); return r.canceled ? '' : r.filePaths[0]; });
ipcMain.handle('qr:process', async (e, paths) => {
  const s = loadSettings();
  const emit = (ev) => { try { e.sender.send('qr:event', ev.type === 'part' ? { ...ev, part: slim(ev.part) } : ev); } catch {} };
  const t0 = Date.now();
  const res = await runPipeline(paths, { ...s, langPath: langPath(), materials: (s.materials || []).filter((m) => m.enabled !== false) }, emit);
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
ipcMain.handle('qr:openPath', (_e, p) => shell.showItemInFolder(p));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
