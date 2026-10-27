// Parts list status groups on the INSTALLED app (window offscreen): EN + HE, last group collapsed; prints group counts.
// Usage: node scripts/shots-groups.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.unmaximize(); w.setBounds({ x: -30000, y: -30000, width: 1400, height: 900 }); });
  await win.waitForSelector('[data-testid=dropzone]');
  if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]');
  await win.evaluate((p) => window.__qrRun(p), [path.join(data, 'fixtures', 'RAFAEL_batch1.rar'), path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=parts-panel]'), null, { timeout: 15 * 60 * 1000 });
  const groups = await win.$$eval('[data-testid^=pgroup-h-]', (h) => h.map((x) => x.closest('section').dataset.status + ':' + x.querySelector('.qr-pgroup-n').textContent));
  console.log('groups', groups.join(' '));
  const last = groups.length > 1 ? groups[groups.length - 1].split(':')[0] : null;
  for (const lang of ['en', 'he']) {
    await win.evaluate((l) => window.__qrSetSettings({ uiLanguage: l, textSize: 'normal' }), lang);
    await win.evaluate(() => { window.__qrDetails(false); window.__qrSelect(0, 'drawing'); });
    if (last) { const open = await win.getAttribute(`[data-testid=pgroup-${last}]`, 'data-open'); if (open === 'true') await win.click(`[data-testid=pgroup-h-${last}]`); }
    await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, `v014_groups_${lang}.png`) });
    const order = await win.$$eval('[data-testid^=pgroup-h-]', (h) => h.map((x) => x.textContent.trim()));
    console.log(lang, JSON.stringify(order), 'dir=' + await win.evaluate(() => document.documentElement.dir));
  }
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
