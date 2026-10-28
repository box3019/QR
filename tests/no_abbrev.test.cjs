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
