'use strict';
// Print drawings from the parts list: drawing-PDF filter, include selection, silent Electron print.
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'parts', 'printDrawings.mjs')).href);

const drawing = (o) => ({ partNo: '518310', status: 'accepted', material: { normalized: 'Aluminium 6061' }, drawing: { path: '/job/518310-A-PD-01.pdf', name: '518310-A-PD-01.pdf', pages: [{ n: 1, width: 1600, height: 1000 }] }, ...o });

test('drawing PDF filter keeps drawings and excludes route cards, certificates, specs, emails', async () => {
  const D = await load();
  assert.equal(D.isDrawingPdfName('518310-A-PD-01.pdf', false), true);
  assert.equal(D.isDrawingPdfName('part-drawing.pdf', false), true);
  assert.equal(D.isDrawingPdfName('שרטוט.pdf', false), true);
  assert.equal(D.isDrawingPdfName('518310-A-PD-01.pdf', true), true);
  for (const n of ['route-card.pdf', 'ROUTING_CHART.pdf', 'כרטיס_מסלול.pdf', 'COC_518310.pdf', 'mill-cert.pdf', 'material-certificate.pdf', '518310-spec.pdf', 'RAFDOCS-12.pdf', '518310-A-PAS.pdf', '518310-A-MLED.pdf', 'parts-list.pdf', 'mail.msg', 'note.eml', 'model.step', '518310.tif']) {
    assert.equal(D.isDrawingPdfName(n, false), false, n);
    assert.equal(D.isExcludedJobFile(n) || !D.isPdfName(n), true, n);
  }
  assert.equal(D.isDrawingPdfName('random-notes.pdf', false), false, 'do not guess a leftover PDF');
  assert.equal(D.isDrawingPdfName('random-notes.pdf', true), true, 'trusted pipeline drawing is kept');
});

test('selection uses include checkboxes; select-all flips every part', async () => {
  const D = await load();
  const parts = [
    drawing({ partNo: 'A' }),
    drawing({ partNo: 'B', status: 'rejected', material: { normalized: 'Steel' } }),
    drawing({ partNo: 'C', includeInReport: false }),
  ];
  const st0 = D.includeState(parts);
  assert.deepEqual(st0, { total: 3, selected: 1, all: false, none: false, some: true });
  assert.deepEqual(D.selectedIndexes(parts), [0]);
  const all = D.setIncludeAll(parts, true);
  assert.deepEqual(D.includeState(all), { total: 3, selected: 3, all: true, none: false, some: false });
  assert.deepEqual(D.selectedIndexes(all), [0, 1, 2]);
  const none = D.setIncludeAll(parts, false);
  assert.deepEqual(D.includeState(none), { total: 3, selected: 0, all: false, none: true, some: false });
});

test('print plan lists drawing PDFs and missing parts without guessing', async () => {
  const D = await load();
  const withDraw = drawing({});
  const noDraw = { partNo: 'NO-DWG', status: 'accepted', material: { normalized: 'Aluminium 6061' }, packageFiles: ['NO-DWG-spec.pdf', 'NO-DWG-route-card.pdf', 'mail.msg'] };
  const tiffOnly = { partNo: 'TIF', status: 'accepted', material: { normalized: 'Aluminium 6061' }, drawing: { path: '/job/TIF.tif', name: 'TIF.tif' } };
  const extras = ['/job/518310-A-PD-01.pdf', '/job/518310-spec.pdf'];
  const plan = D.printDrawingsPlan([withDraw, noDraw, tiffOnly], extras);
  assert.equal(plan.selected, 3);
  assert.equal(plan.ready.length, 1);
  assert.equal(plan.ready[0].files[0].path, '/job/518310-A-PD-01.pdf');
  assert.deepEqual(plan.missing.map((m) => m.partNo), ['NO-DWG', 'TIF']);
  assert.ok(!plan.files.some((f) => /spec|route|mail/i.test(f.path)));
  const namedOnly = { partNo: '518310', status: 'accepted', material: { normalized: 'Aluminium 6061' }, packageFiles: ['518310-A-PD-01.pdf', '518310-spec.pdf'] };
  const resolved = D.printDrawingsPlan([namedOnly], extras);
  assert.equal(resolved.ready.length, 1);
  assert.equal(resolved.ready[0].files[0].path, '/job/518310-A-PD-01.pdf');
  assert.equal(resolved.ready[0].files.length, 1);
  const unchecked = D.printDrawingsPlan([{ ...noDraw, includeInReport: false }]);
  assert.equal(unchecked.selected, 0);
  assert.equal(unchecked.files.length, 0);
});

test('printer, paper and copies helpers', async () => {
  const D = await load();
  assert.equal(D.normalizePaperSize('A3'), 'A3');
  assert.equal(D.normalizePaperSize('a3'), 'A3');
  assert.equal(D.normalizePaperSize('letter'), 'A4');
  assert.equal(D.normalizeCopies(0), 1);
  assert.equal(D.normalizeCopies(120), 99);
  assert.equal(D.normalizeCopies('3'), 3);
  assert.equal(D.autoLandscape({ width: 1600, height: 1000 }), true);
  assert.equal(D.autoLandscape({ width: 800, height: 1100 }), false);
  const printers = [{ name: 'HP', isDefault: false }, { name: 'Office', isDefault: true }];
  assert.equal(D.pickDefaultPrinter(printers, 'HP'), 'HP');
  assert.equal(D.pickDefaultPrinter(printers, 'Gone'), 'Office');
  assert.equal(D.pickDefaultPrinter([], ''), '');
  const payload = D.printPayloadOf({ files: [{ path: '/a.pdf' }] }, { printer: 'HP', paperSize: 'A3', copies: 2, fit: true });
  assert.deepEqual(payload, { files: [{ path: '/a.pdf' }], printer: 'HP', paperSize: 'A3', copies: 2, fit: true, landscape: 'auto' });
});

test('UI: select-all, print-drawings button, MRT dialog, equal-height toolbar', () => {
  const tri = src('src/components/wizard/TriageView.tsx');
  assert.match(tri, /tri-include-all/);
  assert.match(tri, /tri-print-drawings/);
  assert.match(tri, /tri\.printDrawings/);
  assert.match(tri, /PrintDrawingsDialog/);
  assert.match(tri, /disabled=\{!picked\.selected\}/);
  const dlg = src('src/components/wizard/PrintDrawingsDialog.tsx');
  assert.match(dlg, /print-drawings-printer/);
  assert.match(dlg, /print-drawings-paper/);
  assert.match(dlg, /print-drawings-fit/);
  assert.match(dlg, /print-drawings-copies/);
  assert.match(dlg, /print-drawings-preview/);
  assert.match(dlg, /print-drawings-go/);
  assert.match(dlg, /print-drawings-cancel/);
  assert.match(dlg, /print-drawings-missing/);
  assert.match(dlg, /printDrawings\?/);
  assert.match(src('src/ProjectView.tsx'), /onPrinted/);
  assert.match(src('src/components/wizard/StepCheckParts.tsx'), /onPatchAll/);
  const css = src('src/styles/wizard.css');
  assert.match(css, /qr-print-draw-side/);
  assert.match(css, /qr-print-draw-actions button[\s\S]*height: 40px/);
  assert.match(css, /qr-tri-bar button[\s\S]*height: 40px/);
});

test('IPC: printers list and silent drawing PDF print', () => {
  const pre = src('electron/preload.cjs');
  assert.match(pre, /printers:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('qr:printers'\)/);
  assert.match(pre, /printDrawings:\s*\(payload\)\s*=>\s*ipcRenderer\.invoke\('qr:printDrawings'/);
  const main = src('electron/main.cjs');
  assert.match(main, /ipcMain\.handle\('qr:printers'/);
  assert.match(main, /ipcMain\.handle\('qr:printDrawings'/);
  assert.match(main, /printDrawingPdfsSilent/);
  assert.match(main, /lastPrinter/);
  assert.match(main, /lastPaperSize/);
});

test('silent print sends each drawing PDF to the chosen printer', async () => {
  const P = require('../electron/qrPrint.cjs');
  const printed = [];
  const wc = {
    once(ev, cb) { if (ev === 'did-finish-load') setImmediate(cb); },
    print(opts, cb) { printed.push(opts); setImmediate(() => cb(true)); },
  };
  const w = { webContents: wc, loadURL() {}, isDestroyed: () => false, destroy() {} };
  const r = await P.printDrawingPdfsSilent({
    files: [{ path: '/tmp/a.pdf', width: 1600, height: 1000 }, { path: '/tmp/b.pdf', width: 800, height: 1100 }],
    options: { deviceName: 'HP', paperSize: 'A3', copies: 2, landscape: 'auto', fit: true },
    BrowserWindow: function () { return w; },
    existsFn: () => true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.printed, 2);
  assert.equal(printed.length, 2);
  assert.equal(printed[0].silent, true);
  assert.equal(printed[0].deviceName, 'HP');
  assert.equal(printed[0].pageSize, 'A3');
  assert.equal(printed[0].copies, 2);
  assert.equal(printed[0].landscape, true);
  assert.equal(printed[1].landscape, false);
  assert.equal(printed[0].margins.marginType, 'none');
  const opts = P.drawingPrintOptions({ width: 800, height: 1100 }, { paperSize: 'A4', copies: 1, fit: false, landscape: 'auto' });
  assert.equal(opts.silent, true);
  assert.equal(opts.pageSize, 'A4');
  assert.equal(opts.margins.marginType, 'printableArea');
});

test('settings remember last printer and paper size', () => {
  const S = require('../core/settings.cjs');
  assert.strictEqual(S.normalizeSettings({}).lastPrinter, '');
  assert.strictEqual(S.normalizeSettings({}).lastPaperSize, 'A4');
  assert.strictEqual(S.normalizeSettings({ lastPrinter: 'HP Laser', lastPaperSize: 'A3' }).lastPrinter, 'HP Laser');
  assert.strictEqual(S.normalizeSettings({ lastPaperSize: 'A3' }).lastPaperSize, 'A3');
  assert.strictEqual(S.normalizeSettings({ lastPaperSize: 'Letter' }).lastPaperSize, 'A4');
});

test('Print drawings translations exist in EN and HE; Hebrew button has no Latin', () => {
  const en = JSON.parse(src('src/i18n/en.json'));
  const he = JSON.parse(src('src/i18n/he.json'));
  for (const k of ['tri.printDrawings', 'tri.printDrawingsN', 'tri.includeAll', 'tip.printDrawings', 'print.drawings', 'print.printer', 'print.paper', 'print.fit', 'print.copies', 'print.preview', 'print.go', 'print.missing', 'print.drawingsDone']) {
    assert.ok(en[k] && he[k], k);
  }
  assert.equal(en['tri.printDrawings'], 'Print drawings');
  assert.equal(he['tri.printDrawings'], 'הדפס שרטוטים');
  assert.ok(!/[A-Za-z]/.test(he['tri.printDrawings']));
  assert.ok(!/[A-Za-z]/.test(he['print.go']));
});
