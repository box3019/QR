'use strict';
// Report print: hidden window + empty-guard + Acrobat registry resolver. Does not print the live UI.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const os = require('os');
const { reportHtml } = require('../core/report.cjs');
const P = require('../electron/qrPrint.cjs');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');

const part = (o) => ({ partNo: 'P1', rev: 'A', customer: 'ACME', title: 'BRACKET', problems: [], tasks: [], route: [{ seq: '10', type: 'machining', title: 'MACHINE', items: [] }], material: { normalized: 'Aluminium 6061-T651' }, ...o });

test('print CSS does not hide the whole page with mrt-print-root', () => {
  const css = src('src/styles/base.css');
  assert.ok(!/body \*\s*\{[^}]*visibility:\s*hidden/.test(css), 'must not hide body *');
  const print = css.slice(css.indexOf('@media print'));
  assert.ok(!/visibility:\s*hidden\s*!important/.test(print.split('.mrt-print-root table')[0] || print), 'no visibility-hidden print trap');
});

test('partsForPrint: part card on steps 2/3, summary on step 4, package mode lists all', () => {
  const parts = [part({}), part({ partNo: 'P2' })];
  assert.deepStrictEqual(P.partsForPrint(parts, 2, 1).map((x) => x.partNo), ['P2']);
  assert.deepStrictEqual(P.partsForPrint(parts, 3, 0).map((x) => x.partNo), ['P1']);
  assert.deepStrictEqual(P.partsForPrint(parts, 4, 0).map((x) => x.partNo), ['P1', 'P2']);
  assert.deepStrictEqual(P.partsForPrint(parts, 1, 0).map((x) => x.partNo), ['P1', 'P2']);
  assert.deepStrictEqual(P.partsForPrint(parts, 2, 1, { mode: 'package' }).map((x) => x.partNo), ['P1', 'P2']);
  assert.deepStrictEqual(P.partsForPrint(parts, 2, 0, { mode: 'part', partOpen: true }).map((x) => x.partNo), ['P1']);
  assert.deepStrictEqual(P.partsForPrint(parts, 4, 0, { partOpen: false }).map((x) => x.partNo), ['P1', 'P2']);
});

test('empty-guard: body height and rows', () => {
  assert.strictEqual(P.isPrintDocumentReady({ bodyHeight: 400, rowCount: 3 }), true);
  assert.strictEqual(P.isPrintDocumentReady({ bodyHeight: 40, rowCount: 10 }), false);
  assert.strictEqual(P.isPrintDocumentReady({ bodyHeight: 400, rowCount: 0 }), false);
  assert.strictEqual(P.isPrintDocumentReady(null), false);
  assert.strictEqual(P.EMPTY_PRINT_ERROR, 'Print document rendered empty');
});

test('registry resolver: Acrobat UserChoice uses /p, others openPath', async () => {
  const acro = P.resolvePdfOpenCommand((key, name) => {
    if (key.includes('UserChoice') && name === 'ProgId') return 'Acrobat.Document.DC';
    if (key.includes('Acrobat.Document.DC')) return '"C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe" "%1"';
    return '';
  });
  assert.ok(P.isAcrobatExe(acro.exe));
  const spawned = [];
  const r = await P.openPdfForPrint({
    pdfPath: 'C:\\tmp\\a.pdf',
    spawnFn: (exe, args, opts) => { spawned.push({ exe, args, opts }); return { unref() {} }; },
    resolve: () => acro,
    shell: { openPath: async () => { throw new Error('should not openPath for Acrobat'); } },
  });
  assert.strictEqual(r.method, 'acrobat');
  assert.deepStrictEqual(spawned[0].args, ['/p', 'C:\\tmp\\a.pdf']);
  assert.strictEqual(spawned[0].opts.detached, true);

  const chrome = P.resolvePdfOpenCommand((key, name) => {
    if (key.includes('UserChoice') && name === 'ProgId') return 'ChromeHTML';
    if (key.includes('ChromeHTML')) return '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" -- "%1"';
    return '';
  });
  assert.ok(!P.isAcrobatExe(chrome.exe));
  let opened = '';
  const r2 = await P.openPdfForPrint({ pdfPath: 'C:\\tmp\\b.pdf', resolve: () => chrome, shell: { openPath: async (p) => { opened = p; return ''; } } });
  assert.strictEqual(r2.method, 'openPath'); assert.strictEqual(opened, 'C:\\tmp\\b.pdf');
});

test('launchElectronHtmlPrintDialog rejects an empty document', async () => {
  const wc = {
    once(ev, cb) { if (ev === 'did-finish-load') setImmediate(cb); },
    executeJavaScript: async () => ({ bodyHeight: 10, rowCount: 0 }),
    printToPDF: async () => { throw new Error('printToPDF should not run'); },
    print() { throw new Error('print should not run'); },
  };
  const w = { webContents: wc, loadFile() {}, isDestroyed: () => false, destroy() {} };
  await assert.rejects(() => P.launchElectronHtmlPrintDialog({ html: '<html><body></body></html>', BrowserWindow: function () { return w; } }), /Print document rendered empty/);
});

test('launchElectronHtmlPrintDialog printToPDF is non-empty then opens the PDF', async () => {
  const html = reportHtml([part({})], 'en', { rfq: 'RFQ-77' });
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(4000, 65), Buffer.from('\nQR RFQ-77 Aluminium\n%%EOF')]);
  let printed = false;
  const wc = {
    once(ev, cb) { if (ev === 'did-finish-load') setImmediate(cb); },
    executeJavaScript: async () => ({ bodyHeight: 500, rowCount: 8 }),
    printToPDF: async (opts) => { printed = true; assert.strictEqual(opts.pageSize, 'A4'); assert.strictEqual(opts.printBackground, true); return pdf; },
    print: (opts, cb) => cb(true),
  };
  const w = { webContents: wc, loadFile() {}, isDestroyed: () => false, destroy() {} };
  let opened = '';
  const r = await P.launchElectronHtmlPrintDialog({
    html, BrowserWindow: function () { return w; },
    shell: { openPath: async (p) => { opened = p; return ''; } },
    resolvePdf: () => ({ exe: 'chrome.exe', progId: 'ChromeHTML' }),
  });
  assert.ok(printed); assert.ok(r.ok); assert.ok(r.bytes > 2048); assert.ok(opened && fs.existsSync(opened));
  const disk = fs.readFileSync(opened);
  assert.ok(disk.length > 2048); assert.ok(disk.includes(Buffer.from('QR RFQ-77')));
  try { fs.unlinkSync(opened); } catch {}
});

test('printToPDF of the report is non-empty and has text', async () => {
  const html = reportHtml([part({}), part({ partNo: 'P2', problems: [{ severity: 'Question', message: 'Range 1.5 - 1.2: min is larger than max.', status: 'open' }] })], 'en', { rfq: 'RFQ-77', customer: 'ACME' });
  const electron = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  assert.ok(fs.existsSync(electron), 'Electron binary is required for printToPDF');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-pdf-'));
  const htmlFile = path.join(dir, 'report.html');
  const out = path.join(dir, 'report.pdf');
  const script = path.join(dir, 'render.cjs');
  fs.writeFileSync(htmlFile, html);
  fs.writeFileSync(script, `'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const htmlFile = process.env.QR_PDF_HTML;
const outFile = process.env.QR_PDF_OUT;
app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadFile(htmlFile);
  const buf = await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(outFile, buf);
  app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
`);
  const { spawnSync } = require('child_process');
  const r = spawnSync(electron, [script], { timeout: 60000, encoding: 'utf8', env: { ...process.env, ELECTRON_DISABLE_SANDBOX: '1', QR_PDF_HTML: htmlFile, QR_PDF_OUT: out } });
  assert.ok(fs.existsSync(out) && r.status === 0, 'printToPDF failed: ' + (r.status) + ' ' + String(r.stderr || r.stdout || '').slice(-400));
  const pdf = fs.readFileSync(out);
  assert.ok(pdf.length > 3000, 'PDF size ' + pdf.length);
  assert.ok(pdf.slice(0, 5).toString() === '%PDF-');
  const s = pdf.toString('latin1');
  assert.ok(/RFQ|ACME|QR|Fits|Aluminium/.test(s), 'PDF contains report text');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('saveElectronHtmlReportPdf via Electron writes a real PDF with text', async () => {
  const html = reportHtml([part({})], 'en', { rfq: 'RFQ-77', customer: 'ACME' });
  const electron = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  assert.ok(fs.existsSync(electron), 'Electron binary is required for Save PDF');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-savepdf-'));
  const htmlFile = path.join(dir, 'report.html');
  const out = path.join(dir, 'saved.pdf');
  const script = path.join(dir, 'save.cjs');
  fs.writeFileSync(htmlFile, html);
  fs.writeFileSync(script, `'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const P = require(process.env.QR_PRINT_MOD);
app.whenReady().then(async () => {
  const html = fs.readFileSync(process.env.QR_PDF_HTML, 'utf8');
  const r = await P.saveElectronHtmlReportPdf({ html, dest: process.env.QR_PDF_OUT, BrowserWindow });
  if (!r.ok || r.bytes < 3000) throw new Error('save too small ' + (r && r.bytes));
  app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
`);
  const { spawnSync } = require('child_process');
  const r = spawnSync(electron, [script], { timeout: 60000, encoding: 'utf8', env: { ...process.env, ELECTRON_DISABLE_SANDBOX: '1', QR_PDF_HTML: htmlFile, QR_PDF_OUT: out, QR_PRINT_MOD: require.resolve('../electron/qrPrint.cjs') } });
  assert.ok(fs.existsSync(out) && r.status === 0, 'Save PDF failed: ' + (r.status) + ' ' + String(r.stderr || r.stdout || '').slice(-400));
  const pdf = fs.readFileSync(out);
  assert.ok(pdf.length > 3000, 'PDF size ' + pdf.length);
  assert.ok(pdf.slice(0, 5).toString() === '%PDF-');
  assert.ok(/RFQ|ACME|QR|Fits|Aluminium/.test(pdf.toString('latin1')), 'saved PDF contains report text');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('print payload comes from the current step, not window.print of the live UI', () => {
  const app = src('src/App.tsx'); const main = src('electron/main.cjs'); const proj = src('src/ProjectView.tsx');
  assert.ok(/__qrPrintPayload/.test(proj) && /step/.test(proj));
  assert.ok(/partsForPrint/.test(main));
  assert.ok(!/win\.webContents\.print\(/.test(main));
  assert.ok(!/window\.print/.test(app));
});

test('Print and Save PDF share one hidden-window printToPDF function', () => {
  const p = src('electron/qrPrint.cjs'); const m = src('electron/main.cjs');
  assert.ok(/function renderReportPdfInHiddenWindow/.test(p));
  assert.ok(/async function launchElectronHtmlPrintDialog[\s\S]*renderReportPdfInHiddenWindow/.test(p));
  assert.ok(/async function saveElectronHtmlReportPdf[\s\S]*renderReportPdfInHiddenWindow/.test(p));
  assert.ok(/reportHtmlFromPayload/.test(m));
  const printH = m.slice(m.indexOf("ipcMain.handle('qr:print'"), m.indexOf("ipcMain.handle('qr:savePdf'"));
  const saveH = m.slice(m.indexOf("ipcMain.handle('qr:savePdf'"));
  assert.ok(/reportHtmlFromPayload/.test(printH) && /reportHtmlFromPayload/.test(saveH));
  assert.doesNotMatch(printH, /printToPDF/);
  assert.doesNotMatch(saveH, /printToPDF/);
});

test('report PDF file name uses part or quote, date, and sanitizes Windows characters', () => {
  const now = new Date(2026, 10, 2);
  const parts = [part({ partNo: 'P1:A/B' }), part({ partNo: 'P2' })];
  assert.strictEqual(P.reportPdfFileName({ parts, step: 2, sel: 0, meta: { label: 'RFQ-77' } }, now), 'P1_A_B_QR_report_2026-11-02.pdf');
  assert.strictEqual(P.reportPdfFileName({ parts, step: 4, sel: 0, meta: { label: 'RFQ 77?*' } }, now), 'RFQ 77_QR_report_2026-11-02.pdf');
  assert.strictEqual(P.sanitizeWinFileName('  con<>:"/\\|?*x  '), 'con_x');
  assert.strictEqual(P.defaultPdfDir('C:\\gone', 'D:\\Docs', () => false), 'D:\\Docs');
  assert.strictEqual(P.defaultPdfDir('C:\\keep', 'D:\\Docs', (p) => p === 'C:\\keep'), 'C:\\keep');
});

test('saveElectronHtmlReportPdf writes a non-empty PDF with text', async () => {
  const html = reportHtml([part({})], 'en', { rfq: 'RFQ-77' });
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(4000, 65), Buffer.from('\nQR RFQ-77 Aluminium\n%%EOF')]);
  const wc = {
    once(ev, cb) { if (ev === 'did-finish-load') setImmediate(cb); },
    executeJavaScript: async () => ({ bodyHeight: 500, rowCount: 8 }),
    printToPDF: async (opts) => { assert.strictEqual(opts.pageSize, 'A4'); assert.strictEqual(opts.printBackground, true); return pdf; },
    print() { throw new Error('Save PDF must not open the print dialog'); },
  };
  const w = { webContents: wc, loadFile() {}, isDestroyed: () => false, destroy() {} };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-save-pdf-'));
  const dest = path.join(dir, 'out.pdf');
  const r = await P.saveElectronHtmlReportPdf({ html, dest, BrowserWindow: function () { return w; } });
  assert.ok(r.ok); assert.strictEqual(r.path, dest); assert.ok(r.bytes > 2048);
  assert.ok(fs.existsSync(dest));
  const disk = fs.readFileSync(dest);
  assert.ok(disk.length > 2048);
  assert.ok(disk.slice(0, 5).toString() === '%PDF-');
  assert.ok(disk.includes(Buffer.from('QR RFQ-77')));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('last PDF folder is kept in settings', () => {
  const S = require('../core/settings.cjs');
  assert.strictEqual(S.normalizeSettings({}).lastPdfFolder, '');
  assert.strictEqual(S.normalizeSettings({ lastPdfFolder: 'D:/Reports' }).lastPdfFolder, 'D:/Reports');
  const m = src('electron/main.cjs');
  assert.ok(/lastPdfFolder:\s*path\.dirname/.test(m));
  assert.ok(/qr-notice/.test(src('src/App.tsx')) || /<Notice /.test(src('src/App.tsx')));
  assert.ok(!/qr-modal-bg/.test(src('src/App.tsx').slice(src('src/App.tsx').indexOf('btn-save-pdf'))));
});

test('save PDF CSS keeps the label on one line', () => {
  const css = src('src/styles/wizard.css') + src('src/styles/qr.css');
  assert.ok(/btn-save-pdf/.test(css));
  assert.ok(/btn-save-pdf[^}]*white-space:\s*nowrap/.test(css) || /btn-save-pdf'\] > span[\s\S]*white-space:\s*nowrap/.test(css));
});
