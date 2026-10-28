'use strict';
// App version next to the name (header, window title, Settings About): read from app.getVersion(), never hardcoded; LTR-isolated; muted.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..'); const src = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/^\uFEFF/, '');
const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
test('title and label: "QR v0.1.5", same in main and renderer, safe on empty', async () => { const m = require('../electron/title.cjs'); const r = await import(pathToFileURL(path.join(root, 'src/about/version.mjs')).href);
  for (const x of [m, r]) { assert.strictEqual(x.appTitle('0.1.5'), 'QR v0.1.5'); assert.strictEqual(x.appTitle('v0.2.0'), 'QR v0.2.0'); assert.strictEqual(x.versionLabel(' 1.0.0 '), 'v1.0.0'); assert.strictEqual(x.appTitle(''), 'QR'); assert.strictEqual(x.appTitle(null), 'QR'); assert.strictEqual(x.versionLabel(undefined), ''); } });
test('the version is read from the app, never hardcoded', () => { const v = require('../package.json').version; assert.ok(/^\d+\.\d+\.\d+/.test(v));
  const main = src('electron/main.cjs'); assert.ok(/appTitle\(app\.getVersion\(\)\)/.test(main) && /'qr:getVersion', \(\) => app\.getVersion\(\)/.test(main)); assert.ok(/getVersion: \(\) => ipcRenderer\.invoke\('qr:getVersion'\)/.test(src('electron/preload.cjs')));
  assert.ok(/title: title \|\| 'QR'/.test(src('electron/window.cjs')));
  const files = [...walk('src'), ...walk('electron')].filter((f) => /\.(tsx?|mjs|cjs)$/.test(f)); const vr = new RegExp('(?<![\\d.])' + v.replace(/\./g, '\\.') + '(?![\\d])');
  for (const f of files) assert.ok(!vr.test(src(f)), 'hardcoded version in ' + f); });
test('header and Settings show it quietly, LTR-isolated, muted, no toolbar button', () => { const a = src('src/App.tsx'); assert.ok(/<span className="qr-brand-badge">QR<\/span><AppVersion \/>/.test(a));
  const bar = a.slice(a.indexOf('qr-topbar mrt-workspace-topbar-chrome'), a.indexOf('className="qr-projs"')); assert.ok(!/TopButton[^>]*version/i.test(bar));
  const c = src('src/about/AppVersion.tsx'); assert.ok(/dir="ltr"/.test(c) && /qr-ltr/.test(c) && /title=\{t\('about\.version'/.test(c) && /data-testid="app-version"/.test(c));
  const css = src('src/styles/wizard.css'); assert.ok(/\.qr-root \.qr-ver \{[^}]*color: var\(--mrt-text-muted\)/.test(css) && /\.qr-root \.qr-ver \{[^}]*font-size: 0\.6875rem/.test(css) && /direction: ltr/.test(css));
  assert.ok(/settings-about/.test(src('src/settings/SettingsDialog.tsx')) && /AppVersion/.test(src('src/settings/SettingsDialog.tsx')));
  for (const l of ['en', 'he']) { const j = JSON.parse(src('src/i18n/' + l + '.json')); assert.ok(j['about.title'] && /\{name\}/.test(j['about.version']), l); } });
