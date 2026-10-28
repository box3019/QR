'use strict';
// The 11 MRT built-in visual presets, reimplemented in QR: one test per preset (token spot-checks copied from MRT 9.0.52,
// i18n names and taglines in EN and HE, a mini mock, contrast), plus default, persistence and the Settings > Interface structure.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const os = require('os');
const root = path.join(__dirname, '..'); const rd = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const S = require('../core/settings.cjs');
const en = JSON.parse(rd('src', 'i18n', 'en.json')); const he = JSON.parse(rd('src', 'i18n', 'he.json'));
const css = rd('src', 'styles', 'themes.css'); const layers = rd('src', 'styles', 'layers.css');
const panel = rd('src', 'settings', 'PresetsPanel.tsx'); const dlg = rd('src', 'settings', 'SettingsDialog.tsx');

// id: [MRT canvas, surface, text, accent, corner radius] (values read from MRT's built-in preset token maps, 9.0.52)
const MRT = {
  'aris-glass': ['#ebebed', '#ffffff', '#1c1c1e', '#48484a', 10],
  'icloud-windows': ['#ebebed', '#ffffff', '#1c1c1e', '#48484a', 8],
  'cleanmymac': ['#eadfeb', '#ffffff', '#111827', '#9a86b5', 8],
  'priority-erp': ['#b8bcc4', '#f4f5f7', '#0a1628', '#334155', 8],
  'industrial-steel': ['#b8c0cc', '#ffffff', '#020617', '#1e293b', 8],
  'graphite': ['#252b36', '#3d4654', '#ffffff', null, 8],
  'warm-neutral': ['#e5dcc8', '#fffdf8', '#1c1917', '#57534e', 8],
  'soft-salad': ['#e2ebe4', '#ffffff', '#1c1f1e', '#526958', 8],
  'soft-beige': ['#ece5d8', '#ffffff', '#2a2520', '#6f6252', 8],
  'soft-olive-gray': ['#e4e6df', '#ffffff', '#252622', '#5a5f50', 8],
  'high-contrast': ['#eef2f6', '#ffffff', '#000000', '#000000', 8],
};
function block(id) {
  const sel = id === 'graphite' ? "[data-mrt-theme='dark']" : `[data-mrt-theme='light'][data-qr-palette='${id}']`;
  const i = css.indexOf(sel + ' {'); assert.ok(i >= 0, 'css block for ' + id); return css.slice(i, css.indexOf('}', i));
}
const tok = (b, name) => (b.match(new RegExp('--' + name + ':\\s*([^;]+);')) || [])[1];

test('there are exactly 11 presets, in MRT order, and the default is MRT\'s default (Industrial Steel)', () => {
  assert.strictEqual(S.PALETTES.length, 11); assert.deepStrictEqual(S.PALETTES, Object.keys(MRT));
  assert.strictEqual(S.DEFAULTS.palette, 'industrial-steel');
  assert.match(rd('src', 'theme', 'themes.ts'), /DEFAULT_PALETTE = 'industrial-steel'/);
});
for (const id of Object.keys(MRT)) {
  test('preset ' + id + ': MRT tokens, names, tagline, font, radius, status colours', () => {
    const b = block(id); const [bg, surf, text, acc, rad] = MRT[id];
    assert.strictEqual(tok(b, 'mrt-bg').toLowerCase(), bg, 'canvas');
    assert.strictEqual(tok(b, 'mrt-surface').toLowerCase(), surf, 'surface'); assert.strictEqual(tok(b, 'mrt-text').toLowerCase(), text, 'text');
    if (acc) assert.strictEqual((tok(b, 'qr-accent-mrt') || '').toLowerCase(), acc, 'MRT accent (the text-safe twin is --mrt-accent)');
    assert.ok(tok(b, 'mrt-font-family'), 'font family'); assert.strictEqual(parseInt(tok(b, 'mrt-radius'), 10), rad); assert.ok(parseInt(tok(b, 'qr-card-r'), 10) >= rad, 'card radius'); assert.ok(tok(b, 'qr-row-py') && tok(b, 'qr-cell-px'), 'density');
    for (const k of ['mrt-accent', 'mrt-warning', 'mrt-danger', 'mrt-success', 'mrt-header-bg', 'qr-card-shadow', 'qr-st-ok', 'qr-st-warn', 'qr-st-bad']) assert.ok(tok(b, k), k + ' for ' + id);
    for (const L of [en, he]) { assert.ok(L['pal.' + id] && L['pald.' + id], 'name and tagline'); assert.ok(L['pald.' + id].length > 20); }
    assert.notStrictEqual(en['pal.' + id], he['pal.' + id]);
    assert.ok(S.normalizeSettings({ palette: id }).palette === id, 'accepted by settings');
  });
}
test('every preset is a distinct visual direction (canvas, surface and font/radius/density are not all equal)', () => {
  const sig = new Set(S.PALETTES.map((id) => { const b = block(id); return ['mrt-bg', 'mrt-surface', 'mrt-text', 'mrt-accent', 'mrt-danger', 'qr-row-py', 'qr-cell-px', 'mrt-font-family'].map((k) => tok(b, k)).join('|'); }));
  assert.strictEqual(sig.size, 11);
});
test('presets keep the layering tokens and light buttons (no flat white, no dark fills)', () => {
  for (const id of Object.keys(MRT)) { const b = block(id); for (const k of ['mrt-workspace-canvas', 'qr-rail-bg', 'mrt-chrome-surface', 'qr-btn-bg']) assert.ok(tok(b, k), k + ' ' + id); }
  assert.match(layers, /\.qr-root\[data-qr-rows='compact'\]\[data-qr-palette\]/, 'user row height still wins over the preset');
  assert.match(layers, /font-family: var\(--mrt-font-family/); assert.match(layers, /padding-inline: var\(--qr-cell-px/);
});
test('settings: persisted, old palette ids stay valid, unknown ids fall back to the default', () => {
  assert.strictEqual(S.normalizeSettings({}).palette, 'industrial-steel');
  assert.strictEqual(S.normalizeSettings({ palette: 'aris-glass' }).palette, 'aris-glass');
  assert.strictEqual(S.normalizeSettings({ palette: 'nope' }).palette, 'industrial-steel');
  const f = path.join(os.tmpdir(), 'qr-presets-' + process.pid + '.json');
  fs.writeFileSync(f, JSON.stringify(S.normalizeSettings({ palette: 'cleanmymac' })));
  assert.strictEqual(S.normalizeSettings(JSON.parse(fs.readFileSync(f, 'utf8'))).palette, 'cleanmymac'); fs.unlinkSync(f);
});
test('Settings > Interface is the presets screen: intro, chip row, card grid with a mini mock, SELECTED badge, preview, Apply', () => {
  for (const k of ['st.presetsIntro', 'st.presetsTitle', 'st.presetsSub', 'st.presetBuiltin', 'st.presetSelected', 'st.presetApply', 'st.presetPreviewing', 'tip.presetCard', 'tip.presetApply', 'tip.presetChip']) assert.ok(en[k] && he[k], k);
  assert.match(en['st.presetsTitle'], /Built-in visual presets/i);
  for (const tid of ['"presets"', '"palettes"', 'selected-badge', 'preset-apply', '"preset-chips"', "'chip-'", "'pal-'", "'mock-'"]) assert.ok(panel.includes(tid), tid);
  for (const part of ['qm-top', 'qm-input', 'qm-grid', 'qm-txt', 'qm-st']) assert.ok(panel.includes(part) && layers.includes(part), part);
  assert.match(panel, /onPreview/); assert.match(panel, /onApply/); assert.match(dlg, /onApplyPreset/);
  assert.match(panel, /title=\{[^}]*t\('tip\.presetApply'\)\}/); assert.match(panel, /t\('dis\.presetSame'\)/); assert.match(panel, /title=\{t\('tip\.presetChip'\)\}/);
  assert.ok(!dlg.includes("t('st.ifaceTheme')"), 'the simple light/dark option is replaced');
});
test('the preset cards are tiles, not buttons (MRT: tiles are not buttons) and each mock is themed with its own preset id', () => {
  assert.match(panel, /role="radio"/); assert.match(panel, /themeAttrs\(\{ palette: id, accent: 'slate' \}\)/);
});
test('Cancel restores the saved preset: the dialog keeps its own copy, because previewing mutates the settings prop', () => {
  assert.match(dlg, /const orig = useRef/); assert.match(dlg, /orig\.current\[k\]/); assert.match(dlg, /orig\.current = structuredClone\(n\)/);
});
