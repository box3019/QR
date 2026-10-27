'use strict';
// Summary PDF report template: header, groups with colored labels, per-part sections, questions, documents; HE RTL.
const test = require('node:test'); const assert = require('node:assert'); const path = require('path'); const { pathToFileURL } = require('url');
const { reportHtml, plainStatus, LABELS } = require('../core/report.cjs');
const part = (o) => ({ partNo: 'P1', rev: 'A', customer: 'ACME', title: 'BRACKET', problems: [], tasks: [], route: [{ seq: '10', type: 'machining', title: 'MACHINE', items: [] }], material: { normalized: 'Aluminium 6061-T651' }, requirements: [{ summary: { heatTreat: 'T6', coatings: 'ANODIZE', paint: 'PRIMER', masking: 'THREADS' } }], ...o });
const parts = [part({}), part({ partNo: 'P2', tasks: [{ type: 'uploadDocument', refNumber: 'SPEC-9', title: 'x', status: 'open' }] }), part({ partNo: 'P3', problems: [{ severity: 'Question', message: 'Range 1.5 - 1.2: min is larger than max.', status: 'open' }] })];
test('EN report has header, groups, part facts, questions, documents', () => {
  const h = reportHtml(parts, 'en', { rfq: 'RFQ-77', customer: 'ACME', date: '27/10/2026' });
  for (const s of ['class="logo">QR', 'RFQ-77', 'ACME', '27/10/2026', 'Fits us', 'Needs document', 'Needs customer answer', 'Aluminium 6061-T651', 'T6', 'ANODIZE', 'PRIMER', 'THREADS', 'MACHINE', 'SPEC-9', 'min is larger']) assert.ok(h.includes(s), s);
  assert.match(h, /dir="ltr"/); assert.match(h, /class="st" style="background:#dcfce7/);
});
test('HE report is RTL and its labels have no Latin', () => {
  const h = reportHtml(parts, 'he', { rfq: 'RFQ-77' }); assert.match(h, /dir="rtl"/); assert.ok(h.includes('בטווח 1.5 - 1.2'));
  const walk = (o) => (typeof o === 'string' ? assert.doesNotMatch(o, /[A-Za-z]/, o) : Object.values(o).forEach(walk)); walk(LABELS.he);
});
test('report groups use the same rule as the Parts list', async () => {
  const g = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'parts', 'groups.mjs')).href);
  for (const p of [...parts, part({ status: 'rejected' }), part({ status: 'pending' }), part({ problems: [{ internal: true, status: 'open' }] })]) assert.strictEqual(plainStatus(p), g.plainStatus(p));
});
test('Summary has Export PDF with tooltip, EN/HE keys', () => {
  const s = require('fs').readFileSync(path.join(__dirname, '..', 'src', 'components', 'wizard', 'StepSummary.tsx'), 'utf8'); assert.match(s, /btn-export-pdf" title=\{t\('tip.exportPdf'\)\}/);
  const he = require('../src/i18n/he.json'), en = require('../src/i18n/en.json'); for (const k of ['wz.secPdf', 'wz.pdfBtn', 'wz.pdfText', 'tip.exportPdf']) { assert.ok(en[k] && he[k], k); assert.doesNotMatch(he[k], /[A-Za-z]/); }
});
