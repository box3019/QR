// v0.1.4 screenshots of the INSTALLED app (window offscreen): main EN/HE, route + Processes, tutorial HE/RU/EN, settings.
// Usage: node scripts/shots-v014.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.unmaximize(); w.setBounds({ x: -30000, y: -30000, width: 1400, height: 900 }); });
  await win.waitForSelector('[data-testid=dropzone]');
  if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]');
  const shot = async (n) => { await win.waitForTimeout(400); await win.screenshot({ path: path.join(out, `v014_${n}.png`) }); };
  const set = (p) => win.evaluate((p) => window.__qrSetSettings(p), p);
  await win.evaluate((p) => window.__qrRun(p), [path.join(data, 'fixtures', 'RAFAEL_batch1.rar'), path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=parts-panel]'), null, { timeout: 15 * 60 * 1000 });
  for (const lang of ['en', 'he']) {
    await set({ uiLanguage: lang, textSize: 'normal' });
    await win.evaluate(() => { window.__qrDetails(false); window.__qrSelect(0, 'drawing'); }); await shot(`radius_after_main_${lang}`);
    await win.evaluate(() => window.__qrSelect(0, 'route')); await shot(`route_processes_${lang}`);
    await set({ uiLanguage: lang, textSize: 'huge' }); await win.evaluate(() => window.__qrSelect(0, 'drawing')); await shot(`overlap_after_main_${lang}_huge`);
    await set({ uiLanguage: lang, textSize: 'normal' });
    await win.evaluate(() => window.__qrDialog('settings')); await win.click('[data-testid=stab-customers]').catch(() => {}); await shot(`radius_after_settings_customers_${lang}`);
    await win.evaluate(() => window.__qrDialog(null));
  }
  await win.click('[data-testid=btn-help]');
  for (const l of ['he', 'ru', 'en']) { await win.selectOption('[data-testid=tutorial-lang]', l); await win.click('[data-testid=tutorial-next]'); await shot(`tutorial_${l}`); }
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
