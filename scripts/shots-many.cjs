// 24 SYNTHETIC drawings: the busy toast ("Reading drawing i of 24"), Check parts / Docs with a long list in HE + EN at 1920 and 1280,
// plus the drawing viewer geometry (centred, whole sheet visible) and an overflow check. No customer data.
// Usage: node scripts/shots-many.cjs <QR.exe> <outDir>   (env QR_THEMES, QR_N)
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const PALS = (process.env.QR_THEMES || 'aris-glass,graphite').split(','); const N = +(process.env.QR_N || 24);
const doc = (pn) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO PART ${pn}</p><p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li><li>O-RING AS568-012, FKM</li><li>M6x1-6H THRU</li></ol></body></html>`;
const bad = []; const log = (...a) => console.log(...a);
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  await size(1920, 1080);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  await win.evaluate(() => window.__qrSetSettings({ textSize: 'normal', accent: 'slate', uiLanguage: 'en', assistantLanguage: 'en', palette: 'aris-glass' }));
  const files = [];
  for (let i = 1; i <= N; i++) {
    const f = path.join(out, `SYN_9800-${String(i).padStart(4, '0')}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4' }); w.destroy(); return b.toString('base64'); }, doc('9800-' + String(i).padStart(4, '0')));
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f);
  }
  // 1) busy toast: start the run, poll the DOM
  await win.evaluate((p) => { window.__qrRun(p); }, files);
  let seen = 0;
  for (let k = 0; k < 120 && !seen; k++) { await win.waitForTimeout(150); const s = await win.evaluate(() => ({ busy: !!document.querySelector('[data-testid=busy]'), imp: !!document.querySelector('.qr-import'), parts: (window.__qrParts || []).length })); if (k % 8 === 0) log('poll', k, JSON.stringify(s)); if (s.busy) seen = 1; else if (s.parts) break; }
  log('busy seen on step 1?', seen);
  await win.evaluate(() => window.__qrStep(2)).catch(() => {});
  for (const pal of PALS) for (const l of ['en', 'he']) {
    await win.evaluate(([x, p]) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, palette: p }), [l, pal]);
    if (await win.$('[data-testid=busy]')) { await win.waitForTimeout(200); await win.screenshot({ path: path.join(out, `busy_${pal}_${l}.png`) }); log('busy shot', pal, l); }
  }
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= 1, null, { timeout: 120000 });
  // 2) Check parts / Docs, viewer geometry, overflow
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    await size(w, h); await win.waitForTimeout(500);
    for (const pal of PALS) for (const l of ['en', 'he']) {
      await win.evaluate(([x, p]) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, palette: p }), [l, pal]);
      for (const [step, nm] of [[2, '2parts'], [3, '3docs']]) {
        await win.evaluate((s) => window.__qrStep(s), step); await win.waitForTimeout(900);
        await win.screenshot({ path: path.join(out, `many_${pal}_${w}_${l}_${nm}.png`) });
        const g = await win.evaluate(() => {
          const W = document.documentElement.clientWidth; const over = [...document.querySelectorAll('.qr-root *')].filter((e) => { const r = e.getBoundingClientRect(); if (!r.width) return false; let p = e.parentElement; while (p) { const o = getComputedStyle(p).overflow + getComputedStyle(p).overflowX; if (/hidden|auto|scroll/.test(o) && p.classList.contains('qr-root') === false && p.getBoundingClientRect().right <= W + 1 && r.left >= p.getBoundingClientRect().left - 1 && r.right <= p.getBoundingClientRect().right + 1) return false; p = p.parentElement; } return r.right > W + 1 || r.left < -1; }).slice(0, 5).map((e) => e.className + '|' + e.tagName);
          const vp = document.querySelector('.qr-draw-vp'); const sh = document.querySelector('[data-testid=drawing-sheet]');
          let geo = null; if (vp && sh) { const a = vp.getBoundingClientRect(), b = sh.getBoundingClientRect(); geo = { vp: [a.left, a.top, a.width, a.height].map(Math.round), sh: [b.left, b.top, b.width, b.height].map(Math.round), dx: Math.round((b.left + b.width / 2) - (a.left + a.width / 2)), dy: Math.round((b.top + b.height / 2) - (a.top + a.height / 2)), whole: b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1 }; }
          return { over, geo, docW: document.documentElement.scrollWidth, W };
        });
        log(pal, w, l, nm, JSON.stringify(g));
        if (g.over.length || g.docW > g.W + 1) bad.push(['overflow', pal, w, l, nm, g.over]);
        if (step === 2 && (!g.geo || !g.geo.whole || Math.abs(g.geo.dx) > 2 || Math.abs(g.geo.dy) > 2)) bad.push(['viewer-not-centred', pal, w, l, JSON.stringify(g.geo)]);
      }
    }
  }
  fs.writeFileSync(path.join(out, 'many_result.json'), JSON.stringify(bad, null, 1)); log('PROBLEMS', bad.length, JSON.stringify(bad));
  await app.evaluate(() => process.exit(0)).catch(() => {}); log('MANYDONE');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
