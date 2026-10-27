// History: run one RFQ, open a new empty tab (Step 1 shows Recent), close the first tab, History dialog + search,
// reopen it at the same step. EN + HE. Usage: node scripts/shots-history.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow(); win.on('dialog', (d) => d.dismiss());
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.unmaximize(); w.setBounds({ x: -30000, y: -30000, width: 1600, height: 1000 }); });
  await win.waitForSelector('[data-testid=dropzone]'); if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]');
  win.evaluate((p) => window.__qrRun(p), [path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => !document.querySelector('[data-testid=import-view][data-active=true]') && document.querySelector('[data-testid=parts-panel], [data-testid=breakdown-panel]'), null, { timeout: 10 * 60 * 1000 });
  await win.evaluate(() => window.__qrStep(3)); await win.waitForTimeout(1500);
  const first = await win.evaluate(() => window.__qrTabs()[0].id);
  console.log('HIST after run', JSON.stringify(await win.evaluate(() => window.__qrHistory().map((e) => [e.label, e.customer, e.nParts, e.groups, e.step]))));
  await win.evaluate(() => window.__qrAddTab()); await win.waitForTimeout(800);
  await win.click(`[data-testid=tab][data-id="${first}"] [data-testid=tab-close]`).catch(() => {}); await win.waitForTimeout(800);
  for (const l of ['en', 'he']) { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x }), l); await win.waitForTimeout(400); await win.screenshot({ path: path.join(out, `hist_step1_recent_${l}.png`) }); }
  console.log('RECENT', await win.$$eval('[data-testid=recent-row]', (r) => r.map((x) => x.textContent)), 'tabs', await win.evaluate(() => window.__qrTabs().length));
  for (const l of ['en', 'he']) { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x }), l); await win.click('[data-testid=btn-history]'); await win.waitForSelector('[data-testid=history]'); await win.waitForTimeout(300); await win.screenshot({ path: path.join(out, `hist_dialog_${l}.png`) });
    await win.fill('[data-testid=history-search]', 'zzz'); console.log('SEARCH zzz', await win.$$eval('[data-testid=history-row]', (r) => r.length));
    await win.fill('[data-testid=history-search]', '0518895'); console.log('SEARCH pn', await win.$$eval('[data-testid=history-row]', (r) => r.length)); await win.screenshot({ path: path.join(out, `hist_search_${l}.png`) });
    if (l === 'en') await win.click('[data-testid=history-close]'); }
  await win.click('[data-testid=history-open]'); await win.waitForTimeout(1500);
  const r = await win.evaluate(() => ({ tabs: window.__qrTabs().map((t) => [t.label, t.step, t.nParts, t.active]), step: document.querySelector('[data-testid=project]:not(.qr-proj-off)')?.dataset.step }));
  console.log('REOPEN', JSON.stringify(r), r.tabs.some((t) => t[3] && t[1] === 3 && t[2] > 0) ? 'REOPEN-OK' : 'REOPEN-FAIL'); await win.screenshot({ path: path.join(out, 'hist_reopened_he.png') });
  await win.click('[data-testid=btn-history]'); await win.click('[data-testid=history-open]'); await win.waitForTimeout(500); console.log('FOCUS tabs', await win.evaluate(() => window.__qrTabs().length));
  await app.close(); console.log('HIST DONE');
})().catch((e) => { console.error('HIST FAIL', e); process.exit(1); });
