'use strict';
// Newcomer audit: the next-step line names a concrete item, disabled buttons say why, one primary per screen, Cancel can be undone. Synthetic data only.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const load = (f) => import(pathToFileURL(path.join(__dirname, '..', 'src', f)).href);
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
const P = (partNo, o = {}) => ({ partNo, problems: [], tasks: [], ...o });
test('next step: empty, loaded, needs document first, then answer, then done / export', async () => { const n = await load('wizard/nextstep.mjs');
  assert.deepStrictEqual(n.nextAction(1, []).go, { step: 1, action: 'files' }); assert.strictEqual(n.nextAction(1, [], true), null);
  const parts = [P('A1'), P('B2', { problems: [{ severity: 'Question', status: 'open' }] }), P('C3', { tasks: [{ type: 'uploadDocument', status: 'todo' }] }), P('D4', { tasks: [{ type: 'uploadDocument', status: 'todo' }] })];
  assert.deepStrictEqual([n.nextAction(1, parts).key, n.nextAction(1, parts).go], ['ns.check', { step: 2, part: 1 }]);
  const a = n.nextAction(2, parts); assert.strictEqual(a.key, 'ns.needsDoc'); assert.deepStrictEqual(a.vars, { n: 2, part: 'C3' }); assert.deepStrictEqual(a.go, { step: 3, part: 2 }); assert.strictEqual(a.dot, 'warn');
  const b = n.nextAction(3, [P('A1'), P('B2', { problems: [{ severity: 'Blocker', status: 'open' }] })]); assert.strictEqual(b.key, 'ns.needsAnswer1'); assert.strictEqual(b.vars.part, 'B2');
  const ok = [P('A1'), P('X', { status: 'rejected' })]; assert.strictEqual(n.nextAction(2, ok).key, 'ns.done'); assert.strictEqual(n.nextAction(2, ok).dot, 'ok'); assert.deepStrictEqual(n.nextAction(4, ok).go, { action: 'export' }); });
test('disabled reasons', async () => { const n = await load('wizard/nextstep.mjs');
  assert.strictEqual(n.nextWhy(1, false), 'dis.noParts'); assert.strictEqual(n.nextWhy(4, true), 'dis.lastStep'); assert.strictEqual(n.nextWhy(2, true), null);
  assert.strictEqual(n.cancelWhy(false), 'dis.nothingToClear'); assert.strictEqual(n.cancelWhy(true), null); assert.strictEqual(n.stepWhy(3, false), 'dis.stepLocked'); assert.strictEqual(n.stepWhy(1, false), null);
  assert.strictEqual(n.saveWhy(0, false), 'dis.nothingToSave'); assert.strictEqual(n.saveWhy(3, true), 'dis.busySave'); assert.strictEqual(n.saveWhy(3, false), null); });
test('every disabled-able button uses a reason, texts exist in en and he', () => {
  assert.ok(/nextWhy/.test(src('src/components/wizard/WizardFooter.tsx')) && /cancelWhy/.test(src('src/components/wizard/WizardFooter.tsx')));
  assert.ok(/stepWhy/.test(src('src/components/wizard/Stepper.tsx'))); assert.ok(/saveWhy/.test(src('src/App.tsx'))); assert.ok(/dis\.presetSame/.test(src('src/settings/PresetsPanel.tsx')));
  const en = JSON.parse(src('src/i18n/en.json')), he = JSON.parse(src('src/i18n/he.json'));
  for (const k of ['ns.load', 'ns.check', 'ns.check1', 'ns.needsDoc', 'ns.needsDoc1', 'ns.needsAnswer', 'ns.needsAnswer1', 'ns.done', 'ns.export', 'tip.nextLine', 'dis.noParts', 'dis.lastStep', 'dis.nothingToClear', 'dis.stepLocked', 'dis.nothingToSave', 'dis.busySave', 'dis.presetSame', 'dis.firstPart', 'notice.cleared', 'notice.undo']) { assert.ok(en[k], 'en ' + k); assert.ok(he[k], 'he ' + k); }
  assert.ok(/\{part\}/.test(en['ns.needsDoc']) && /\{part\}/.test(he['ns.needsDoc'])); });
test('the next-step line is in the step header and is clickable', () => { const h = src('src/components/wizard/StepHeader.tsx'), n = src('src/components/wizard/NextStep.tsx');
  assert.ok(/<NextStep/.test(h)); assert.ok(/data-testid="next-step"/.test(n) && /onClick=\{\(\) => onGo\(next\.go\)\}/.test(n) && /title=\{t\('tip\.nextLine'\)\}/.test(n)); assert.ok(/nextAction\(step, parts/.test(src('src/ProjectView.tsx'))); });
test('one primary action per screen', () => { const s = src('src/components/wizard/StepSummary.tsx'); const prim = (s.match(/MRT_BTN_PRIMARY\}/g) || []).length;
  assert.strictEqual(prim, 1); // only the conditional Excel one assert.ok(/nq > 0 \? MRT_BTN_PRIMARY : MRT_BTN/.test(s) && /nq > 0 \? MRT_BTN : MRT_BTN_PRIMARY/.test(s) && !/className=\{MRT_BTN_PRIMARY\} data-testid="btn-export-pdf"/.test(s));
  assert.ok(/step === 3 \? MRT_BTN_PRIMARY/.test(src('src/components/wizard/WizardFooter.tsx'))); });
test('Cancel clears with Undo instead of a question; nothing is deleted', () => { const v = src('src/ProjectView.tsx');
  assert.ok(/onCancel=\{clearAll\}/.test(v) && /undo: \(\) =>/.test(v) && !/confirm\(t\('wz\.cancelAsk'\)\)/.test(v)); assert.ok(/notice-action/.test(src('src/ui/Notice.tsx')) && /undoBox/.test(src('src/App.tsx'))); });
