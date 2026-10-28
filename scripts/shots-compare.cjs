// v0.1.6 QR-vs-MRT comparison shots (HE + EN) on SYNTHETIC drawings only (no customer data).
// Usage: node scripts/shots-compare.cjs <QR.exe> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); const PALS = (process.env.QR_THEMES || 'aris-glass,graphite').split(','); fs.mkdirSync(out, { recursive: true });
const page = (pn, body) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO PART ${pn}</p>${body}</body></html>`;
const DOCS = {
  'SYN_9900-0001_A': page('9900-0001', `<p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>PORT PER MS33649-08 .3750-24 UNF-2B</li><li>O-RING AS568-012, FKM</li><li>INSTALL KEENSERT MS51830-202</li><li>HELICOIL NASM21209C4-10</li><li>M6x1-6H THRU</li></ol>`),
  'SYN_9900-0002_A': page('9900-0002', `<p>NOTES:</p><ol><li>BREAK ALL SHARP EDGES</li><li>PAINT PER SPEC 123</li></ol>`),
  'SYN_9900-0003_A': page('9900-0003', `<p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li><li>BREAK ALL SHARP EDGES</li></ol>`),
  'SYN_9900-0004_A': page('9900-0004', `<p>MATERIAL: TITANIUM Ti-6Al-4V PER AMS 4911</p><p>NOTES:</p><ol><li>PASSIVATE PER AMS 2700</li></ol>`),
};
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  const shot = async (n) => { await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, `cmp_${PAL}_${n}.png`) }); console.log('shot', n); };
  await size(1920, 1080);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const SIZES = [[1920, 1080], [1280, 800]];
  let PAL = PALS[0]; const setL = (l) => win.evaluate(([x, p]) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, textSize: 'normal', palette: p, accent: 'slate' }), [l, PAL]);
  for (const pal of PALS) { PAL = pal; for (const [w, h] of SIZES) for (const l of ['he', 'en']) { await size(w, h); await setL(l); await win.evaluate(() => window.__qrStep && window.__qrStep(1)); await shot(`${w}_${l}_1empty`); } }
  PAL = PALS[0]; await size(1920, 1080); await setL('en');
  const files = [];
  for (const [name, html] of Object.entries(DOCS)) {
    const f = path.join(out, name + '.pdf');
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4' }); w.destroy(); return b.toString('base64'); }, html);
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f);
  }
  await win.evaluate((p) => window.__qrRun(p), files); await win.waitForTimeout(600);
  if (await win.$('[data-testid=drop-new]')) await win.click('[data-testid=drop-new]');
  await win.evaluate(() => window.__qrStep(2));
  await win.waitForFunction((n) => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= n, Object.keys(DOCS).length, { timeout: 300000 });
  const sel = (n) => win.evaluate((pn) => { const i = window.__qrParts.findIndex((p) => String(p.partNo).includes(pn)); window.__qrSelect(i < 0 ? 0 : i, 'drawing'); }, n);
  for (const pal of PALS) { PAL = pal; for (const [w, h] of SIZES) for (const l of ['he', 'en']) {
    await size(w, h); await setL(l);
    await win.evaluate(() => { window.__qrDetails && window.__qrDetails(false); window.__qrStep(1); }); await shot(`${w}_${l}_1intake`);
    await win.evaluate(() => window.__qrStep(2)); await sel('9900-0001'); await win.waitForSelector('[data-testid=block]', { timeout: 30000 }).catch(() => console.log('no blocks')); await shot(`${w}_${l}_2parts`);
    await win.evaluate(() => window.__qrStep(3)); await shot(`${w}_${l}_3docs`);
    await win.evaluate(() => window.__qrStep(4)); await shot(`${w}_${l}_4summary`);
  }
  }
  await app.close(); console.log('CMPDONE');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
