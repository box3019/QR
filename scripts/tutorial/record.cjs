// Record the tutorial video from the REAL QR UI (unpacked build, own profile dir) on SYNTHETIC demo parts only.
// Usage: node scripts/tutorial/record.cjs <lang> <QR.exe> <outDir>   (needs <outDir>/durations.json from make-audio.cjs)
// Frames: the main process grabs webContents.capturePage() in a loop (JPEG named by epoch ms in <outDir>/frames), because Playwright's recordVideo stalls on an off-screen window. Writes timeline.json (step start/end in ms since the video start) and debug shots.
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [lang, exe, out] = process.argv.slice(2); const S = require('./' + lang + '.cjs'); const DUR = JSON.parse(fs.readFileSync(path.join(out, 'durations.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true }); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const doc = (pn, extra) => `<html><body style="font:14px Arial;padding:40px"><h2>PART NO ${pn} REV A</h2><p>TITLE: DEMO PART ${pn}</p><p>NOTES:</p><ol><li>MATERIAL: ALUMINUM 6061-T6 BAR PER AMS-QQ-A-250/11</li><li>PORT PER AS5202-03 .4375-20 UNF-2B, 2 PLACES</li><li>ANODIZE PER MIL-A-8625 TYPE II CLASS 1 BLACK</li>${extra || ''}</ol></body></html>`;
const OV_CSS = `#qrv{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:'Segoe UI',system-ui,sans-serif}
#qrv .ring{position:fixed;border:4px solid #0b5cad;border-radius:8px;box-shadow:0 0 0 3px #fff,0 0 18px 4px rgba(11,92,173,.55);transition:all .45s ease;opacity:0}
#qrv .arrow{position:fixed;width:46px;height:56px;transition:all .45s ease;opacity:0;filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 3px #fff)}
#qrv .badge{position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#0f2a4a;color:#fff;border-radius:6px;padding:6px 18px;font-size:22px;font-weight:700;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.35);opacity:0;transition:opacity .4s}
#qrv .badge small{font-size:16px;font-weight:400;margin-inline-start:12px;opacity:.92}
#qrv .cur{position:fixed;width:26px;height:26px;transition:left .7s ease,top .7s ease;left:600px;top:400px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
#qrv .rip{position:fixed;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #0b5cad;opacity:0}
@keyframes rip{from{transform:scale(.4);opacity:.9}to{transform:scale(3.2);opacity:0}}`;
(async () => {
  const app = await _electron.launch({ executablePath: exe, env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const tLaunch = Date.now(); const win = await app.firstWindow();
  const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); }, [w, h]);
  await win.waitForTimeout(2500); await app.evaluate(({ BrowserWindow }) => { const b = BrowserWindow.getAllWindows()[0]; b.setFullScreen(false); b.setMinimumSize(800, 600); }); await size(1280, 800); await win.waitForTimeout(1500);
  const vp = await win.evaluate(() => [innerWidth, innerHeight]); if (vp[0] !== 1280) throw new Error('viewport ' + vp);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, textSize: 'normal', palette: 'industrial-steel', assistantOn: false }), lang); await win.waitForTimeout(600);
  const files = [];
  for (let i = 1; i <= 3; i++) { const pn = '9700-000' + i; const f = path.join(out, `SYN_${pn}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4' }); w.destroy(); return b.toString('base64'); }, doc(pn, i % 2 ? '<li>O-RING AS568-012, FKM</li>' : ''));
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f); }
  await win.evaluate(({ css }) => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); const d = document.createElement('div'); d.id = 'qrv';
    d.innerHTML = '<div class="ring"></div><svg class="arrow" viewBox="0 0 46 56"><path d="M23 2 L44 26 L31 26 L31 54 L15 54 L15 26 L2 26 Z" fill="#0b5cad" stroke="#fff" stroke-width="2.5"/></svg><div class="badge"></div><svg class="cur" viewBox="0 0 24 24"><path d="M3 2 L3 20 L8 15.5 L11.5 22 L14.5 20.5 L11 14 L18 14 Z" fill="#111" stroke="#fff" stroke-width="1.6"/></svg><div class="rip"></div>'; document.body.appendChild(d); }, { css: OV_CSS });
  const rectOf = (sel) => win.evaluate((s) => { const [css, nth] = s.split('@@'); const els = [...document.querySelectorAll(css)].filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden'); const e = els[+(nth || 0)]; if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, sel);
  // sel: css, optionally '@@n' for the n-th visible match
  const ring = async (sel, pad = 6) => { const r = await rectOf(sel); if (!r) { console.log('MISSING', sel); return null; }
    await win.evaluate(({ r, pad }) => { const q = (c) => document.querySelector('#qrv ' + c); const g = q('.ring'); g.style.cssText += `;opacity:1;left:${r.x - pad}px;top:${r.y - pad}px;width:${r.w + 2 * pad}px;height:${r.h + 2 * pad}px`;
      const a = q('.arrow'); const below = r.y + r.h + pad + 62 < innerHeight; a.style.cssText += `;opacity:1;left:${Math.min(innerWidth - 50, Math.max(4, r.x + r.w / 2 - 23))}px;top:${below ? r.y + r.h + pad + 4 : Math.max(60, r.y - pad - 60)}px;transform:${below ? 'none' : 'rotate(180deg)'}`; }, { r, pad }); await sleep(600); return r; };
  const clear = () => win.evaluate(() => { document.querySelector('#qrv .ring').style.opacity = 0; document.querySelector('#qrv .arrow').style.opacity = 0; });
  const moveClick = async (sel, doClick = true) => { const r = await ring(sel); if (!r) return false; const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    await win.evaluate(({ cx, cy }) => { const c = document.querySelector('#qrv .cur'); c.style.left = cx - 4 + 'px'; c.style.top = cy - 3 + 'px'; }, { cx, cy }); await sleep(900);
    if (doClick) { await win.evaluate(({ cx, cy }) => { const p = document.querySelector('#qrv .rip'); p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.animation = 'none'; void p.offsetWidth; p.style.animation = 'rip .6s ease-out'; }, { cx, cy });
      const [css, nth] = sel.split('@@'); await win.locator(css).filter({ visible: true }).nth(+(nth || 0)).click({ timeout: 8000 }); await sleep(600); } return true; };
  const framesDir = path.join(out, 'frames'); fs.rmSync(framesDir, { recursive: true, force: true }); fs.mkdirSync(framesDir, { recursive: true });
  const startCap = () => app.evaluate(({ BrowserWindow }, dir) => { const fs = process.getBuiltinModule('fs'); const wc = BrowserWindow.getAllWindows()[0].webContents; globalThis.__cap = { run: true, n: 0 }; (async () => { while (globalThis.__cap.run) { const im = await wc.capturePage(); fs.writeFileSync(dir + '/' + Date.now() + '.jpg', im.toJPEG(88)); globalThis.__cap.n++; } })(); }, framesDir);
  const stopCap = () => app.evaluate(() => { globalThis.__cap.run = false; return globalThis.__cap.n; });
  const timeline = []; const shot = (n) => win.screenshot({ path: path.join(out, 'dbg_' + n + '.png') });
  const begin = async (i) => { const st = S.steps[i - 1]; const label = i === 1 || true ? '' : ''; const t = Date.now(); timeline.push({ n: i, id: st.id, title: st.title, t0: t, dur: DUR[i] });
    await win.evaluate(({ n, title, word }) => { const b = document.querySelector('#qrv .badge'); b.innerHTML = `${word} ${n}<small>${title}</small>`; b.style.opacity = 1; }, { n: i, title: st.title, word: S.stepWord }); await clear(); await sleep(500); return t; };
  const finish = async (i, t) => { const wait = t + DUR[i] * 1000 + 1200 - Date.now(); if (wait > 0) await sleep(wait); await clear(); await shot(i); timeline[i - 1].t1 = Date.now(); };
  const STEP = '[data-testid=stepbar] .mrt-wizard-step-item'; const parts = () => win.evaluate(() => (window.__qrParts || []).length);
  await win.evaluate(() => { document.querySelector('#qrv .badge').style.opacity = 0; }); await startCap(); const tStart = Date.now(); await sleep(800);
  // 1 new project + intake
  let t = await begin(1); await sleep(1500); await ring('[data-testid=tab-add]'); await sleep(2500); await clear();
  const choose = (await rectOf('[data-testid=btn-choose-files]')) ? '[data-testid=btn-choose-files]' : '[data-testid=dropzone]'; await moveClick(choose, false); await sleep(2500);
  await win.evaluate((p) => { window.__qrRun(p); }, files); await clear(); await sleep(2500); await shot('1b');
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= 3, null, { timeout: 240000 }); await finish(1, t);
  // 2 what loaded
  t = await begin(2); await sleep(800); await win.evaluate(() => window.__qrStep && window.__qrStep(1)).catch(() => {}); await sleep(900);
  await ring('[data-testid=rail-context]'); await sleep(4200); if (await rectOf('[data-testid=loaded-summary]')) { await ring('[data-testid=loaded-summary]'); await sleep(3500); } else if (await rectOf('[data-testid=import-view]')) { await ring('[data-testid=import-view]'); await sleep(3000); } await finish(2, t);
  // 3 check parts list
  t = await begin(3); await sleep(500); await moveClick(STEP + '@@1'); await sleep(1500); await ring('[data-testid=tiles]'); await sleep(3500); await ring('[data-testid=parts-rows]'); await sleep(3500); await finish(3, t);
  // 4 open a part
  t = await begin(4); await sleep(500); await moveClick('[data-testid=part-item]@@0'); await win.waitForSelector('[data-testid=breakdown-panel]', { timeout: 30000 }); await sleep(900);
  await ring('[data-testid=drawing-viewport]'); await sleep(3500); await ring('[data-testid=breakdown-panel]'); await sleep(3000); await finish(4, t);
  // 5 blocks and statuses
  t = await begin(5); await sleep(500); await ring('[data-testid=block]@@0'); await sleep(4500); await ring('[data-testid=blocks]'); await sleep(3000);
  await moveClick('[data-testid=btn-next-part]'); await sleep(1200); await ring('[data-testid=card-pn]'); await sleep(1500); await finish(5, t);
  // 6 documents and questions
  t = await begin(6); await sleep(500); await moveClick(STEP + '@@2'); await sleep(1200); if (await rectOf('[data-testid=part-item]@@0')) { await moveClick('[data-testid=part-item]@@0'); await win.waitForSelector('[data-testid=problems-panel]', { timeout: 30000 }).catch(() => {}); await sleep(900); }
  await ring('[data-testid=problems-panel]'); await sleep(4500); await ring('[data-testid=problem]@@0'); await sleep(2500); await finish(6, t);
  // 7 verdict + summary
  t = await begin(7); await sleep(500); if (await rectOf('[data-testid=btn-back-list]')) await moveClick('[data-testid=btn-back-list]'); await sleep(800); await moveClick(STEP + '@@3'); await sleep(1500);
  await ring('[data-testid=summary-step]'); await sleep(4200); if (await rectOf('[data-testid=sum-totals]')) { await ring('[data-testid=sum-totals]'); await sleep(3000); } await finish(7, t);
  // 8 save
  t = await begin(8); await sleep(500); await moveClick('[data-testid=btn-file]'); await sleep(900); await moveClick('[data-testid=btn-save]'); await sleep(1500);
  await ring('[data-testid=status-bar]'); await sleep(2500); await finish(8, t);
  const tEnd = Date.now(); await sleep(1500); const nFrames = await stopCap(); console.log('frames', nFrames);
  await app.close(); const tClose = Date.now();
  fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify({ tLaunch, tStart, tEnd, tClose, steps: timeline }, null, 1)); console.log('RECORDED', JSON.stringify(timeline.map((x) => [x.n, ((x.t1 - x.t0) / 1000).toFixed(1)])));
  process.exit(0);
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(2); });
