'use strict';
// Draggable floating windows, the single Settings language (en/he/ru) and the RTL-aware select arrow.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const rd = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const { normalizeSettings } = require('../core/settings.cjs');

test('drag helpers: clamp keeps the card inside the window, sanitize drops junk', async () => {
  const { clampPos, sanitizePos, sanitizeFloatPos } = await import('../src/ui/drag.mjs');
  assert.deepStrictEqual(clampPos(-50, -20, 300, 200, 1000, 700), { x: 0, y: 0 });
  assert.deepStrictEqual(clampPos(900, 650, 300, 200, 1000, 700), { x: 700, y: 500 });
  assert.deepStrictEqual(clampPos(100, 120, 300, 200, 1000, 700), { x: 100, y: 120 });
  assert.deepStrictEqual(clampPos(10, 10, 300, 200, 1000, 700, 8), { x: 10, y: 10 });
  assert.deepStrictEqual(clampPos(5, 5, 300, 200, 1000, 700, 8), { x: 8, y: 8 });
  assert.deepStrictEqual(clampPos(50, 50, 2000, 900, 1000, 700), { x: 0, y: 0 }, 'a card bigger than the window pins to the corner');
  assert.strictEqual(sanitizePos({ x: 'a', y: 1 }), null);
  assert.strictEqual(sanitizePos(null), null);
  assert.deepStrictEqual(sanitizePos({ x: 10.4, y: 20.6 }), { x: 10, y: 21 });
  assert.deepStrictEqual(sanitizeFloatPos({ a: { x: 1, y: 2 }, b: { x: NaN, y: 1 }, c: 5 }), { a: { x: 1, y: 2 } });
});
test('settings: floatPos is remembered and sanitized, uiLanguage is en/he, assistantLanguage is he/en/ru and independent', () => {
  assert.deepStrictEqual(normalizeSettings({}).floatPos, {});
  assert.deepStrictEqual(normalizeSettings({ floatPos: { tour: { x: 5.2, y: 7 }, bad: { x: 'z' } } }).floatPos, { tour: { x: 5, y: 7 } });
  for (const l of ['en', 'he']) assert.strictEqual(normalizeSettings({ uiLanguage: l }).uiLanguage, l);
  assert.strictEqual(normalizeSettings({ uiLanguage: 'fr' }).uiLanguage, 'en');
  for (const l of ['he', 'en', 'ru']) assert.strictEqual(normalizeSettings({ uiLanguage: 'he', assistantLanguage: l, assistantLanguageSet: true }).assistantLanguage, l, 'an explicitly chosen assistant language is independent of the UI language');
  assert.strictEqual(normalizeSettings({ uiLanguage: 'he', assistantLanguage: 'fr' }).assistantLanguage, 'auto', 'unknown assistant language falls back to auto (= the UI language)');
  assert.strictEqual(normalizeSettings({ uiLanguage: 'en', assistantLanguage: 'he' }).assistantLanguage, 'auto', 'a stored language that was never picked in Settings (old auto-follow) becomes auto: no Hebrew hint in an English UI');
  const main = rd('electron', 'main.cjs'); assert.match(main, /qr:setFloatPos/);
  assert.match(main, /floatPos: cur\.floatPos/, 'setSettings must not overwrite remembered positions');
  assert.match(rd('electron', 'preload.cjs'), /setFloatPos/);
});
test('tour card: draggable by its header, double-click resets, same hook on dialogs and history', () => {
  const tour = rd('src', 'tutorial', 'TourView.tsx'); assert.match(tour, /useFloat\(/); assert.match(tour, /data-testid="tutorial-head"/); assert.match(tour, /headProps/);
  const hook = rd('src', 'ui', 'useFloat.ts');
  for (const w of ['onPointerDown', 'setPointerCapture', 'clampPos', 'onDoubleClick', 'setFloatPos']) assert.ok(hook.includes(w), 'useFloat must use ' + w);
  assert.match(rd('src', 'ui', 'common.tsx'), /useFloat\(/); assert.match(rd('src', 'components', 'history', 'HistoryDialog.tsx'), /useFloat\(/);
  assert.match(rd('src', 'styles', 'tour.css'), /\[data-drag-head\]\s*\{[^}]*cursor:\s*grab/);
});
test('language selectors exist only in Settings: UI language (he/en) in Interface, assistant language (he/en/ru) in Assistant', () => {
  for (const f of ['src/tutorial/TourView.tsx', 'src/tutorial/Tutorial.tsx', 'src/components/wizard/AssistantHint.tsx', 'src/App.tsx']) assert.ok(!/<select/.test(rd(...f.split('/'))), f + ' has a <select>');
  const st = rd('src', 'settings', 'SettingsDialog.tsx');
  assert.match(st, /<LanguagePanel/); assert.ok(!/data-testid="ui-lang"/.test(st), 'the selector lives in LanguagePanel only'); assert.match(st, /data-testid="assistant-lang"/); assert.match(st, /data-testid="restart-tour"/);
  for (const o of ['>עברית<', '>English<', '>Русский<']) assert.ok(st.includes(o), 'Settings language option ' + o);
  const lp = rd('src', 'settings', 'LanguagePanel.tsx'); assert.ok(/id: 'ru'[^}]*soon: true/.test(lp), 'Russian is listed but not selectable as a program language'); assert.ok(/disabled=\{!!l\.soon\}/.test(lp));
  assert.match(rd('src', 'App.tsx'), /lang0=\{resolveAssistantLang\(settings\)/);
  const i = rd('src', 'i18n', 'index.ts'); assert.match(i, /setAssistantLang/); assert.match(i, /assistantDir/); assert.ok(!/getContentLang/.test(i));
});
test('ru hints exist for the assistant; every ru key exists in en', () => {
  const ru = JSON.parse(rd('src', 'i18n', 'ru.json')); const en = JSON.parse(rd('src', 'i18n', 'en.json'));
  assert.ok(Object.keys(ru).length > 5);
  for (const k of Object.keys(ru)) assert.ok(k in en, 'ru key not in en: ' + k);
  assert.ok(!('st.ruNote' in en));
});
test('select arrow: padding-inline-end reserved, arrow at inline-end in LTR and RTL', () => {
  const css = rd('src', 'styles', 'fit.css');
  assert.match(css, /padding-inline-end:\s*2em/);
  assert.match(css, /background-position:\s*right 0\.7em center/);
  assert.match(css, /select:dir\(rtl\)[^{]*\{[^}]*background-position:\s*left 0\.7em center/);
  assert.match(css, /appearance:\s*none/);
});
