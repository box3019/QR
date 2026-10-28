// One-focus Check parts shots + checks (SYNTHETIC drawings only): list view, part view, arrows, Back, Documents & questions, EN/HE at 1280 and 1920.
// Usage: node scripts/shots-onefocus.cjs <QR.exe> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const LOG = path.join(out, 'onefocus_log.txt'); const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok   ' : 'FAIL ', m); if (!c) bad++; };
const doc = (pn, extra) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO PART ${pn}</p><p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li>${extra || ''}</ol></body></html>`;
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  await size(1280, 800); await win.waitForTimeout(900);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const setL = async (l) => { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, textSize: 'normal', palette: 'industrial-steel' }), l); await win.waitForTimeout(400); };
  const shot = (n) => win.screenshot({ path: path.join(out, n + '.png') });
  const q = (sel) => win.evaluate((s) => document.querySelectorAll(s).length, sel);
  const files = [];
  for (let i = 1; i <= 6; i++) { const pn = '9700-000' + i; const f = path.join(out, `SYN_${pn}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4' }); w.destroy(); return b.toString('base64'); }, doc(pn, i % 2 ? '<li>O-RING AS568-012, FKM</li>' : ''));
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f); }
  await setL('en'); await win.evaluate((p) => { window.__qrRun(p); }, files);
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= 6, null, { timeout: 180000 });
  const overflow = () => win.evaluate(() => { const d = document.scrollingElement; return d.scrollWidth - d.clientWidth; });
  for (const [w, h] of [[1280, 800], [1920, 1080]]) for (const l of ['en', 'he']) {
    const tag = `${w}_${l}`; await size(w, h); await setL(l); await win.waitForTimeout(500);
    await win.evaluate(() => window.__qrStep(2)); await win.waitForTimeout(700);
    const rows = await q('[data-testid=part-item]'); ok(rows === 6, `${tag} list: one row per part (${rows})`);
    ok((await q('[data-testid=breakdown-panel]')) === 0 && (await q('[data-testid=tab-drawing]')) === 0, `${tag} list: no drawing / card column beside the list`);
    ok((await q('[data-testid=tiles]')) === 1 && (await q('[data-testid=next-step]')) === 1, `${tag} list: tiles on top and the next-step line`);
    const why = await win.evaluate(() => [...document.querySelectorAll('[data-testid=part-reason]')].map((e) => e.textContent.trim())); ok(why.length === 6 && why.every((x) => x.length > 3), `${tag} list: one-line reason per row (${why[0]})`);
    ok((await win.evaluate(() => document.querySelectorAll('.mrt-btn-primary').length)) === 1, `${tag} list: one primary button`);
    ok((await overflow()) <= 1, `${tag} list: no horizontal overflow (${await overflow()})`); await shot(`of_${tag}_2_list`);
    await win.click('[data-testid=part-item] >> nth=0'); await win.waitForSelector('[data-testid=breakdown-panel]', { timeout: 20000 }); await win.waitForTimeout(700);
    ok((await q('[data-testid=part-item]')) === 0, `${tag} part: the list is not shown beside the part`);
    const cols = await win.evaluate(() => { const c = document.querySelector('.qr-pview-cols'); const k = [...c.children].map((e) => e.getBoundingClientRect().width); return k; });
    ok(cols.length === 2 && cols[0] > cols[1] * 1.2, `${tag} part: two columns, drawing larger than the blocks (${cols.map(Math.round)})`);
    ok((await q('[data-testid=block]')) > 0 && (await q('[data-testid=btn-back-list]')) === 1, `${tag} part: blocks and Back to list`);
    ok((await win.evaluate(() => document.querySelectorAll('.mrt-btn-primary').length)) === 1, `${tag} part: one primary button`);
    ok((await overflow()) <= 1, `${tag} part: no horizontal overflow (${await overflow()})`); await shot(`of_${tag}_2_part`);
    const pn0 = await win.evaluate(() => document.querySelector('[data-testid=card-pn]').textContent);
    await win.keyboard.press(l === 'he' ? 'ArrowLeft' : 'ArrowRight'); await win.waitForTimeout(500);
    const pn1 = await win.evaluate(() => document.querySelector('[data-testid=card-pn]').textContent); ok(pn1 !== pn0, `${tag} arrows: forward arrow opens the next part (${pn0} -> ${pn1})`);
    await win.keyboard.press(l === 'he' ? 'ArrowRight' : 'ArrowLeft'); await win.waitForTimeout(500);
    ok((await win.evaluate(() => document.querySelector('[data-testid=card-pn]').textContent)) === pn0, `${tag} arrows: back arrow returns`);
    await win.keyboard.press('Escape'); await win.waitForTimeout(400); ok((await q('[data-testid=part-item]')) === 6, `${tag} Esc / Back returns to the list`);
    await win.click('[data-testid=part-item] >> nth=0'); await win.waitForSelector('[data-testid=btn-back-list]'); await win.click('[data-testid=btn-back-list]'); await win.waitForTimeout(300); ok((await q('[data-testid=part-item]')) === 6, `${tag} Back button returns to the list`);
    await win.evaluate(() => window.__qrStep(3)); await win.waitForTimeout(600);
    ok((await q('[data-testid=part-item]')) === 6 && (await q('[data-testid=problems-panel]')) === 0, `${tag} step 3 list: rows, no side panel`); await shot(`of_${tag}_3_list`);
    await win.click('[data-testid=part-item] >> nth=0'); await win.waitForSelector('[data-testid=problems-panel]', { timeout: 20000 }); await win.waitForTimeout(500);
    ok((await q('[data-testid=part-item]')) === 0 && (await overflow()) <= 1, `${tag} step 3 part: full-width documents & questions, no overflow`); await shot(`of_${tag}_3_part`);
  }
  await app.close().catch(() => {}); console.log(bad ? `FAILED ${bad}` : 'ALL OK'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(2); });
