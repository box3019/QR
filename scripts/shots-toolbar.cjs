// Top bar checks + shots (SYNTHETIC only): equal button widths, File menu, status bar, unsaved dot. Usage: node scripts/shots-toolbar.cjs <QR.exe> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const LOG = path.join(out, 'toolbar_log.txt'); const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok   ' : 'FAIL ', m); if (!c) bad++; };
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  await size(1280, 800); await win.waitForTimeout(900);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const setL = async (l) => { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, textSize: 'normal', palette: 'industrial-steel' }), l); await win.waitForTimeout(400); };
  const shot = (n) => win.screenshot({ path: path.join(out, n + '.png') });
  const widths = () => win.evaluate(() => [...document.querySelectorAll('.qr-topbar .mrt-topbar-cmd')].map((b) => Math.round(b.getBoundingClientRect().width)));
  const doc = (pn) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO PART ${pn}</p><p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li></ol></body></html>`;
  const files = []; for (let i = 1; i <= 2; i++) { const pn = '9800-000' + i; const f = path.join(out, `SYN_${pn}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4' }); w.destroy(); return b.toString('base64'); }, doc(pn)); fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f); }
  for (const l of ['en', 'he']) {
    await setL(l); await win.evaluate(() => window.__qrStep(1)); await win.waitForTimeout(400);
    let w = await widths(); ok(new Set(w).size === 1, `${l}: all toolbar buttons have the same width (${w})`);
    ok((await win.$$('.qr-topbar [data-testid=saved-at]')).length === 0 && (await win.$$('.qr-topbar .qr-saved')).length === 0, `${l}: no loose Saved text in the toolbar`);
    ok(!(await win.$('.qr-topbar [data-testid=btn-save]')), `${l}: Save is not a toolbar button (it is in File)`);
    await win.click('[data-testid=btn-file]'); await win.waitForSelector('[data-testid=file-menu]'); await shot(`tb_${l}_menu_empty`);
    const st = await win.evaluate(() => ['btn-save', 'btn-save-as', 'btn-open-project'].map((id) => { const e = document.querySelector('[data-testid=' + id + ']'); return { id, dis: e.disabled, title: e.title }; }));
    ok(st[0].dis && st[1].dis && !st[2].dis && st.every((s) => s.title.length > 10), `${l}: empty: Save/Save as disabled with a reason, Open enabled ${JSON.stringify(st.map((s) => s.title))}`);
    await win.keyboard.press('Escape'); await win.waitForTimeout(200); ok(!(await win.$('[data-testid=file-menu]')), `${l}: Esc closes the menu`);
    ok((await win.$$('[data-testid=saved-at]')).length === 0, `${l}: empty: status bar shows no Saved text`);
  }
  await setL('en'); await win.evaluate((p) => { window.__qrRun(p); }, files);
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= 2, null, { timeout: 180000 });
  let sawDot = false; for (let i = 0; i < 20 && !sawDot; i++) { sawDot = !!(await win.$('[data-testid=tab-unsaved]')); if (!sawDot) await win.waitForTimeout(50); }
  await win.waitForSelector('[data-testid=saved-at]', { timeout: 15000 }); await win.waitForTimeout(800);
  ok(!(await win.$('[data-testid=tab-unsaved]')), 'unsaved dot is gone once saved (dot was seen while saving: ' + sawDot + ')');
  const txt = await win.evaluate(() => document.querySelector('[data-testid=status-bar]').textContent); ok(/\d\d:\d\d/.test(txt), 'status bar: ' + txt);
  const pos = await win.evaluate(() => { const b = document.querySelector('[data-testid=status-bar]').getBoundingClientRect(); return [Math.round(b.bottom), innerHeight, Math.round(b.height)]; }); ok(pos[0] === pos[1] && pos[2] < 40, 'status bar is slim and at the bottom ' + pos);
  for (const l of ['en', 'he']) { await setL(l); await win.waitForTimeout(300); await shot(`tb_${l}_saved`); await win.click('[data-testid=btn-file]'); await win.waitForSelector('[data-testid=file-menu]');
    const st = await win.evaluate(() => ['btn-save', 'btn-save-as'].map((id) => { const e = document.querySelector('[data-testid=' + id + ']'); return e.disabled; })); ok(st.every((x) => !x), `${l}: loaded: Save and Save as enabled`);
    const ft = await win.evaluate(() => document.querySelector('[data-testid=btn-file]').title); ok(/\d\d:\d\d/.test(ft), `${l}: File tooltip carries the save time (${ft})`); await shot(`tb_${l}_menu_loaded`); await win.keyboard.press('Escape'); }
  await app.close().catch(() => {}); console.log(bad ? `FAILED ${bad}` : 'ALL OK'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(2); });
