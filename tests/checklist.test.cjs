'use strict';
// Checklist: rules (EN, with negatives), plastics, zones, thresholds, indicators, order, settings, export, i18n parity, no reamer code.
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('fs'); const path = require('path');
const { buildChecklist } = require('../core/checklist/detect.cjs'); const Z = require('../core/checklist/zones.cjs'); const X = require('../core/checklist/export.cjs');
const { normalizeSettings } = require('../core/settings.cjs'); const { parseMaterial } = require('../core/catalog/families.cjs');
const live = () => import('../core/checklist/live.mjs');
const ROOT = path.join(__dirname, '..');

const page = (lines, o = {}) => ({ n: o.n || 1, width: o.w || 842, height: o.h || 595, raw: lines.join('\n'), quality: { mode: 'text' }, ocr: o.ocr || null, tokens: lines.map((t, i) => ({ text: t, x: 100 + (i % 5) * 120, y: 40 + i * 30, w: 100, h: 10, conf: 1 })) });
const chk = (lines, o = {}) => buildChecklist({ notes: lines, route: o.route || [], bom: [], material: o.material || null, status: 'ok' }, o.pages || [page(lines)]);
const LINES = ['ALL DIMENSIONS IN MILLIMETERS', 'NOTES:', '1. MATERIAL: DELRIN', '2. ENGRAVE PART NO 0.1 DEEP, FILL WITH BLACK PAINT', '3. INSTALL 4X KEENSERT M5X0.8 IN HOLES', '4. PAINT PER MIL-PRF-85285 COLOR RED, PRIMER BR127', '5. CLEAN ROOM CLEAN, 100% INSPECTION', '6. UNJ THREAD 1/4-28 UNJF-3B', '7. HEAT TREAT PER AMS 2770', 'O10 H7 THRU', 'O6 +0.010/-0.000 THRU HOLE', 'O12 g6', 'FLATNESS 0.005', 'RA 0.4', 'PIN DOWEL 3 X 8 ISO 2338', '10.0005', 'THIS DRAWING CONTAINS ENOUGH TEXT SO THAT IT COUNTS AS WELL READ'];

test('rules: every row of the 13-row list is found with what / where', () => {
  const c = chk(LINES); const R = c.rows;
  for (const id of ['material', 'heat', 'engrave', 'engfill', 'paint', 'br127', 'inspect100', 'cleanroom', 'assembly', 'threads']) assert.equal(R[id].state, 'yes', id);
  assert.equal(R.laser.state, 'no'); assert.equal(R.coating.state, 'no');
  assert.match(R.material.items[0].spec, /Delrin/i);
  assert.equal(R.engfill.items[0].color, 'black'); assert.equal(R.paint.items[0].color, 'red');
  const k = R.assembly.items.find((i) => i.key === 'keensert'); assert.equal(k.qty, 4); assert.match(k.spec, /M5/);
  const pin = R.assembly.items.find((i) => i.key === 'pin'); assert.ok(!pin.qty, '"3 X 8" is a size, not a quantity');
  assert.equal(R.br127.items[0].spec, 'BR127'); assert.ok(!R.br127.items[0].color);
  assert.match(R.threads.items[0].spec, /UNJ/);
});
test('rules: negatives are "no (excluded)", unreadable drawings are "not found", never guessed', () => {
  const c = chk(['NOTES:', 'NO PAINT', 'DO NOT HEAT TREAT', 'MATERIAL ALUMINUM 6061-T6 PER AMS-QQ-A-250/11 AND SOME MORE WORDS FOR LENGTH', 'BREAK ALL SHARP EDGES AND DEBURR PER STANDARD PRACTICE ON ALL SURFACES']);
  assert.equal(c.rows.paint.state, 'no'); assert.equal(c.rows.paint.excluded, true); assert.equal(c.rows.heat.excluded, true);
  const bad = chk(['x'], { pages: [{ n: 1, width: 842, height: 595, raw: 'x', quality: { mode: 'ocr' }, ocr: { conf: 30 }, tokens: [] }] });
  assert.equal(bad.rows.paint.state, 'notfound'); assert.equal(bad.read.ok, false);
});
test('plastics we machine (Delrin / POM / acetal, Teflon / PTFE) are ours; aluminium stays ours', () => {
  assert.equal(parseMaterial('DELRIN 150').group, 'plastic-pom'); assert.equal(parseMaterial('ACETAL (POM-C) ROD').group, 'plastic-pom');
  assert.equal(parseMaterial('TEFLON PTFE').group, 'plastic-ptfe'); assert.equal(parseMaterial('ALUMINUM 6061-T6').family, 'Aluminium');
  const cat = normalizeSettings({}).materialsCatalog; const on = (g) => cat.some((r) => r.group === g && r.enabled !== false);
  assert.ok(on('plastic-pom') && on('plastic-ptfe'));
});
test('zones: printed labels (ISO / ASME) are used; otherwise equal zoning by sheet size, marked estimated', () => {
  const toks = []; for (let i = 0; i < 8; i++) { toks.push({ text: String(i + 1), x: 50 + i * 100, y: 10, w: 8, h: 10 }); toks.push({ text: String(i + 1), x: 50 + i * 100, y: 575, w: 8, h: 10 }); }
  'ABCD'.split('').forEach((c, i) => { toks.push({ text: c, x: 8, y: 60 + i * 120, w: 8, h: 10 }); toks.push({ text: c, x: 825, y: 60 + i * 120, w: 8, h: 10 }); });
  const g = Z.zoneGrid({ width: 842, height: 595, tokens: toks }); const z = Z.zoneOf(g, { x: 455, y: 190, w: 5, h: 5 });
  assert.deepEqual(z, { label: 'B5', estimated: false });
  for (const [w, h, cols, rows, end] of [[842, 595, 4, 4, 'D4'], [1191, 842, 6, 4, 'D6'], [2384, 1684, 12, 8, 'H12']]) {
    const e = Z.zoneGrid({ width: w, height: h, tokens: [] }); assert.equal(e.cols.length, cols); assert.equal(e.rows.length, rows);
    const a = Z.zoneOf(e, { x: 3, y: 3, w: 4, h: 4 }), b = Z.zoneOf(e, { x: w - 8, y: h - 8, w: 4, h: 4 }); assert.equal(a.label, 'A1'); assert.equal(b.label, end); assert.equal(a.estimated, true);
  }
});
test('tight dimensions: found with value, tolerance, zone and sheet; thresholds from Settings apply live', async () => {
  const { evaluate, thresholds } = await live(); const part = { checklist: chk(LINES), route: [] };
  const ev = evaluate(part, {}); const kinds = ev.tight.map((x) => x.kind);
  for (const k of ['tol', 'fit', 'gdt', 'ra']) assert.ok(kinds.includes(k), k);
  for (const x of ev.tight) { assert.ok(x.zone && /^[A-Z]\d+$/.test(x.zone.label), 'zone'); assert.ok(x.bbox && x.page === 1, 'bbox + page'); }
  assert.ok(ev.tight.some((x) => x.fit === 'H7') && ev.tight.some((x) => x.fit === 'g6'));
  assert.equal(evaluate(part, { precision: { tolMm: 0.001 } }).tight.filter((x) => x.kind === 'tol').length, 0, 'tighter threshold drops the +-0.005 item');
  assert.equal(evaluate(part, { precision: { fitMaxIT: 5 } }).tight.filter((x) => x.kind === 'fit').length, 0, 'IT6 / IT7 fits are above IT5');
  assert.equal(thresholds({}).tolMm, 0.01); assert.equal(thresholds({ precision: { tolIn: '0,001' } }).tolIn, 0.001);
});
test('inch drawings use the inch limits (+-0.0005 in), unknown unit never guesses mm', async () => {
  const { evaluate } = await live();
  const inch = { checklist: chk(['ALL DIMENSIONS IN INCHES', '.500 +.0004/-.0000', '.750 +.005/-.000', 'ENOUGH WORDS SO THIS IS READ WELL ENOUGH TO COUNT AS A READ DRAWING TEXT']) , route: [] };
  const t = evaluate(inch, {}).tight.filter((x) => x.kind === 'tol'); assert.ok(t.length >= 1); assert.ok(t.every((x) => x.unit === 'in'));
});
test('indicators: documented levels with a why line; group order follows the route card', async () => {
  const { evaluate, GROUPS } = await live(); const ev = evaluate({ checklist: chk(LINES), route: [] }, {});
  assert.deepEqual(ev.order, ['material', 'machining', 'precision', 'coating', 'assembly', 'final']); assert.deepEqual(GROUPS, ev.order);
  assert.equal(ev.precision.level, 'veryTight'); assert.ok(ev.precision.tightest); assert.ok(['moderate', 'complex'].includes(ev.complexity.level));
  const plain = evaluate({ checklist: chk(['NOTES:', 'BREAK ALL SHARP EDGES AND DEBURR PER STANDARD PRACTICE ON ALL SURFACES OF THE PART', 'MATERIAL ALUMINUM 6061-T6 PER AMS-QQ-A-250/11'], {}), route: [] }, {});
  assert.equal(plain.precision.level, 'standard'); assert.equal(plain.complexity.level, 'simple');
  const ind = X.indicators(ev, 'en'); assert.ok(ind.precisionWhy.length > 10 && ind.complexityWhy.length > 10); assert.ok(X.indicators(ev, 'he').complexityWhy !== ind.complexityWhy);
  const none = evaluate({}, {}); assert.equal(none.has, false); assert.equal(none.precision.level, 'unknown');
});
test('route chart: a part with its own routing steps orders the groups by those steps', async () => {
  const { evaluate } = await live(); const c = chk(['NOTES:', 'PAINT PER MIL-PRF-85285', 'HEAT TREAT PER AMS 2770', 'ENOUGH WORDS SO THIS IS READ WELL ENOUGH TO COUNT AS A READ DRAWING TEXT']);
  const mark = (row, n) => { for (const i of c.rows[row].items) i.where = [{ t: 'step', n: String(n) }]; };
  mark('paint', 10); mark('heat', 30); const ev = evaluate({ checklist: c, route: [] }, {});
  assert.ok(ev.order.indexOf('coating') < ev.order.indexOf('machining'), ev.order.join());
});
test('export: rows in group order, EN and HE text, cells carry what and where', async () => {
  const { evaluate } = await live(); const ev = evaluate({ checklist: chk(LINES), route: [] }, {});
  const en = X.lines(ev, 'en'), he = X.lines(ev, 'he'); assert.equal(en.length, 14); assert.deepEqual([...new Set(en.map((r) => r.group))], ev.order);
  assert.notEqual(en[0].label, he[0].label); assert.match(X.cell(ev, 'assembly', 'en'), /^Yes: .*Keensert.*\u00D74.*\[.*zone [A-Z]\d/); assert.match(he.find((r) => r.id === 'tight').stateLabel, /[\u05D0-\u05EA]/);
  const { reportHtml } = require('../core/report.cjs'); const html = reportHtml([{ partNo: 'X1', problems: [], tasks: [], requirements: [], route: [], _ck: ev }], 'en', {});
  assert.match(html, /Checklist/); assert.match(html, /Precision/); assert.match(html, /Keensert/);
  assert.doesNotMatch(reportHtml([{ partNo: 'X1', problems: [], tasks: [], requirements: [], route: [] }], 'en', {}), /class="ck"/);
});
test('settings: precision defaults, normalization and the Settings tab', () => {
  const s = normalizeSettings({ precision: { tolMm: '0,02', raUm: -1, bogus: 5 } }); assert.equal(s.precision.tolMm, 0.02); assert.equal(s.precision.raUm, 0.8); assert.ok(!('bogus' in s.precision));
  const live1 = fs.readFileSync(path.join(ROOT, 'core/checklist/live.mjs'), 'utf8'); for (const [k, v] of Object.entries(normalizeSettings({}).precision)) assert.match(live1, new RegExp(k + ': ' + String(v).replace('.', '\\.')));
  const dlg = fs.readFileSync(path.join(ROOT, 'src/settings/SettingsDialog.tsx'), 'utf8'); assert.match(dlg, /'precision'/); assert.match(dlg, /prec-reset/);
});
test('UI wiring: part card + summary sections, click-to-zoom focus, tooltips, token fonts, no reamer code anywhere', () => {
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  assert.match(rd('src/components/partcard/PartCard.tsx'), /<ChecklistSection part=\{part\} onFocus=\{onFocus\}/); assert.match(rd('src/components/wizard/StepSummary.tsx'), /<ChecklistSummary/);
  const ck = rd('src/checklist/Checklist.tsx'); assert.match(ck, /onFocus\(f\)/); assert.match(ck, /title=\{t\('ck\.show'\) \+ ': ' \+ full\}/); assert.match(ck, /ck-zone-note/);
  const css = rd('src/styles/wizard.css'); const block = css.slice(css.indexOf('/* Checklist')); assert.ok(!/font-size:\s*\d/.test(block), 'token font sizes only'); assert.ok(!/background(-color)?:\s*#(0|1|2|3)/i.test(block), 'no dark fills');
  const files = ['core/checklist/detect.cjs', 'core/checklist/live.mjs', 'core/checklist/zones.cjs', 'core/checklist/export.cjs', 'src/checklist/Checklist.tsx', 'src/checklist/ChecklistSummary.tsx', 'src/settings/SettingsDialog.tsx', 'core/settings.cjs', 'src/i18n/en.json'];
  for (const f of files) assert.doesNotMatch(rd(f), /reamer/i, f);
});
test('i18n: every ck / precision key exists in EN and HE, the export labels equal the UI strings, Hebrew tab has no Latin', () => {
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/en.json'), 'utf8')), he = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/he.json'), 'utf8')); const L = require('../core/checklist/labels.json');
  const keys = Object.keys(en).filter((k) => /^(ck\.|st\.prec\.|st\.tab\.precision|tip\.ck|tip\.precField|tip\.precReset|tip\.checklist)/.test(k)); assert.ok(keys.length > 90);
  for (const k of keys) { assert.ok(he[k], k); assert.equal((en[k].match(/\{\w+\}/g) || []).sort().join(), (he[k].match(/\{\w+\}/g) || []).sort().join(), 'vars ' + k); }
  for (const k of Object.keys(L.en)) { assert.equal(L.en[k], en[k], k); assert.equal(L.he[k], he[k], k); }
  assert.ok(!/[A-Za-z]/.test(he['st.tab.precision']));
  for (const r of ['material', 'heat', 'engrave', 'laser', 'engfill', 'threads', 'gauges', 'tight', 'coating', 'paint', 'br127', 'assembly', 'inspect100', 'cleanroom']) assert.ok(en['ck.r.' + r]);
});
