'use strict';
// Settings > Language: its own section right after General, large radio cards EN / HE / RU, ONE program-language selector, Interface has only the looks.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
test('Language is its own nav section right after General; the selector is not in Interface', () => { const st = src('src/settings/SettingsDialog.tsx');
  const tabs = /const TABS = \[([^\]]+)\]/.exec(st)[1].replace(/['\s]/g, '').split(','); assert.strictEqual(tabs[tabs.indexOf('general') + 1], 'language'); assert.ok(tabs.includes('interface'));
  const iface = st.slice(st.indexOf("tab === 'interface'"), st.indexOf("tab === 'general'")); assert.ok(!/uiLanguage|ui-lang|st\.uiLang|LanguagePanel/.test(iface), 'Interface has no language selector');
  assert.strictEqual((st.match(/uiLanguage/g) || []).length, 3, 'uiLanguage used only in LIVE, the Language tab and nowhere else'); assert.ok(/<LanguagePanel value=\{s\.uiLanguage\}/.test(st)); });
test('Language panel: one normal settings row (label, compact dropdown, one muted help line), native names, RU not selectable', () => { const p = src('src/settings/LanguagePanel.tsx');
  assert.ok(/<div className="qr-field"/.test(p) && /<label htmlFor="ui-lang">\{t\('st\.uiLang'\)\}/.test(p) && /<select id="ui-lang" className="qr-input"/.test(p) && /className="qr-muted" data-testid="language-note"/.test(p) && /st\.langExplain/.test(p), 'same row/control classes as the other settings');
  assert.ok(!/radiogroup|role="radio"|<h3|style=|fontSize/.test(p), 'no big cards, no own headings or inline sizes');
  assert.ok(/'English'/.test(p) && /u05e2\\u05d1\\u05e8\\u05d9\\u05ea/.test(p) && /u0420\\u0443\\u0441\\u0441\\u043a\\u0438\\u0439/.test(p)); assert.ok(/id: 'ru'[^}]*soon: true/.test(p) && /disabled=\{!!l\.soon\}/.test(p));
  assert.ok(!/qr-langcard|qr-lang-h/.test(src('src/styles/wizard.css')), 'the card CSS is gone'); });
test('keys exist in en and he (and ru for the tab name); one short help line', () => { const en = JSON.parse(src('src/i18n/en.json')), he = JSON.parse(src('src/i18n/he.json')), ru = JSON.parse(src('src/i18n/ru.json'));
  for (const k of ['st.tab.language', 'st.langExplain', 'st.langSoon']) assert.ok(en[k] && he[k], k);
  assert.deepStrictEqual([en['st.tab.language'], he['st.tab.language'], ru['st.tab.language']], ['Language', '\u05e9\u05e4\u05d4', '\u042f\u0437\u044b\u043a']); assert.ok(en['st.langExplain'].length < 90 && he['st.langExplain'].length < 90); });
