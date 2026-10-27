'use strict';
// Excel look (header, borders, widths, freeze, autofilter, status colors) without changing the friend's cell values.
const test = require('node:test'); const assert = require('node:assert'); const zlib = require('zlib');
const { buildSheets, HEAD } = require('../core/requirements/sheets.cjs'); const { writeXlsx, tone } = require('../core/requirements/xlsx.cjs');
function unzip(b) { const out = {}; let o = 0; while (b.readUInt32LE(o) === 0x04034b50) { const cs = b.readUInt32LE(o + 18), nl = b.readUInt16LE(o + 26), el = b.readUInt16LE(o + 28); const name = b.slice(o + 30, o + 30 + nl).toString(); const d = b.slice(o + 30 + nl + el, o + 30 + nl + el + cs); out[name] = zlib.inflateRawSync(d).toString(); o += 30 + nl + el + cs; } return out; }
const un = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function values(xml) { return [...xml.matchAll(/<row [^>]*>(.*?)<\/row>/g)].map((r) => [...r[1].matchAll(/<c r="([A-Z])\d+"[^>]*?(?:\/>|>(.*?)<\/c>)/g)].map((c) => { const t = (c[2] || '').match(/<t[^>]*>([\s\S]*?)<\/t>/); const v = (c[2] || '').match(/<v>(.*?)<\/v>/); return t ? un(t[1]) : v ? Number(v[1]) : ''; })); }
const pages = [{ file: 'a.pdf', page: 1, status: 'OK', source: 'NOTES BLOCK', rows: [{ section: 'NOTES', no: '1', text: 'MATERIAL: AL 6061-T651 & <x>', extra: '', cat: 'Material' }], material: { family: 'AL', alloy: '6061', temper: 'T651', form: '', stds: '', dims: '', catno: '', qty: '', unit: '', src: 'MATERIAL' }, procs: [{ no: '2', process: 'ANODIZE', subtype: '', layer: '', detail: '', stds: '', typecls: '', thick: '', coats: '', color: '', hard: '', temp: '', case: '', flags: 'NO STANDARD', src: 's' }], masks: [], summary: { heatTreat: '', masking: '', coatings: 'ANODIZE', paint: '', flow: 'x', flagged: 1 } }, { file: 'b.pdf', page: 1, status: 'NEEDS_OCR', source: '', rows: [], procs: [], masks: [] }];
test('cell values are identical to the friend sheets (diff 0)', () => {
  const S = buildSheets(pages); const z = unzip(writeXlsx(S)); let diff = 0;
  Object.keys(HEAD).forEach((n, i) => { const got = values(z[`xl/worksheets/sheet${i + 1}.xml`]); const want = [HEAD[n], ...S[n]].map((r) => HEAD[n].map((_, j) => (r[j] == null ? '' : r[j])));
    assert.strictEqual(got.length, want.length, n); want.forEach((r, ri) => r.forEach((v, ci) => { if (String(got[ri][ci]) !== String(v)) diff++; })); });
  assert.strictEqual(diff, 0);
});
test('professional look: header fill, borders, freeze, autofilter, widths, print title', () => {
  const z = unzip(writeXlsx(buildSheets(pages))); const st = z['xl/styles.xml'], s1 = z['xl/worksheets/sheet1.xml'];
  assert.match(st, /patternType="solid"><fgColor rgb="FF1E3A8A"/); assert.match(st, /<left style="thin">/);
  assert.match(s1, /state="frozen"/); assert.match(s1, /<autoFilter ref="A1:H2"\/>/); assert.match(s1, /customWidth="1"/); assert.match(s1, /oddHeader>.*QR/);
  assert.match(s1, /<c r="A1"[^>]* s="1"/);
});
test('status cells colored like the UI', () => {
  assert.strictEqual(tone('Summary', 2, 'OK'), 'ok'); assert.strictEqual(tone('Summary', 2, 'NEEDS_OCR'), 'warn'); assert.strictEqual(tone('Summary', 2, 'NOT_FOUND'), 'bad');
  assert.strictEqual(tone('Processes', 15, 'NO STANDARD'), 'warn'); assert.strictEqual(tone('Process summary', 7, 0), 'ok');
});
