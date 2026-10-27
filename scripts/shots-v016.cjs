// v0.1.6 redesign shots (HE + EN) on SYNTHETIC drawings only (no customer data).
// Usage: node scripts/shots-v016.cjs <QR.exe> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const page = (pn, body) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO PART ${pn}</p>${body}</body></html>`;
const DOCS = {
  'SYN_9900-0001_A': page('9900-0001', `<p>MATERIAL: AL 6061-T6 PER AMS-QQ-A-250/11</p><p>NOTES:</p><ol><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>PORT PER MS33649-08 .3750-24 UNF-2B</li><li>O-RING AS568-012, FKM</li><li>INSTALL KEENSERT MS51830-202</li><li>HELICOIL NASM21209C4-10</li><li>M6x1-6H THRU</li></ol>`),
  'SYN_9900-0002_A': page('9900-0002', `<p>NOTES:</p><ol><li>BREAK ALL SHARP EDGES</li><li>PAINT PER SPEC 123</li></ol>`),
  'SYN_9900-0003_A': page('9900-0003', `<p>MATERIAL: AL 6061-T6 PER AMS-QQ-A-250/11</p><p>NOTES:</p><ol><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li><li>BREAK ALL SHARP EDGES</li></ol>`),
  'SYN_9900-0004_A': page('9900-0004', `<p>MATERIAL: TITANIUM Ti-6Al-4V PER AMS 4911</p><p>NOTES:</p><ol><li>PASSIVATE PER AMS 2700</li></ol>`),
};
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.unmaximize(); w.setBounds({ x: -30000, y: -30000, width: 1600, height: 1000 }); });
  const shot = async (n) => { await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, `v016_${n}.png`) }); console.log('shot', n); };
  await win.waitForSelector('[data-testid=first-run]', { timeout: 60000 }); await win.click('[data-testid=first-run-ok]');
  for (const [name, html] of Object.entries(DOCS)) {
    const f = path.join(out, name + '.pdf');
    await app.evaluate(async ({ BrowserWindow }, [h, p]) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); require('fs').writeFileSync(p, await w.webContents.printToPDF({ pageSize: 'A4' })); w.destroy(); }, [html, f]);
    win.evaluate((p) => window.__qrRun(p), [f]); await win.waitForTimeout(1500);
    if (await win.$('[data-testid=drop-new]')) await win.click('[data-testid=drop-new]');
    await win.waitForFunction((n) => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= n, Object.keys(DOCS).indexOf(name) + 1, { timeout: 300000 });
  }
  console.log('parts', JSON.stringify(await win.evaluate(() => window.__qrParts.map((p) => [p.partNo, p.status, (p.standards || []).length, (p.problems || []).length]))));
  const sel = (n) => win.evaluate((pn) => { const i = window.__qrParts.findIndex((p) => String(p.partNo).includes(pn)); window.__qrSelect(i < 0 ? 0 : i, 'drawing'); }, n);
  for (const l of ['he', 'en']) {
    await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x, textSize: 'normal' }), l);
    await win.evaluate(() => { window.__qrDetails && window.__qrDetails(false); window.__qrStep(2); });
    await sel('9900-0001'); await win.waitForSelector('[data-testid=block]', { timeout: 30000 }).catch(() => console.log('no blocks')); await shot(`card_std_${l}`);
    const chev = await win.$('[data-testid=block][data-kind=standard] [data-testid=block-chev]'); if (chev) { await chev.click(); await shot(`card_std_open_${l}`); await chev.click(); }
    await sel('9900-0003'); await shot(`card_ok_${l}`);
    await sel('9900-0004'); await shot(`card_notours_${l}`);
    await sel('9900-0002'); await shot(`card_missing_${l}`);
    await win.click('[data-testid=tile-needsDoc]').catch(() => {}); await shot(`list_filter_${l}`); await win.click('[data-testid=tile-needsDoc]').catch(() => {});
    await sel('9900-0001'); await win.evaluate(() => window.__qrStep(3)); await shot(`docs_${l}`);
    await win.evaluate(() => window.__qrStep(4)); await shot(`summary_${l}`);
    if (await win.$('[data-testid=btn-questions]')) { await win.click('[data-testid=btn-questions]'); await shot(`dialog_questions_${l}`); await win.keyboard.press('Escape'); }
    if (await win.$('[data-testid=btn-summary]')) { await win.click('[data-testid=btn-summary]'); await shot(`dialog_summary_${l}`); await win.keyboard.press('Escape'); }
  }
  // all-good state: only the ready part
  await win.evaluate(() => { window.__qrStep(2); }); await win.click('[data-testid=tile-ready]').catch(() => {}); await shot('list_ready_en');
  await app.close(); console.log('DONE');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
