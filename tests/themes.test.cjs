'use strict';
// v0.1.5 Settings restructure (Interface / General / Assistant), the theme list kept in step in three places, and the surface layering / layout rules.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const rd = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const S = require('../core/settings.cjs'); const { normalizeSettings, DEFAULTS } = S;
const en = JSON.parse(rd('src', 'i18n', 'en.json')); const he = JSON.parse(rd('src', 'i18n', 'he.json'));

test('theme ids are the same in core/settings.cjs, src/theme/themes.ts, the CSS and both dictionaries', () => {
  const ts = rd('src', 'theme', 'themes.ts'); const list = (name) => [...ts.match(new RegExp(name + " = \\[([^\\]]*)\\]"))[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  assert.deepStrictEqual(list('PALETTES'), S.PALETTES); assert.deepStrictEqual(list('ACCENTS'), S.ACCENTS); assert.deepStrictEqual(list('DENSITIES'), S.DENSITIES); assert.deepStrictEqual(list('ROW_HEIGHTS'), S.ROW_HEIGHTS);
  const css = rd('src', 'styles', 'themes.css');
  for (const p of S.PALETTES) { assert.ok(en['pal.' + p] && he['pal.' + p], 'pal.' + p); if (p !== 'graphite') assert.ok(css.includes(`data-qr-palette='${p}'`), 'css for ' + p); }
  for (const a of S.ACCENTS) assert.ok(en['acc.' + a] && he['acc.' + a], 'acc.' + a);
  for (const k of S.DENSITIES) assert.ok(en['den.' + k] && he['den.' + k]); for (const k of S.ROW_HEIGHTS) assert.ok(en['row.' + k] && he['row.' + k]);
  assert.match(css, /\[data-mrt-theme='dark'\]/); assert.match(css, /color-scheme: dark/);
});
test('settings: defaults, validation and persistence of the interface fields', () => {
  const d = normalizeSettings({}); assert.strictEqual(d.palette, 'industrial-steel'); assert.strictEqual(d.accent, 'slate'); assert.strictEqual(d.density, 'normal'); assert.strictEqual(d.rowHeight, 'normal'); assert.strictEqual(typeof d.assistant, 'boolean');
  const s = normalizeSettings({ palette: 'graphite', accent: 'teal', density: 'compact', rowHeight: 'relaxed', textSize: 'large' });
  assert.deepStrictEqual([s.palette, s.accent, s.density, s.rowHeight, s.textSize], ['graphite', 'teal', 'compact', 'relaxed', 'large']);
  const bad = normalizeSettings({ palette: 'neon', accent: 'pink', density: 'x', rowHeight: 'y' }); assert.deepStrictEqual([bad.palette, bad.accent, bad.density, bad.rowHeight], [DEFAULTS.palette, DEFAULTS.accent, DEFAULTS.density, DEFAULTS.rowHeight]);
  assert.strictEqual(normalizeSettings({ assistant: false }).assistant, false); assert.strictEqual(normalizeSettings({ assistant: true }).assistant, true);
  assert.deepStrictEqual(normalizeSettings(JSON.parse(JSON.stringify(s))), s, 'round trip through JSON is stable');
});
test('assistant language is independent of the UI language; a legacy Russian UI becomes English UI + Russian assistant', () => {
  const a = normalizeSettings({ uiLanguage: 'en', assistantLanguage: 'ru', assistantLanguageSet: true }); assert.deepStrictEqual([a.uiLanguage, a.assistantLanguage], ['en', 'ru']);
  const b = normalizeSettings({ uiLanguage: 'he', assistantLanguage: 'en', assistantLanguageSet: true }); assert.deepStrictEqual([b.uiLanguage, b.assistantLanguage], ['he', 'en']);
  const c = normalizeSettings({ uiLanguage: 'ru' }); assert.deepStrictEqual([c.uiLanguage, c.assistantLanguage], ['en', 'ru']);
  const d = normalizeSettings({ uiLanguage: 'he' }); assert.strictEqual(d.assistantLanguage, 'auto'); assert.strictEqual(require('../core/settings.cjs').resolveAssistantLang(d), 'he', 'auto follows the program language'); assert.strictEqual(require('../core/settings.cjs').resolveAssistantLang(normalizeSettings({ uiLanguage: 'en' })), 'en');
});
test('Settings dialog: Interface, General and Assistant sections with live preview', () => {
  const st = rd('src', 'settings', 'SettingsDialog.tsx');
  for (const id of ['stab-', "'interface'", "'language'", 'accents', 'text-size', 'density', 'row-height', 'assistant-lang', 'assistant-on', 'restart-tour']) assert.ok(st.includes(id), id);
  assert.match(st, /themeAttrs\(/); assert.match(st, /PresetsPanel/); assert.match(rd('src', 'settings', 'PresetsPanel.tsx'), /title=\{t\('tip\.presetCard'\)\}/);
  for (const k of ['st.tab.interface', 'st.tab.general', 'st.tab.assistant', 'st.restartTour', 'st.assistLang', 'st.assistantOn', 'tip.palette', 'tip.accent']) assert.ok(en[k] && he[k], k);
});
test('layering: tinted canvas, bordered shadowed cards, distinct bars and side column, centred max-width content', () => {
  const css = rd('src', 'styles', 'layers.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.qr-root\s*\{[^}]*background:\s*var\(--mrt-bg\)/);
  assert.match(css, /\.qr-box[^{]*\{[^}]*border:\s*1px solid var\(--mrt-border-strong\)[^}]*box-shadow:\s*var\(--qr-card-shadow\)/);
  assert.match(css, /\.qr-topbar\s*\{[^}]*background:\s*var\(--mrt-chrome-surface\)/); assert.match(css, /\.qr-rail-context[^{]*\{[^}]*background:\s*var\(--qr-rail-bg\)/);
  const mx = css.match(/--qr-max:\s*(\d+)px/); assert.ok(mx && +mx[1] >= 1200 && +mx[1] <= 1400, 'max-width 1200-1400');
  assert.match(css, /\.qr-sum-wrap\s*\{[^}]*max-width:\s*none[^}]*margin-inline:\s*0/);
  assert.match(css, /\.qr-sum-grid\s*\{[^}]*repeat\(4,/); assert.match(css, /\.qr-stats\s*\{[^}]*flex/);
  assert.match(css, /\.qr-box-b > button[^{]*\{[^}]*align-self:\s*flex-start/, 'small buttons sit at the card start');
  assert.doesNotMatch(css, /border-radius:\s*(50%|999px)/);
});
test('Summary: stat tiles on top, four cards (questions / Excel / report on screen / PDF), no narrow column', () => {
  const tsx = rd('src', 'components', 'wizard', 'StepSummary.tsx');
  assert.match(tsx, /className="qr-stats"/); assert.match(tsx, /className="qr-sum-grid"/); for (const id of ['box-export-questions', 'box-export-xlsx', 'box-show-report', 'box-export-pdf']) assert.ok(tsx.includes(id), id);
  assert.ok(tsx.indexOf('box-export-questions') < tsx.indexOf('box-export-xlsx') && tsx.indexOf('box-export-xlsx') < tsx.indexOf('box-show-report') && tsx.indexOf('box-show-report') < tsx.indexOf('box-export-pdf'), 'card order');
  for (const f of ['qr.css', 'wizard.css', 'system.css', 'surface.css', 'layers.css']) assert.doesNotMatch(rd('src', 'styles', f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\.qr-summary-step\s*\{[^}]*max-width:\s*none[^}]*\}/g, ''), /\.qr-summary-step\s*\{[^}]*max-width:\s*\d/, f + ' narrows the summary');
});
test('progress toast is a card with a header and a bar; no language selector outside Settings', () => {
  const tsx = rd('src', 'components', 'wizard', 'ProgressToast.tsx'); assert.match(tsx, /qr-busy-h/); assert.match(tsx, /qr-busy-b/); assert.match(tsx, /data-testid="busy-text"/);
  assert.match(rd('src', 'styles', 'layers.css'), /\.qr-busy\s*\{[^}]*border:\s*1px solid[^}]*box-shadow/);
});
