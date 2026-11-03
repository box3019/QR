'use strict';
// Close job tabs: × / middle-click, unsaved Save-Do not save-Cancel, close all / others, ImportCache cleanup, overflow, disabled contrast.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const load = (f) => import(pathToFileURL(path.join(root, 'src', f)).href);

test('closePrompt: busy and unsaved ask; saved / empty / dirty-only do not', async () => {
  const s = await load('projects/store.mjs');
  assert.strictEqual(s.closePrompt({ status: 'busy' }), 'busy');
  assert.strictEqual(s.closePrompt({ status: 'ready', unsaved: true, nParts: 2 }), 'unsaved');
  assert.strictEqual(s.closePrompt({ status: 'ready', unsaved: true, nParts: 0 }), null);
  assert.strictEqual(s.closePrompt({ status: 'ready', dirty: true, nParts: 2 }), null);
  assert.strictEqual(s.closePrompt({ status: 'empty' }), null);
  assert.strictEqual(s.closePrompt(null), null);
});

test('jobsNeedingCloseAsk lists unsaved labels once; needed when busy or unsaved', async () => {
  const s = await load('projects/store.mjs');
  const metas = { a: { unsaved: true, nParts: 1, label: '701751', customer: 'RAFAEL' }, b: { status: 'busy', nParts: 1, label: '702903' }, c: { status: 'ready', nParts: 1 } };
  const r = s.jobsNeedingCloseAsk(['a', 'b', 'c'], metas);
  assert.strictEqual(r.needed, true); assert.strictEqual(r.busy, true);
  assert.deepStrictEqual(r.unsaved.map((x) => x.label), ['701751']);
  assert.strictEqual(s.jobsNeedingCloseAsk(['c'], metas).needed, false);
});

test('nextActiveAfterClose picks the neighbour; last tab yields null (empty start)', async () => {
  const s = await load('projects/store.mjs');
  assert.strictEqual(s.nextActiveAfterClose(['a', 'b', 'c'], 'a', ['a']), 'b');
  assert.strictEqual(s.nextActiveAfterClose(['a', 'b', 'c'], 'c', ['c']), 'b');
  assert.strictEqual(s.nextActiveAfterClose(['a', 'b', 'c'], 'b', ['a', 'b']), 'c');
  assert.strictEqual(s.nextActiveAfterClose(['a'], 'a', ['a']), null);
  assert.strictEqual(s.nextActiveAfterClose(['a', 'b'], 'a', ['b']), 'a');
});

test('tab overflow: all fit, then More jobs; active tab stays visible', async () => {
  const s = await load('projects/store.mjs');
  assert.strictEqual(s.tabFitCount(800, 140, 32, 100, 3), 3);
  assert.ok(s.tabFitCount(200, 140, 32, 100, 5) < 5);
  assert.ok(s.tabFitCount(560, 140, 32, 100, 4) < 4, '4 wide tabs overflow a short strip');
  const v = s.visibleTabIds(['a', 'b', 'c', 'd', 'e'], 'e', 2);
  assert.ok(v.shown.includes('e') && v.shown.length === 2 && v.rest.includes('b') && !v.rest.includes('e'));
  const all = s.visibleTabIds(['a', 'b'], 'a', 8);
  assert.deepStrictEqual(all.rest, []);
});

test('ImportCache is per-job and releaseJobCache deletes only that job; History adopt copies files', () => {
  const A = require('../core/intake/archive.cjs');
  const P = require('../core/projects.cjs');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-cache-'));
  const cache = path.join(d, 'ImportCache');
  const zip = path.join(d, 'pack.bin'); fs.writeFileSync(zip, Buffer.from('hello-archive'));
  const job = 'pjobclose1';
  const dir = A.cacheDirFor(zip, cache, job);
  assert.ok(dir.includes(path.join('ImportCache', job)));
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'draw.pdf'), '%PDF-1.4 x');
  const other = A.cacheDirFor(zip, cache, 'pother99');
  fs.mkdirSync(other, { recursive: true }); fs.writeFileSync(path.join(other, 'keep.pdf'), '%PDF-1.4 y');
  const dest = path.join(d, 'projects', job, 'files');
  const adopted = P.adoptJobFiles({ drawing: { path: path.join(dir, 'draw.pdf'), name: 'draw.pdf' }, note: 'keep' }, dest, [cache]);
  assert.ok(adopted.drawing.path.startsWith(dest));
  assert.ok(fs.existsSync(adopted.drawing.path));
  assert.strictEqual(adopted.note, 'keep');
  assert.strictEqual(A.releaseJobCache(cache, job), true);
  assert.ok(!fs.existsSync(path.join(cache, job)));
  assert.ok(fs.existsSync(path.join(other, 'keep.pdf')));
  assert.ok(fs.existsSync(adopted.drawing.path), 'adopted file survives cache release');
});

test('UI: close × on every tab, middle click, More jobs, close-all in Settings and context menu', () => {
  const tb = src('src/components/tabs/TabsBar.tsx');
  assert.ok(!/tabs\.length\s*>\s*1/.test(tb));
  assert.ok(/tab-close/.test(tb) && /tab-more-close/.test(tb) && /onAuxClick/.test(tb) && /onContextMenu/.test(tb));
  assert.ok(/\\u00d7/.test(tb) && /closest\('\.qr-topbar'\)/.test(tb));
  assert.ok(/tab\.closeOthers/.test(tb) && /tab\.closeAll/.test(tb) && /tab\.more/.test(tb));
  assert.ok(/visibleTabIds/.test(tb) && /tabFitCount/.test(tb));
  const app = src('src/App.tsx');
  assert.ok(/CloseJobsDialog/.test(app) && /onCloseAllJobs/.test(app) && /P\.closeAll/.test(app));
  const st = src('src/settings/SettingsDialog.tsx');
  assert.ok(/settings-close-all/.test(st) && /st\.closeAll/.test(st));
  const up = src('src/projects/useProjects.ts');
  assert.ok(/releaseImportCache/.test(up) && /closeAll/.test(up) && /closeOthers/.test(up));
  assert.ok(!/removeHistory/.test(up));
  const dlg = src('src/components/tabs/CloseJobsDialog.tsx');
  assert.ok(/close-save/.test(dlg) && /close-discard/.test(dlg) && /close-cancel/.test(dlg) && /close-unsaved-list/.test(dlg));
  const css = src('src/styles/wizard.css');
  assert.ok(/\.qr-ptabs \{[^}]*overflow:\s*hidden/.test(css));
  assert.ok(!/\.qr-ptabs \{[^}]*overflow-x:\s*auto/.test(css));
  const layers = src('src/styles/layers.css');
  assert.ok(/--mrt-text/.test(layers) && /#dc2626/.test(layers) && /opacity:\s*1 !important/.test(layers));
  assert.ok(/flex-wrap:\s*nowrap !important/.test(layers));
  const fit = src('src/styles/fit.css');
  assert.ok(/flex-wrap:\s*nowrap !important/.test(fit));
  assert.ok(/^button, \.mrt-btn/m.test(fit) && !/button:not\(/.test(fit));
  assert.ok(/\.mrt-workspace-tab__close/.test(fit) && /24px/.test(fit));
  const qr = src('src/styles/qr.css');
  assert.ok(/\.qr-topbar \{ flex-wrap: nowrap/.test(qr));
  const lay = src('scripts/check-layout.cjs');
  assert.ok(/tab close contrast/.test(lay) && /tab close glyph size/.test(lay) && /topbar wraps/.test(lay));
  assert.ok(/command label truncated/.test(lay) && /command button height/.test(lay));
  assert.ok(/step menu centred/.test(lay) && /tab chip font/.test(lay) && /tab close hit area/.test(lay));
  assert.ok(/\[4, 8, 15\]/.test(lay) && /1366, 768, 1/.test(lay) && /1920, 1080, 2/.test(lay));
  assert.ok(/tab-more-close/.test(lay));
  assert.ok(/clipSel/.test(lay) && /labelNarrower/.test(lay) && /clipScreens/.test(lay) && /route-card/.test(lay));
  assert.ok(/qr-ck-body/.test(lay) && /qr-ck-where/.test(lay) && /zeroWidth/.test(lay));
  assert.ok(/overflowBox/.test(lay) && /package-list/.test(lay) && /CLIP_PALS/.test(lay) && /SETTINGS_TABS/.test(lay));
  assert.ok(/role="option"/.test(lay) && /textBox/.test(lay) && /stackedWrap/.test(lay));
  assert.ok(/lookSkip/.test(lay) && /\[onclick\]/.test(lay) && /res\.looks/.test(lay) && /plain/.test(lay));
  assert.ok(/headingSize/.test(lay) && /headingWeight/.test(lay) && /qr-ck-gh/.test(lay));
  const main = src('electron/main.cjs') + src('electron/preload.cjs');
  assert.ok(/qr:importCache:release/.test(main) && /releaseImportCache/.test(main) && /jobId: job/.test(main));
});

test('disabled buttons: white fill, dark text, dashed border, no grey fade, tooltip why', () => {
  const css = src('src/styles/buttons.css');
  assert.match(css, /--qr-btn-disabled-bg:\s*#ffffff;/);
  assert.match(css, /--qr-btn-disabled-fg:\s*#3a3a3c;/);
  assert.match(css, /border-style:\s*dashed/);
  assert.match(css, /--qr-btn-disabled-opacity:\s*1;/);
  const mrt = src('src/ui/mrtButtons.ts');
  assert.doesNotMatch(mrt, /disabled:opacity-45/);
  assert.doesNotMatch(mrt, /disabled:pointer-events-none/);
  const app = src('src/App.tsx');
  assert.ok(/why="dis.nothingToPrint"/.test(app) && /why="dis.nothingToPdf"/.test(app));
  const foot = src('src/components/wizard/WizardFooter.tsx');
  assert.ok(/nw \? t\(nw\)/.test(foot));
});

test('i18n: close / overflow / disabled keys in EN and HE; HE tab keys have no Latin; version 0.1.14', () => {
  const en = JSON.parse(src('src/i18n/en.json').replace(/^\uFEFF/, ''));
  const he = JSON.parse(src('src/i18n/he.json').replace(/^\uFEFF/, ''));
  for (const k of ['tab.close', 'tab.closeAll', 'tab.closeOthers', 'tab.more', 'tab.discard', 'tab.closeUnsaved', 'tab.closeAllUnsaved', 'st.closeAll', 'st.closeAllTip', 'tip.tabMore', 'dis.nothingToPdf']) {
    assert.ok(en[k], 'en ' + k); assert.ok(he[k], 'he ' + k);
  }
  assert.strictEqual(en['tab.close'], 'Close');
  assert.strictEqual(en['tab.closeAll'], 'Close all jobs');
  assert.strictEqual(en['tab.more'], 'More jobs');
  assert.strictEqual(en['tab.discard'], 'Do not save');
  for (const k of Object.keys(he).filter((k) => k.startsWith('tab.'))) assert.doesNotMatch(he[k], /[A-Za-z]/, k);
  assert.strictEqual(JSON.parse(src('package.json')).version, '0.1.14');
});
