'use strict';
// Document stages: certificates / reports / customer specs belong to the ROUTE CARD, never to the quote-stage "missing" logic.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const S = require('../core/docs/stage.cjs'); const { analyzePart } = require('../core/analyze.cjs'); const { normalizeSettings, resolveAssistantLang } = require('../core/settings.cjs');
const root = path.join(__dirname, '..'); const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, '');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);

const YES = { 'material-cert': ['MATERIAL CERTIFICATION REQUIRED', 'Mill test report per EN 10204 3.1', 'material test report with each lot', 'תעודת חומר נדרשת'],
  'coating-cert': ['ANODIZE CERT REQUIRED', 'Plating certificate per lot', 'Hard anodizing process certificate'],
  'heat-cert': ['heat treat report required', 'Heat treatment certificate'],
  coc: ['C OF C WITH EACH SHIPMENT', 'CoC required', 'Certificate of conformance', 'C of C', 'תעודת התאמה'],
  fai: ['FAI REQUIRED', 'FAI PER AS9102', 'first article inspection report', 'AS-9102'],
  'inspection-report': ['INSPECTION REPORT REQUIRED', 'CMM report with shipment', 'דוח בדיקה'],
  traceability: ['LOT TRACEABILITY REQUIRED', 'full traceability', 'batch number must be recorded'],
  compliance: ['RoHS compliance declaration', 'REACH statement'], packing: ['Packing for shipment per GS-4P05002'], certificate: ['CERTIFICATE REQUIRED'] };
const NO = ['BREAK ALL SHARP EDGES', 'ANODIZE PER MIL-A-8625 TYPE II', 'MATERIAL: AL 6061-T6', 'CERTIFIED INSPECTOR ONLY', 'DIMENSIONS IN MM', 'SEE SEPARATE PART LIST', 'MARK PER MIL-STD-130'];
test('rules table: every certificate / report / traceability wording is classified, drawing wording is not', () => {
  for (const [id, list] of Object.entries(YES)) for (const x of list) { const r = S.classifyText(x); assert.ok(r && r.id === id, x + ' -> ' + (r && r.id) + ' (want ' + id + ')'); assert.strictEqual(S.stageOfText(x), 'routecard'); }
  for (const x of NO) assert.strictEqual(S.classifyText(x), null, x);
  for (const r of S.RULES) { assert.ok(r.en && /[\u0590-\u05ff]/.test(r.he) && r.re instanceof RegExp && r.group, r.id); }
});
test('refs: customer-internal specs are route card, the separate part list and public library standards stay "now"', () => {
  assert.strictEqual(S.stageOfRef({ number: 'GEN_1111-1', kind: 'internal' }), 'routecard');
  assert.strictEqual(S.stageOfRef({ number: 'PS-111.21', kind: 'internal' }), 'routecard');
  assert.strictEqual(S.stageOfRef({ number: 'RAFDOCS-1', kind: 'internal' }), 'routecard');
  assert.strictEqual(S.stageOfRef({ number: 'SEPARATE PART LIST', kind: 'internal' }), 'now');
  assert.strictEqual(S.stageOfRef({ number: 'MIL-A-8625', kind: 'public', description: 'Anodic coatings' }), 'now');
  assert.strictEqual(S.stageOfRef({ number: '2002-95/EC', kind: 'public', description: 'EU RoHS directive' }), 'routecard');
});
const RAW = ['DWG NO. SYN-1001 REV A', 'NOTES:', '1. MATERIAL: ALUMINUM 6061-T6 PER AMS-QQ-A-250/11', '3. SEE SEPARATE PART LIST', '4. MATERIAL CERTIFICATION AND MILL TEST REPORT REQUIRED', '5. FAI PER AS9102 REQUIRED WITH FIRST SHIPMENT', '6. C OF C WITH EACH SHIPMENT', '7. HARD ANODIZE PER PS-111.21', '8. MATERIAL PER GEN_1111-1'].join('\n');
const analyze = (raw) => analyzePart({ drawing: { name: 'SYN.pdf', pages: [{ n: 1, raw, tokens: [], quality: { mode: 'text' }, ocr: null }], emails: [] }, partsList: null, models: [], settings: normalizeSettings({}), library: [], requirements: [] });
test('analysis: customer specs and certificates go to routeCard, no upload task, no blocked step', () => {
  const a = analyze(RAW);
  assert.deepStrictEqual(a.tasks.filter((t) => t.type === 'uploadDocument').map((t) => t.refNumber), ['SEPARATE PART LIST'], 'only the separate part list (needed to evaluate) is an upload task');
  assert.ok(a.tasks.filter((t) => t.type === 'uploadDocument').every((t) => t.stage === 'now'));
  assert.ok(!a.route.some((s) => s.blocked && s.seq !== '3'), 'a customer spec never blocks a routing step');
  const ids = a.routeCard.groups.flatMap((g) => g.items.map((i) => i.ruleId || i.number)); for (const x of ['material-cert', 'fai', 'coc', 'PS-111.21', 'GEN_1111-1']) assert.ok(ids.includes(x), x + ' in ' + ids);
  const spec = a.routeCard.groups.find((g) => g.items.some((i) => i.number === 'PS-111.21')); assert.strictEqual(spec.type, 'surface', 'PS-111.21 sits at the surface step'); assert.strictEqual(a.routeCard.groups.find((g) => g.items.some((i) => i.number === 'GEN_1111-1')).type, 'material');
});
test('route card never counts as missing: status, reason, next step, questions, report', async () => {
  const a = analyze(RAW); const g = await imp('src/parts/groups.mjs'); const n = await imp('src/wizard/nextstep.mjs'); const r = await imp('src/parts/reason.mjs');
  const b = analyze(RAW.replace('3. SEE SEPARATE PART LIST\n', '')); // no part list asked for -> nothing missing at all
  b.status = 'accepted'; b.problems = [];
  assert.strictEqual(g.plainStatus(b), 'ready', 'certificates and customer specs do not make a part "needs document"'); assert.strictEqual(g.tileCounts([b]).needsDoc, 0);
  assert.strictEqual(r.reasonFor(b).status, 'ready'); assert.strictEqual(n.nextAction(3, [b], false).key, 'ns.done');
  assert.strictEqual(require('../core/report.cjs').plainStatus(b), 'ready');
  const q = require('../core/questions.cjs').buildQuestions([b], 'en'); assert.ok(!q.some((x) => x.questions.some((y) => y.severity === 'Document')), 'no customer question for route card documents');
  const html = require('../core/report.cjs').reportHtml([b], 'en');
  assert.ok(html.includes('For route card') && html.includes('GEN_1111-1'), 'the report carries the route card section');
  assert.ok(require('../core/report.cjs').reportHtml([b], 'he').includes(require('../core/report.cjs').LABELS.he.rcard));
  // a real need still counts: the separate part list (and library standards) are stage "now"
  const c = analyze(RAW); c.status = 'accepted'; c.problems = []; assert.strictEqual(g.plainStatus(c), 'needsDoc');
  assert.strictEqual(g.isOpenDoc({ type: 'uploadDocument', status: 'open', stage: 'routecard' }), false); assert.strictEqual(g.isOpenDoc({ type: 'uploadDocument', status: 'open' }), true);
});
test('old projects: upgradePart stages old tasks and builds the route card (idempotent)', () => {
  const p = { partNo: 'X', route: [{ seq: '20', type: 'material', title: 'MATERIAL', items: [{ text: 'MATERIAL PER GEN_1111-1' }] }], notes: [{ n: '1', text: 'CoC REQUIRED' }],
    refs: [{ number: 'GEN_1111-1', kind: 'internal', description: 'x' }, { number: 'SEPARATE PART LIST', kind: 'internal' }],
    tasks: [{ type: 'uploadDocument', refNumber: 'GEN_1111-1', status: 'open' }, { type: 'uploadDocument', refNumber: 'SEPARATE PART LIST', status: 'open' }, { type: 'uploadDocument', std: true, refNumber: 'AS5202', status: 'open' }] };
  S.upgradePart(p); assert.deepStrictEqual(p.tasks.map((t) => t.stage), ['routecard', 'now', 'now']); assert.ok(p.routeCard.count >= 2);
  const snap = JSON.stringify(p); S.upgradePart(p); assert.strictEqual(JSON.stringify(p), snap);
});
test('UI wiring: collapsed neutral section in the part card and the summary, tooltips, parity, no readiness chip, provisional counts', () => {
  assert.match(rd('src/components/partcard/PartCard.tsx'), /<RouteCardSection part=\{part\}/); assert.match(rd('src/components/wizard/StepSummary.tsx'), /<RouteCardSummary parts=\{parts\}/);
  const c = rd('src/components/partcard/RouteCardSection.tsx'); assert.match(c, /<details className="qr-rc"/); assert.ok(!/<details[^>]* open=\{true\}/.test(c)); assert.match(c, /title=\{t\('tip\.routeCard'\)\}/); assert.ok(!/fontSize|font-size|qr-dot|data-s=/.test(c), 'neutral: no inline fonts, no status dots');
  const en = JSON.parse(rd('src/i18n/en.json')), he = JSON.parse(rd('src/i18n/he.json')); for (const k of ['rcard.title', 'rcard.sumTitle', 'rcard.note', 'rcard.general', 'rcard.spec', 'tip.routeCard', 'prov.note', 'st.assistAuto']) { assert.ok(en[k] && he[k], k); }
  assert.strictEqual(en['rcard.title'], 'For route card'); assert.strictEqual(he['rcard.title'], 'לכרטיס מסלול');
  assert.ok(!/readiness/i.test(rd('src/views/Parts.tsx')), 'one status per part: no second readiness tag in the list'); assert.ok(!/tReadiness/.test(rd('src/views/Dialogs.tsx') + rd('src/views/Viewer.tsx')));
  assert.match(rd('src/ProjectView.tsx'), /data-provisional=\{!!busy && has\}/); assert.match(rd('src/ProjectView.tsx'), /data-testid="provisional"/);
  const css = rd('src/styles/wizard.css'); const block = css.slice(css.indexOf('/* For route card')); assert.ok(!/color:\s*#|red|danger/.test(block.split('.qr-provisional')[0].replace(/#d0d5dd|#636366/g, '')), 'no status colours'); for (const m of block.matchAll(/font-size:\s*([^;]+);/g)) assert.match(m[1], /^var\(--qr-fs-(xs|sm|md|lg|xl)\)$/);
});
test('hints follow ONE setting: auto = program language; a language only when picked', () => {
  const s = (o) => normalizeSettings(o);
  assert.strictEqual(resolveAssistantLang(s({ uiLanguage: 'en', assistantLanguage: 'he' })), 'en', 'old auto-followed Hebrew in an English UI is reset');
  assert.strictEqual(resolveAssistantLang(s({ uiLanguage: 'en', assistantLanguage: 'he', assistantLanguageSet: true })), 'he', 'an explicit choice is kept');
  assert.strictEqual(resolveAssistantLang(s({ uiLanguage: 'he' })), 'he'); assert.strictEqual(resolveAssistantLang(s({})), 'en');
  assert.match(rd('src/settings/SettingsDialog.tsx'), /<option value="auto">\{t\('st\.assistAuto'\)\}/);
});
