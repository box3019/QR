// Delivery shots on SYNTHETIC demo drawings only (never customer files): quote-stage views vs the "For route card" section.
// Usage: node scripts/shots-delivery.cjs <QR.exe|electron.exe> <outDir> <label> [appDir]   (run once on the old build = before, once on the new = after)
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out, label, appDir] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true }); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pre = (n) => path.join(out, `${label}_${n}.png`);
const doc = (pn, extra) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO BRACKET ${pn}</p><p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li>${extra}</ol></body></html>`;
const EXTRA = [
  '<li>MATERIAL PER GEN_1111-1</li><li>HARD ANODIZE PER PS-111.21</li><li>MATERIAL CERTIFICATION AND MILL TEST REPORT REQUIRED</li><li>FAI PER AS9102 REQUIRED WITH FIRST SHIPMENT</li><li>C OF C WITH EACH SHIPMENT</li><li>LOT TRACEABILITY REQUIRED</li>',
  '<li>MATERIAL PER GEN_1111-1</li><li>INSPECTION REPORT REQUIRED</li><li>C OF C WITH EACH SHIPMENT</li>',
  '', '<li>O-RING AS568-012, FKM</li><li>PLATING CERTIFICATE REQUIRED</li>'];
(async () => {
  const prof = path.join(out, label + '_profile'); fs.rmSync(prof, { recursive: true, force: true }); fs.mkdirSync(prof, { recursive: true });
  // a stored setting as many users have it: UI English, hints once copied as Hebrew, never picked
  fs.writeFileSync(path.join(prof, 'qr-settings.json'), JSON.stringify({ uiLanguage: 'en', assistantLanguage: 'he', firstRunDone: true, textSize: 'normal', palette: 'industrial-steel' }));
  const app = await _electron.launch({ executablePath: exe, args: appDir ? [appDir] : [], env: { ...process.env, QR_PROFILE_DIR: prof } });
  const win = await app.firstWindow(); const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  await win.waitForTimeout(2500); await size(1280, 800); await win.waitForTimeout(1200);
  if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const files = []; for (let i = 0; i < EXTRA.length; i++) { const pn = '9700-000' + (i + 1); const f = path.join(out, `SYN_${pn}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4' }); w.destroy(); return b.toString('base64'); }, doc(pn, EXTRA[i])); fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f); }
  const facts = { label, shots: [] }; let shotProv = false;
  await win.evaluate((f) => { window.__qrRun(f); }, files);
  for (let i = 0; i < 400; i++) { const st = await win.evaluate(() => ({ busy: !!document.querySelector('[data-testid=busy]'), n: (window.__qrParts || []).length, prov: !!document.querySelector('[data-testid=provisional]') })).catch(() => null); if (st && st.busy && st.n > 0 && !shotProv) { await win.evaluate(() => window.__qrStep && window.__qrStep(3)); await sleep(150); await win.screenshot({ path: pre('1_during_analysis_step3') }); facts.provisionalBanner = await win.evaluate(() => { const b = document.querySelector('[data-testid=provisional]'); return b ? b.textContent : null; }); shotProv = true; }
    if (st && !st.busy && st.n >= files.length) break; await sleep(100); }
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= 4, null, { timeout: 180000 }); await sleep(800);
  const dump = () => win.evaluate(() => { const txt = (s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, ' ').trim()); return { tiles: txt('.qr-tile'), statusBadges: txt('[data-testid^=plain-status],.qr-pstatus'), bubble: txt('[data-testid=assistant-bubble]'), routeCardSections: document.querySelectorAll('[data-testid=route-card],[data-testid=route-card-summary]').length, uploadsList: txt('[data-testid=uploads] li,[data-testid^=upload-]').slice(0, 20), readinessChips: document.querySelectorAll('[data-testid*=readiness],.qr-ready-chip').length }; });
  for (const s of [1, 3, 4]) { await win.evaluate((n) => window.__qrStep(n), s); await sleep(600); await win.screenshot({ path: pre(`2_step${s}`) }); facts.shots.push({ step: s, ...(await dump()) }); }
  await win.evaluate(() => { window.__qrStep(3); window.__qrDetails && window.__qrDetails(false); window.__qrSelect(0, 'drawing'); }); await sleep(900); await win.screenshot({ path: pre('3_part_card_collapsed') });
  const rc = await win.$('[data-testid=route-card]'); if (rc) { await rc.scrollIntoViewIfNeeded().catch(() => {}); await win.click('[data-testid=route-card] > summary'); await sleep(400); await rc.scrollIntoViewIfNeeded().catch(() => {}); await win.screenshot({ path: pre('4_part_card_route_card_open') }); facts.routeCardText = (await rc.textContent()).replace(/\s+/g, ' ').trim(); }
  // the summary step with the collapsed route-card block
  await win.evaluate(() => window.__qrStep(4)); await sleep(500); const sm = await win.$('[data-testid=route-card-summary] > summary'); if (sm) { await sm.click(); await sleep(300); } await win.screenshot({ path: pre('5_summary') });
  facts.parts = await win.evaluate(() => (window.__qrParts || []).map((p) => ({ partNo: p.partNo, tasksUpload: (p.tasks || []).filter((t) => t.type === 'uploadDocument').map((t) => (t.refNumber || t.std || '') + ':' + (t.stage || '-') + ':' + t.status), routeCard: p.routeCard ? p.routeCard.count : null, blockedSteps: (p.route || []).filter((s) => s.blocked).map((s) => s.seq + ' ' + s.type) })));
  fs.writeFileSync(path.join(out, `${label}_facts.json`), JSON.stringify(facts, null, 1)); console.log(JSON.stringify(facts.parts)); await app.close().catch(() => {}); process.exit(0);
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(2); });
