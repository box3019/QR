'use strict';
// Settings > Language: its own section right after General, large radio cards EN / HE / RU, ONE program-language selector, Interface has only the looks.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
test('Language is its own nav section right after General; the selector is not in Interface', () => { const st = src('src/settings/SettingsDialog.tsx');
  const tabs = /const TABS = \[([^\]]+)\]/.exec(st)[1].replace(/['\s]/g, '').split(','); assert.strictEqual(tabs[tabs.indexOf('general') + 1], 'language'); assert.ok(tabs.includes('interface'));
  const iface = st.slice(st.indexOf("tab === 'interface'"), st.indexOf("tab === 'general'")); assert.ok(!/uiLanguage|ui-lang|st\.uiLang|LanguagePanel/.test(iface), 'Interface has no language selector');
  assert.strictEqual((st.match(/uiLanguage/g) || []).length, 3, 'uiLanguage used only in LIVE, the Language tab and nowhere else'); assert.ok(/<LanguagePanel value=\{s\.uiLanguage\}/.test(st)); });
test('Language panel: heading, one-line explanation, radio cards with native names, current highlighted, RU explained', () => { const p = src('src/settings/LanguagePanel.tsx');
  assert.ok(/<h3 className="qr-lang-h">\{t\('st\.uiLang'\)\}/.test(p) && /st\.langExplain/.test(p) && /role="radiogroup"/.test(p) && /role="radio"/.test(p) && /aria-checked=\{value === l\.id\}/.test(p) && /data-active=\{value === l\.id\}/.test(p));
  assert.ok(/'English'/.test(p) && /u05e2\\u05d1\\u05e8\\u05d9\\u05ea/.test(p) && /u0420\\u0443\\u0441\\u0441\\u043a\\u0438\\u0439/.test(p)); assert.ok(/title=\{l\.soon \? t\('st\.langSoon'\) : t\('tip\.langCard'/.test(p));
  const css = src('src/styles/wizard.css'); assert.ok(/\.qr-langcard\[data-active='true'\]/.test(css) && /\.qr-langcard-name \{ font-size: 1\.5rem/.test(css)); });
test('keys exist in en and he (and ru for the tab name)', () => { const en = JSON.parse(src('src/i18n/en.json')), he = JSON.parse(src('src/i18n/he.json')), ru = JSON.parse(src('src/i18n/ru.json'));
  for (const k of ['st.tab.language', 'st.langExplain', 'tip.langCard', 'st.langCurrent', 'st.langSoon', 'st.langSoonShort']) assert.ok(en[k] && he[k], k);
  assert.deepStrictEqual([en['st.tab.language'], he['st.tab.language'], ru['st.tab.language']], ['Language', '\u05e9\u05e4\u05d4', '\u042f\u0437\u044b\u043a']); assert.ok(/\{name\}/.test(en['tip.langCard']) && /\{name\}/.test(he['tip.langCard'])); });
