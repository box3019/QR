// Settings > Interface = the 11 built-in visual presets (SYNTHETIC only, no customer data): the screen in EN and HE at 1920x1080 and 1280x800,
// every preset previewed (one shot each), the SELECTED badge / Apply / persistence checks, and the default (Industrial Steel).
// Usage: node scripts/shots-presets.cjs <QR.exe> <outDir>   (QR_APP=<app dir> to run the dev build)
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const LOG = path.join(out, 'presets_log.txt'); const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok   ' : 'FAIL ', m); if (!c) bad++; };
const IDS = ['aris-glass', 'icloud-windows', 'cleanmymac', 'priority-erp', 'industrial-steel', 'graphite', 'warm-neutral', 'soft-salad', 'soft-beige', 'soft-olive-gray', 'high-contrast'];
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  await size(1920, 1080); await win.waitForTimeout(900);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const saved = () => win.evaluate(() => window.qr.getSettings());
  const open = async () => { await win.click('[data-testid=btn-settings]'); await win.waitForSelector('[data-testid=settings-dialog]'); await win.click('[data-testid=stab-interface]').catch(() => {}); await win.waitForSelector('[data-testid=palettes]'); await win.waitForTimeout(250); };
  const shot = (n) => win.screenshot({ path: path.join(out, `presets_${n}.png`) });
  // default = MRT's default preset
  await win.evaluate(() => window.__qrSetSettings({ uiLanguage: 'en', assistantLanguage: 'en', textSize: 'normal', accent: 'slate' })); await win.waitForTimeout(300);
  const s0 = await saved(); ok(s0.palette === 'industrial-steel', 'default palette is industrial-steel: ' + s0.palette);
  await open();
  ok((await win.$$('[data-testid^=pal-]')).length === 11, '11 preset cards'); ok((await win.$$('[data-testid=selected-badge]')).length === 1, 'exactly one SELECTED badge');
  ok(await win.$eval('[data-testid=pal-industrial-steel] [data-testid=selected-badge]', () => true).catch(() => false), 'the badge is on Industrial Steel');
  ok(await win.$eval('[data-testid=preset-apply]', (b) => b.disabled), 'Apply disabled until a different preset is previewed');
  ok(!!(await win.$eval('[data-testid=preset-apply]', (b) => b.title)), 'Apply has a tooltip');
  ok((await win.$$eval('[data-testid=preset-chips] button', (b) => b.filter((x) => !x.title).length)) === 0, 'every chip has a tooltip');
  await win.waitForTimeout(200); await shot('en_1920_default');
  for (const id of IDS) {
    await win.click('[data-testid=pal-' + id + ']'); await win.waitForTimeout(250);
    const root = await win.evaluate(() => document.querySelector('.qr-root').getAttribute('data-qr-palette'));
    ok(root === id, 'preview applies the preset to the app: ' + id + ' (' + root + ')');
    if (id !== 'industrial-steel') ok(!(await win.$eval('[data-testid=preset-apply]', (b) => b.disabled)), 'Apply enabled for ' + id);
    await shot('en_1920_' + id);
  }
  // Apply persists without closing
  await win.click('[data-testid=pal-cleanmymac]'); await win.click('[data-testid=preset-apply]'); await win.waitForTimeout(500);
  ok((await saved()).palette === 'cleanmymac', 'Apply persisted cleanmymac'); ok(!!(await win.$('[data-testid=settings-dialog]')), 'the dialog stays open after Apply');
  ok(await win.$eval('[data-testid=pal-cleanmymac] [data-testid=selected-badge]', () => true).catch(() => false), 'SELECTED badge moved to CleanMyMac');
  // Cancel after previewing another preset restores the applied one
  await win.click('[data-testid=pal-priority-erp]'); await win.waitForTimeout(200);
  await win.click('.qr-modal-f button:first-child'); await win.waitForTimeout(400);
  ok((await win.evaluate(() => document.querySelector('.qr-root').getAttribute('data-qr-palette'))) === 'cleanmymac', 'Cancel restores the applied preset');
  // HE (RTL) and 1280
  for (const l of ['he', 'en']) for (const [w, h] of [[1920, 1080], [1280, 800]]) {
    await size(w, h); await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x }), l); await win.waitForTimeout(400);
    if (!(await win.$('[data-testid=settings-dialog]'))) await open(); else await win.waitForTimeout(200);
    for (const id of ['industrial-steel', 'graphite', 'cleanmymac']) { await win.click('[data-testid=pal-' + id + ']'); await win.waitForTimeout(250); await shot(`${l}_${w}_${id}`); }
    const over = await win.evaluate(() => { const d = document.querySelector('[data-testid=settings-dialog]'); return d.scrollWidth - d.clientWidth; });
    ok(over <= 1, `${l} ${w}: no horizontal overflow in the dialog (${over})`);
    await win.evaluate(() => { const b = document.querySelector('.qr-modal-b'); if (b) b.scrollTop = b.scrollHeight; }); await win.waitForTimeout(200); await shot(`${l}_${w}_bottom`);
    await win.evaluate(() => { const b = document.querySelector('.qr-modal-b'); if (b) b.scrollTop = 0; });
  }
  console.log('PRESETSDONE', bad ? 'FAIL ' + bad : 'OK'); await app.evaluate(() => process.exit(0)).catch(() => {});
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
