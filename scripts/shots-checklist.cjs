// Checklist shots on SYNTHETIC demo drawings only (never customer files).
// Usage: node scripts/shots-checklist.cjs <QR.exe|electron.exe> <outDir> <label> [appDir]
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out, label, appDir] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true }); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pre = (n) => path.join(out, `${label}_${n}.png`);
const { DOCS } = require('./syn-docs.cjs');
(async () => {
  const prof = path.join(out, label + '_profile'); fs.rmSync(prof, { recursive: true, force: true }); fs.mkdirSync(prof, { recursive: true });
  fs.writeFileSync(path.join(prof, 'qr-settings.json'), JSON.stringify({ uiLanguage: 'en', firstRunDone: true, textSize: 'normal', palette: 'industrial-steel' }));
  const app = await _electron.launch({ executablePath: exe, args: appDir ? [appDir] : [], env: { ...process.env, QR_PROFILE_DIR: prof } });
  const win = await app.firstWindow(); const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  await win.waitForTimeout(2500); await size(1400, 900); await win.waitForTimeout(1200);
  if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const files = []; for (const d of DOCS) { const f = path.join(out, `SYN_${d.pn}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4', landscape: true, margins: { marginType: 'none' } }); w.destroy(); return b.toString('base64'); }, d.html(d.pn));
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f); }
  await win.evaluate((f) => { window.__qrRun(f); }, files);
  await win.waitForFunction((n) => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= n, files.length, { timeout: 240000 }); await sleep(800);
  const facts = { label, parts: [] };
  const grab = async () => (await win.evaluate(() => (window.__qrParts || []).map((p) => ({ partNo: p.partNo, ck: p.checklist ? Object.fromEntries(Object.entries(p.checklist.rows).map(([k, v]) => [k, v.state + ':' + v.items.length])) : null })))); facts.parts = await grab();
  const shot = async (n) => { await win.screenshot({ path: pre(n) }); };
  await win.evaluate(() => { window.__qrStep(3); window.__qrDetails && window.__qrDetails(false); window.__qrSelect(0, 'drawing'); }); await sleep(1200);
  const ck = await win.$('[data-testid=checklist]'); if (ck) { await ck.scrollIntoViewIfNeeded().catch(() => {}); await sleep(300); }
  await shot('1_part_card_checklist');
  const link = await win.$('[data-testid=ck-row-tight] button'); if (link) { await link.click(); await sleep(1500); await shot('2_click_zoom_drawing'); facts.clicked = true; }
  await win.evaluate(() => window.__qrSelect(1, 'drawing')); await sleep(1200); const ck2 = await win.$('[data-testid=checklist]'); if (ck2) await ck2.scrollIntoViewIfNeeded().catch(() => {}); await shot('3_part_card_estimated_zones');
  await win.evaluate(() => window.__qrStep(4)); await sleep(800); const cs = await win.$('[data-testid=checklist-summary]'); if (cs) await cs.scrollIntoViewIfNeeded().catch(() => {}); await shot('4_summary_table');
  await win.click('[data-testid=btn-settings]'); await sleep(600); await win.click('[data-testid=stab-precision]'); await sleep(500); await shot('5_settings_precision');
  await win.locator('button:has-text("Cancel")').last().click().catch(() => {}); await sleep(500);
  await win.evaluate(() => window.__qrSetSettings && window.__qrSetSettings({ uiLanguage: 'he' })); await sleep(1200);
  
  await win.evaluate(() => { window.__qrStep(3); window.__qrSelect(0, 'drawing'); }); await sleep(1200); const ck3 = await win.$('[data-testid=checklist]'); if (ck3) await ck3.scrollIntoViewIfNeeded().catch(() => {}); await shot('6_part_card_hebrew');
  await win.evaluate(() => window.__qrStep(4)); await sleep(800); const cs2 = await win.$('[data-testid=checklist-summary]'); if (cs2) await cs2.scrollIntoViewIfNeeded().catch(() => {}); await shot('7_summary_hebrew');
  for (const lang of ['en', 'he']) for (const [w, h] of [[1280, 800], [1920, 1080]]) { await win.evaluate((l) => window.__qrSetSettings({ uiLanguage: l }), lang); await size(w, h); await sleep(700); await win.evaluate(() => window.__qrStep(4)); await sleep(800); const cc = await win.$('[data-testid=checklist-summary]'); if (cc) { await cc.scrollIntoViewIfNeeded().catch(() => {}); await sleep(300); await cc.screenshot({ path: pre(`8_summary_table_${lang}_${w}`) }).catch(() => {}); } if (cc) { const ok = await win.evaluate(() => { const b = document.querySelector('[data-testid=cks-expand]'); if (!b) return false; b.click(); return true; }); if (ok) { await size(w, 1500); await sleep(600); await cc.scrollIntoViewIfNeeded().catch(() => {}); await cc.screenshot({ path: pre(`8_summary_expanded_${lang}_${w}`) }).catch(() => {}); await size(w, h); await sleep(400); await win.evaluate(() => { const b = document.querySelector('[data-testid=cks-expand]'); if (b) b.click(); }); await sleep(300); } } await shot(`8_summary_page_${lang}_${w}`); }
  fs.writeFileSync(path.join(out, `${label}_facts.json`), JSON.stringify(facts, null, 1)); console.log(JSON.stringify(facts)); await app.close().catch(() => {}); process.exit(0);
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(2); });
