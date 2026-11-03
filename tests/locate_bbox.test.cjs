'use strict';
// Source boxes from the PDF text layer and from OCR word boxes. Synthetic PDFs only.
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('fs'); const path = require('path'); const os = require('os');
const Loc = require('../core/checklist/locate.cjs');
const { extractPdf, ocrWordBox } = require('../core/pdf.cjs');
const { buildChecklist } = require('../core/checklist/detect.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'qr-loc-'));
function textPdf(lines) {
  const ops = ['BT /F1 14 Tf'];
  lines.forEach((t, i) => { ops.push('72 ' + (720 - i * 22) + ' Td (' + t.replace(/[()\\]/g, '') + ') Tj'); if (i) ops[ops.length - 1] = '0 -22 Td (' + t.replace(/[()\\]/g, '') + ') Tj'; });
  ops[1] = '72 720 Td (' + lines[0].replace(/[()\\]/g, '') + ') Tj';
  const stream = ops.join('\n') + '\nET';
  return Buffer.from('%PDF-1.1\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length ' + stream.length + ' >>stream\n' + stream + '\nendstream\nendobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF\n');
}

test('findRuns: exact text run only, never a guessed prefix', () => {
  const tokens = [
    { text: 'ALUMINUM', x: 10, y: 20, w: 80, h: 12 },
    { text: '6061-T6', x: 95, y: 20, w: 60, h: 12 },
    { text: 'UNJ', x: 10, y: 200, w: 30, h: 10 },
    { text: '1/4-28', x: 44, y: 200, w: 40, h: 10 },
  ];
  const mat = Loc.findRuns(tokens, 'ALUMINUM 6061-T6');
  assert.equal(mat.length, 1); assert.ok(mat[0].w > 80); assert.ok(mat[0].x <= 10);
  const thr = Loc.findRuns(tokens, 'UNJ');
  assert.equal(thr.length, 1); assert.equal(thr[0].x, 10);
  assert.deepEqual(Loc.findRuns(tokens, 'TITANIUM'), []);
  assert.equal(Loc.locate({ tokens }, 'ZZZZ'), null);
});

test('placeAll: two exact hits become source.bbox[] on the same page', () => {
  const pages = [{ n: 1, tokens: [
    { text: 'MJ6x1', x: 40, y: 50, w: 40, h: 8 },
    { text: 'NOTE', x: 300, y: 400, w: 30, h: 8 },
    { text: 'MJ6x1', x: 340, y: 400, w: 40, h: 8 },
  ] }];
  const pl = Loc.placeAll(pages, 'MJ6x1');
  assert.equal(pl.page, 1); assert.equal(pl.bbox.length, 2);
  const it = Loc.attach({ key: 'mj', spec: 'MJ6x1' }, pages, 'MJ6x1');
  assert.equal(it.source.page, 1); assert.equal(it.source.bbox.length, 2);
  assert.ok(it.bbox && it.bbox.w > 0);
});

test('extractPdf: text-layer tokens carry a real page box for the run', async () => {
  const dir = tmp(); const f = path.join(dir, 't.pdf'); fs.writeFileSync(f, textPdf(['MATERIAL ALUMINUM 6061-T6 BAR', 'THREADS 1/4-28 UNJF-3B']));
  const pages = await extractPdf(f);
  assert.ok(pages[0].tokens.length >= 1);
  const hit = Loc.placeAll(pages, 'ALUMINUM');
  assert.ok(hit && hit.bbox[0].w > 0 && hit.bbox[0].h > 0);
  assert.ok(hit.bbox[0].x >= 0 && hit.bbox[0].x < pages[0].width);
  assert.ok(hit.bbox[0].y >= 0 && hit.bbox[0].y < pages[0].height);
  const ck = buildChecklist({ notes: ['MATERIAL ALUMINUM 6061-T6 BAR'], route: [], bom: [], material: { raw: 'ALUMINUM 6061-T6', normalized: 'Aluminium 6061-T6' }, status: 'ok' }, pages);
  const mat = ck.rows.material.items[0];
  assert.ok(mat.source && mat.source.page === 1 && mat.source.bbox.length >= 1);
});

test('ocrWordBox: tile offset, scale and 90-degree tile map back to page points', () => {
  const a = ocrWordBox({ x0: 10, y0: 20, x1: 50, y1: 40 }, 100, 200, 2, false, 400, 400);
  assert.equal(a.x, (10 + 100) / 2); assert.equal(a.y, (20 + 200) / 2); assert.equal(a.w, 20); assert.equal(a.h, 10);
  const r = ocrWordBox({ x0: 0, y0: 0, x1: 10, y1: 20 }, 0, 0, 1, true, 100, 80);
  assert.equal(r.x, 0); assert.equal(r.y, 80 - 10); assert.equal(r.w, 20); assert.equal(r.h, 10);
});

test('OCR tokens: exact run uses Tesseract word boxes, never a fake box', () => {
  const page = { n: 2, tokens: [
    { text: 'CONVERSION', x: 12, y: 88, w: 70, h: 9, source: 'ocr', conf: 0.81 },
    { text: 'COATING', x: 86, y: 88, w: 55, h: 9, source: 'ocr', conf: 0.77 },
  ] };
  const pl = Loc.placeAll([page], 'CONVERSION COATING');
  assert.equal(pl.page, 2);
  assert.ok(Math.abs(pl.bbox[0].x - 12) < 1 && pl.bbox[0].w > 70);
  assert.equal(Loc.placeAll([page], 'ANODIZE'), null);
});
