// QR progress-toast shots ("Reading drawing 1 of N") in every theme, HE + EN, on SYNTHETIC drawings only (no customer data).
// Usage: node scripts/shots-busy.cjs <QR.exe> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const PALS = (process.env.QR_THEMES || 'aris-glass,graphite').split(',');
const doc = (pn) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO PART ${pn}</p><p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li><li>O-RING AS568-012, FKM</li><li>M6x1-6H THRU</li></ol></body></html>`;
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  await size(1920, 1080);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  await win.evaluate(() => window.__qrSetSettings({ textSize: 'normal', accent: 'slate' }));
  const files = [];
  for (let i = 1; i <= 24; i++) {
    const f = path.join(out, `SYN_9800-${String(i).padStart(4, '0')}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4' }); w.destroy(); return b.toString('base64'); }, doc('9800-' + String(i).padStart(4, '0')));
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f);
  }
  await win.evaluate((p) => { window.__qrRun(p); }, files);
  await win.waitForTimeout(800); await win.evaluate(() => window.__qrStep(2)).catch(() => {});
  let n = 0;
  for (const pal of PALS) for (const l of ['en', 'he']) {
    await win.evaluate(([x, p]) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, palette: p }), [l, pal]);
    const ok = await win.waitForSelector('[data-testid=busy]', { timeout: 5000 }).then(() => true).catch(() => false);
    if (!ok) { console.log('busy toast gone before', pal, l); continue; }
    await win.waitForTimeout(250); await win.screenshot({ path: path.join(out, `busy_${pal}_${l}.png`) }); console.log('shot', pal, l); n++;
  }
  await app.evaluate(() => process.exit(0)).catch(() => {}); console.log('BUSYDONE', n);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
