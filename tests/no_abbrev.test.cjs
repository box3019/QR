'use strict';
// No abbreviations anywhere in the UI text (same rule as MRT): full words in English and Hebrew. Unit symbols (mm, in, Ra, IT, mm in Hebrew) are not abbreviations.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const rd = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replace(/^\uFEFF/, '');
const EN_DOT = /\b(?:engr|asm|assy|spec|specs|insp|coat|dims?|qty|approx|incl|pcs|std|ref|rev|mfg|dwg|mat|tol|dia|max|min|nr|cat|temp|num|misc|config|thr|no|etc|eg|ie|vs)\.(?=\s|$|\)|,)/i;
const EN_SHORT = /\b(?:HT|dims|insp|Asm|Engr|Assy|qty|Tol|thr)\b|\b(?:Al|SS|Cu|CS)\s+\d/;
const HE_ABBR = /[\u05D0-\u05EA]["\u05F4][\u05D0-\u05EA]|[\u05D0-\u05EA]['\u05F3](?=\s|$)/;
const HE_UNITS = /(?:\u05DE|\u05E1|\u05E7)["\u05F4](?:\u05DE|\u05D2|\u05E8)/g; // mm, cm, kg, km: unit symbols
const HE_LOAN = /\u05D0\u05D9\u05E0\u05E5['\u05F3]|\u05D1\u05D6['\u05F3]/g; // loanwords spelled with a geresh (inch, beige), not abbreviations
const strings = (l) => Object.entries(JSON.parse(rd('src', 'i18n', l + '.json'))).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v.replace(/\{[^}]*\}/g, '')]); // placeholders such as {thr} are not text
test('English UI strings contain no abbreviations', () => {
  for (const [k, v] of strings('en')) { assert.ok(!EN_DOT.test(v), 'en ' + k + ': ' + v); assert.ok(!EN_SHORT.test(v), 'en ' + k + ': ' + v); }
});
test('Hebrew UI strings contain no abbreviations (gershayim and geresh forms)', () => {
  for (const [k, v] of strings('he')) { const x = v.replace(HE_UNITS, '').replace(HE_LOAN, ''); assert.ok(!HE_ABBR.test(x), 'he ' + k + ': ' + v); }
});
test('checklist labels are full words in EN and HE (every item, group, level, state)', () => {
  const FULL = { heat: 'Heat treatment', laser: 'Laser marking', tight: 'Tight dimensions', inspect100: '100% inspection' }; const en = JSON.parse(rd('src', 'i18n', 'en.json'));
  for (const [id, v] of Object.entries(FULL)) assert.strictEqual(en['ck.s.' + id], v);
  for (const [l, j] of [['en', en], ['he', JSON.parse(rd('src', 'i18n', 'he.json'))]]) for (const k of Object.keys(j).filter((x) => /^ck\./.test(x))) { assert.ok(typeof j[k] === 'string' && j[k].length > 0, l + ' ' + k); assert.ok(!/^ck\.sa\./.test(k)); }
  for (const id of ['engrave', 'threads', 'coating', 'assembly', 'heat', 'laser', 'tight', 'inspect100', 'clean']) if (en['ck.s.' + id]) assert.ok(en['ck.s.' + id].length > 4 && !/\.$/.test(en['ck.s.' + id]), id);
  const L = JSON.parse(rd('core', 'checklist', 'labels.json')); for (const l of ['en', 'he']) for (const [k, v] of Object.entries(L[l])) assert.ok(!(EN_DOT.test(v) || (l === 'he' && HE_ABBR.test(v.replace(HE_UNITS, '').replace(HE_LOAN, '')))), 'labels ' + l + ' ' + k);
});

// Exports, customer-facing messages and the PDF report: the same rule. Static scan of the text literals of the files that produce them.
const walk = (d, out = []) => { for (const f of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, out); else if (/\.(?:cjs|mjs)$/.test(f.name)) out.push(p); } return out; };
const OUTPUT_FILES = ['core/i18n/messages.cjs', 'core/i18n/terms.cjs', 'core/report.cjs', 'core/questions.cjs', 'core/requirements/sheets.cjs', 'core/requirements/he.cjs', 'core/checklist/export.cjs', 'core/standards/defs.cjs', 'core/refs.cjs', 'core/customers/index.cjs', ...walk('src/tutorial')];
const DOT = /(?<![\w$.])(?:engr|asm|assy|spec|specs|insp|coat|dims?|qty|approx|incl|pcs|std|ref|rev|mfg|dwg|mat|tol|dia|max|min|thr|cat|temp|no|nos|desc|alt|seq|num|sht|misc|config|req|proc)\.(?=\s|$|\)|,|:)/i;
const PLAIN = /(?<![\w$.\-/])(?:Qty|Rev|Seq|Spec|Specs|Std|Stds|Desc|Dwg|Pcs|Alt|Approx|Temp|Tol|Dia|Cat|Num|Req|Misc|Config|PN|UoM)(?![\w\-])|(?<![\w$.\-/])(?:qty|cat no|part no|heat treat|insp|dwg)(?![\w\-])/;
const literals = (src) => { const out = []; const re = /(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g; let m; while ((m = re.exec(src))) out.push(m[2].replace(/\$\{[^}]*\}/g, '~')); return out; };
test('messages, export headers and PDF report strings contain no abbreviations (EN and HE)', () => {
  const bad = [];
  for (const f of OUTPUT_FILES) for (const x of literals(rd(...f.split('/')))) { const he = x.replace(HE_UNITS, '').replace(HE_LOAN, ''); if (DOT.test(x) || PLAIN.test(x) || HE_ABBR.test(he)) bad.push(f + ': ' + x.slice(0, 80)); }
  assert.deepStrictEqual(bad, []);
});
test('Excel export: every header is spelled out and the column order and count are unchanged', () => {
  const { HEAD, WIDTHS } = require('../core/requirements/sheets.cjs');
  const COUNT = { Requirements: 8, Summary: 5, Material: 12, Processes: 17, Masking: 9, 'Process summary': 8 };
  assert.deepStrictEqual(Object.keys(HEAD), ['Requirements', 'Summary', 'Material', 'Processes', 'Masking', 'Process summary']);
  for (const [n, h] of Object.entries(HEAD)) { assert.strictEqual(h.length, COUNT[n], n); assert.strictEqual(WIDTHS[n].length, h.length, n + ' widths'); for (const c of h) { assert.ok(!DOT.test(c) && !PLAIN.test(c), n + ': ' + c); } }
  assert.deepStrictEqual(HEAD.Material.slice(8, 11), ['Catalog number', 'Quantity', 'Unit']); assert.strictEqual(HEAD.Requirements[4], 'Number'); assert.strictEqual(HEAD.Requirements[6], 'Extra (catalog number / quantity)');
});
test('customer messages in EN and HE render full words with sample values', () => {
  const M = require('../core/i18n/messages.cjs'); const T = M.MESSAGES || M.messages || M; const v = { alt: 'A', cat: '1234', seq: '5', altInner: 'x', pn: 'P', inner: 'y', range: '1-2', norm: 'N', raw: 'R', type: 't', qty: 2, uom: 'EA', alts: ['a'], note: 3, finds: [] };
  for (const k of ['bom.alt', 'dim.range', 'route.material', 'route.insert']) { const m = T[k]; if (!m) continue; for (const l of ['en', 'he']) { let out = ''; try { out = m[l](v); } catch (e) { continue; } assert.ok(!DOT.test(out) && !PLAIN.test(out) && !HE_ABBR.test(out.replace(HE_UNITS, '')), k + ' ' + l + ': ' + out); } }
});

test('customer questions: new and old (saved) English wording both translate to full Hebrew words', () => {
  const { buildQuestions } = require('../core/questions.cjs');
  const msgs = ['Range 1.5 - 1.2: minimum is larger than maximum.', 'Range 1.5 - 1.2: min is larger than max.'];
  for (const m of msgs) { const g = buildQuestions([{ partNo: 'P1', rev: 'A', problems: [{ severity: 'Question', message: m, status: 'open' }], tasks: [], route: [] }], 'he'); const out = JSON.stringify(g); assert.ok(out.includes('\u05D4\u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9'), 'translated: ' + m); assert.ok(!/larger than/.test(out), m); }
});
