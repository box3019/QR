// v0.1.5 shots: tutorial (3 steps x HE/RU/EN), Step 1/2/Summary/History in HE, PDF report, and the standards card
// on a synthetic drawing (generated here, no customer data). Usage: node scripts/shots-v015.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const SYN = `<html><body style="font:14px Arial;padding:40px"><h2>PART NO 9900-0001 REV A</h2><p>TITLE: MANIFOLD BLOCK (DEMO)</p><p>MATERIAL: AL 6061-T6 PER AMS-QQ-A-250/11</p>
<p>NOTES:</p><ol><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>O-RING AS568-012, FKM</li><li>INSTALL KEENSERT MS51830-202</li><li>HELICOIL NASM21209C4-10</li><li>M6x1-6H THRU</li></ol></body></html>`;
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.unmaximize(); w.setBounds({ x: -30000, y: -30000, width: 1600, height: 1000 }); });
  const shot = async (n) => { await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, `v015_${n}.png`) }); console.log('shot', n); };
  await win.waitForSelector('[data-testid=first-run]', { timeout: 60000 });
  for (const l of ['he', 'ru', 'en']) {
    await win.selectOption('[data-testid=tutorial-lang]', l);
    while (await win.$('[data-testid=tutorial-prev]:not([disabled])')) await win.click('[data-testid=tutorial-prev]');
    const want = [1, 4, 9]; let i = 1;
    for (const w of want) { while (i < w) { await win.click('[data-testid=tutorial-next]'); i++; } await shot(`tour_${l}_${w}`); }
  }
  await win.click('[data-testid=first-run-ok]');
  await win.evaluate(() => window.__qrSetSettings({ uiLanguage: 'he', textSize: 'normal' }));
  await shot('step1_he');
  win.evaluate((p) => window.__qrRun(p), [path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=parts-panel], [data-testid=breakdown-panel]'), null, { timeout: 600000 });
  await win.evaluate(() => { window.__qrDetails && window.__qrDetails(false); window.__qrSelect && window.__qrSelect(0, 'drawing'); }); await shot('step2_he');
  await win.evaluate(() => window.__qrStep(4)); await shot('summary_he');
  const parts = await win.evaluate(() => window.__qrParts);
  console.log('pdf', JSON.stringify(await win.evaluate(([p, t]) => window.qr.exportReport(p, 'he', { rfq: 'DEMO', customer: 'KLA' }, t), [parts, path.join(out, 'report_he.pdf')])));
  if (await win.$('[data-testid=btn-history]')) { await win.click('[data-testid=btn-history]'); await shot('history_he'); await win.keyboard.press('Escape'); }
  // synthetic drawing with standard callouts
  const syn = path.join(out, 'SYNTH_9900-0001_A.pdf');
  await app.evaluate(async ({ BrowserWindow }, [html, f]) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html)); require('fs').writeFileSync(f, await w.webContents.printToPDF({ pageSize: 'A4' })); w.destroy(); }, [SYN, syn]);
  const before = await win.evaluate(() => (window.__qrParts || []).length);
  win.evaluate((p) => window.__qrRun(p), [syn]);
  await win.waitForTimeout(1500);
  if (await win.$('[data-testid=drop-new]')) await win.click('[data-testid=drop-new]');
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).some((p) => (p.standards || []).length), null, { timeout: 300000 });
  const st = await win.evaluate(() => (window.__qrParts || []).flatMap((p) => (p.standards || []).map((s) => ({ std: s.std, dash: s.dash, status: s.status, flags: (s.flags || []).map((f) => f.type) }))));
  console.log('standards', JSON.stringify(st));
  for (const l of ['he', 'en']) { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x }), l); await win.evaluate(() => { window.__qrStep(2); window.__qrSelect && window.__qrSelect(0, 'drawing'); }); await win.waitForSelector('[data-testid=block][data-kind=standard]', { timeout: 30000 }).catch(() => console.log('no standards-panel')); const el = await win.$('[data-testid=block][data-kind=standard]'); if (el) { await el.scrollIntoViewIfNeeded(); } await shot('std_card_' + l); }
  await win.evaluate(() => window.__qrStep(3)); await shot('std_step3_he');
  const p2 = await win.evaluate(() => window.__qrParts);
  console.log('pdf2', JSON.stringify(await win.evaluate(([p, t]) => window.qr.exportReport(p, 'he', { rfq: 'DEMO', customer: 'DEMO' }, t), [p2, path.join(out, 'report_std_he.pdf')])));
  await app.close(); console.log('DONE');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
