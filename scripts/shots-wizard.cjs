// Wizard steps 1-4 on the INSTALLED app (window offscreen), EN + HE. Step 2 opens the first part with friend sections and expands one.
// Usage: node scripts/shots-wizard.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.unmaximize(); w.setBounds({ x: -30000, y: -30000, width: 1600, height: 1000 }); });
  await win.waitForSelector('[data-testid=dropzone]');
  if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]');
  for (const lang of ['en', 'he']) { await win.evaluate((l) => window.__qrSetSettings({ uiLanguage: l }), lang); await win.waitForTimeout(400); await win.screenshot({ path: path.join(out, `v014_wizard_step1_${lang}.png`) });
    console.log(lang, 'step1', JSON.stringify(await win.evaluate(() => ({ fs: getComputedStyle(document.querySelector('.mrt-wizard-step-label')).fontSize, states: [...document.querySelectorAll('.mrt-wizard-step')].map((b) => b.dataset.state), addBtn: !!document.querySelector('[data-testid=btn-add]'), folder: !!document.querySelector('[data-testid=btn-choose-folder]'), blue: getComputedStyle(document.querySelector('[data-testid=btn-choose-files]')).backgroundColor })))); }
  for (const size of ['normal', 'large', 'xlarge', 'huge']) { await win.evaluate((z) => window.__qrSetSettings({ uiLanguage: 'he', textSize: z }), size); await win.waitForTimeout(300); await win.screenshot({ path: path.join(out, `v014_wizard_step1_he_${size}.png`) });
    console.log('size', size, await win.evaluate(() => [getComputedStyle(document.documentElement).fontSize, getComputedStyle(document.querySelector('.mrt-wizard-step-label')).fontSize, (document.querySelector('[data-testid=assistant-bubble]') ? getComputedStyle(document.querySelector('[data-testid=assistant-bubble]')).fontSize : 'no-bubble')].join(' '))); }
  await win.evaluate(() => window.__qrSetSettings({ textSize: 'large' }));
  win.evaluate((p) => window.__qrRun(p), [path.join(data, 'fixtures', 'RAFAEL_batch1.rar'), path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => /\d/.test(document.querySelector('[data-testid=busy-text]')?.textContent || ''), null, { timeout: 120000 }).catch(() => {});
  await win.screenshot({ path: path.join(out, 'v014_busy_he.png') }); console.log('busy', await win.evaluate(() => document.querySelector('[data-testid=busy]')?.innerText));
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=breakdown-panel]'), null, { timeout: 15 * 60 * 1000 });
  const idx = await win.evaluate(() => { const ps = window.__qrParts; let best = 0, n = -1; ps.forEach((p, i) => { const k = (p.requirements || []).reduce((s, r) => s + (r.procs || []).length + (r.masks || []).length, 0); if (k > n) { n = k; best = i; } }); return best; });
  for (const lang of ['en', 'he']) {
    await win.evaluate((l) => window.__qrSetSettings({ uiLanguage: l }), lang);
    await win.evaluate((i) => { window.__qrDetails(false); window.__qrSelect(i, 'drawing'); }, idx);
    await win.waitForTimeout(600);
    const sec = await win.$('[data-testid=bd-coatings][data-empty=false] [data-testid=bd-open-coatings]') || await win.$('[data-testid^=bd-][data-empty=false] [data-testid^=bd-open-]');
    if (sec) { await sec.click(); await win.waitForTimeout(1500); }
    await win.screenshot({ path: path.join(out, `v014_wizard_step2_${lang}.png`) });
    const info = await win.evaluate(() => ({ dir: document.documentElement.dir, of: document.querySelector('[data-testid=card-of]')?.textContent, secs: [...document.querySelectorAll('[data-testid=processes-panel] section.qr-bsec')].map((s) => s.dataset.testid + (s.dataset.empty === 'true' ? '(empty)' : '')), focus: !!document.querySelector('[data-kind=focus]') }));
    console.log(lang, 'step2', JSON.stringify(info));
    for (const st of [3, 4]) { await win.evaluate((s) => window.__qrStep(s), st); await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, `v014_wizard_step${st}_${lang}.png`) }); }
  }
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
