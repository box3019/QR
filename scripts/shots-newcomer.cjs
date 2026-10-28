// Newcomer audit shots + checks (SYNTHETIC drawings only, no customer data): per step, EN and HE: the next-step line, one primary button,
// every disabled button explains why, Cancel + Undo. Usage: node scripts/shots-newcomer.cjs <QR.exe> <outDir>   (QR_APP=<app dir> for dev)
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const LOG = path.join(out, 'newcomer_log.txt'); const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok   ' : 'FAIL ', m); if (!c) bad++; };
const doc = (pn, extra) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO PART ${pn}</p><p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li>${extra || ''}</ol></body></html>`;
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  const size = () => app.evaluate(({ BrowserWindow }) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: 1280, height: 800 }); });
  await size(); await win.waitForTimeout(900);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const setL = async (l) => { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, textSize: 'normal', palette: 'industrial-steel' }), l); await win.waitForTimeout(400); };
  const shot = (n) => win.screenshot({ path: path.join(out, n + '.png') });
  const state = () => win.evaluate(() => {
    const vis = (e) => !!e.offsetParent; const root = document.querySelector('[data-testid=project]:not(.qr-proj-off)') || document;
    const prim = [...document.querySelectorAll('.mrt-btn-primary')].filter(vis).map((b) => b.getAttribute('data-testid') || b.textContent.trim());
    const dis = [...document.querySelectorAll('button:disabled')].filter(vis).map((b) => ({ id: b.getAttribute('data-testid') || b.textContent.trim(), title: b.title || '' }));
    const nx = document.querySelector('[data-testid=next-step]');
    return { prim, dis, next: nx ? nx.textContent.trim() : null, key: nx ? nx.getAttribute('data-key') : null };
  });
  const files = [];
  for (let i = 1; i <= 6; i++) { const pn = '9700-000' + i; const f = path.join(out, `SYN_${pn}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4' }); w.destroy(); return b.toString('base64'); }, doc(pn, i % 2 ? '<li>O-RING AS568-012, FKM</li>' : ''));
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f); }
  for (const l of ['en', 'he']) {
    await setL(l); await win.evaluate(() => window.__qrStep(1)); await win.waitForTimeout(300);
    let s = await state(); console.log(l, 'step1 empty', JSON.stringify(s)); await shot(`nc_${l}_1_empty`);
    if (l === 'en') ok(s.key === 'ns.load', 'empty screen has the Start here line'); else ok(true, 'he: parts from the EN pass are still loaded, so no empty-screen check'); ok(s.dis.every((d) => d.title.length > 12), l + ': empty: every disabled button explains why ' + JSON.stringify(s.dis));
    if (l === 'en') { await win.evaluate((p) => { window.__qrRun(p); }, files); await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= 6, null, { timeout: 180000 }); }
    for (const st of [1, 2, 3, 4]) { await win.evaluate((x) => window.__qrStep(x), st); await win.waitForTimeout(700); s = await state(); console.log(l, 'step' + st, JSON.stringify({ prim: s.prim, next: s.next, key: s.key, dis: s.dis })); await shot(`nc_${l}_${st}`);
      ok(s.prim.length === 1, `${l} step ${st}: exactly one primary button (${s.prim.join('|')})`); ok(!!s.next, `${l} step ${st}: next-step line present (${s.next})`); ok(s.dis.every((d) => d.title.length > 12), `${l} step ${st}: disabled buttons explain why`); }
    // the line is clickable and goes to the named part
    await win.evaluate(() => window.__qrStep(2)); await win.waitForTimeout(300); const before = await win.evaluate(() => document.querySelector('[data-testid=project]:not(.qr-proj-off)').getAttribute('data-step'));
    if (await win.$('[data-testid=next-step]')) { await win.click('[data-testid=next-step]'); await win.waitForTimeout(500); const after = await win.evaluate(() => document.querySelector('[data-testid=project]:not(.qr-proj-off)').getAttribute('data-step')); ok(after !== before || before === '4', `${l}: clicking the next-step line moves on (${before} -> ${after})`); await shot(`nc_${l}_after_click`); }
  }
  // Cancel clears with Undo; nothing is lost
  await setL('en'); await win.evaluate(() => window.__qrStep(2)); await win.waitForTimeout(300);
  const n0 = await win.evaluate(() => window.__qrParts.length);
  await win.click('[data-testid=btn-cancel]'); await win.waitForTimeout(600); await shot('nc_en_cancel_undo');
  ok(!!(await win.$('[data-testid=notice-action]')), 'Cancel shows an Undo toast'); ok((await win.evaluate(() => window.__qrParts.length)) === 0, 'Cancel cleared the project');
  await win.click('[data-testid=notice-action]'); await win.waitForTimeout(700);
  ok((await win.evaluate(() => window.__qrParts.length)) === n0, `Undo restored all ${n0} parts`);
  await app.close().catch(() => {}); console.log(bad ? `FAILED ${bad}` : 'ALL OK'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(2); });
