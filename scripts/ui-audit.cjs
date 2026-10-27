// UI audit on a built app (window offscreen): per step and language, list visible bold text (weight >= 600) and visible
// explanatory sentences outside the assistant bubble. Usage: node scripts/ui-audit.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const scan = () => { const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const bold = [], sent = [];
  for (const e of document.querySelectorAll('body *')) { if (!vis(e)) continue; const tx = own(e); if (!tx) continue;
    if (e.closest('canvas,svg,.qr-viewer,[data-testid=assistant-bubble],[role=dialog],.qr-prob,.qr-card-flags,[data-testid=bd-detail],table')) continue;
    const w = +getComputedStyle(e).fontWeight; const cls = (e.className && e.className.baseVal === undefined ? e.className : '') || e.tagName.toLowerCase();
    const ALLOW = ['qr-brand-badge', 'qr-wiz-title', 'qr-panel-h', 'qr-pgroup-name', 'pn', 'qr-pn', 'qr-box-title', 'qr-bsec-h'];
    if (w >= 600 && !ALLOW.includes(cls.split(' ')[0]) && !(cls.startsWith('mrt-wizard-step-label') && e.closest('[aria-current=step]'))) bold.push(cls.split(' ')[0] + ':' + tx.slice(0, 30));
    if (tx.split(/\s+/).length >= 7 || /[.!?]$/.test(tx) && tx.split(/\s+/).length >= 4) sent.push(cls.split(' ')[0] + ':' + tx.slice(0, 60)); }
  return { bold: [...new Set(bold)], sent: [...new Set(sent)] }; };
(async () => {
  const app = await _electron.launch({ executablePath: exe, env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.setBounds({ x: -30000, y: -30000, width: 1600, height: 1000 }); });
  await win.waitForSelector('[data-testid=dropzone]'); if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]');
  const res = {};
  for (const l of ['en', 'he']) { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x }), l); await win.waitForTimeout(300); res[l + '1'] = await win.evaluate(scan); }
  const files = process.env.QR_AUDIT_FILES ? process.env.QR_AUDIT_FILES.split(';') : [path.join(data, 'KLA_matbug_d.pdf')];
  win.evaluate((p) => window.__qrRun(p), files);
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=breakdown-panel]'), null, { timeout: 15 * 60 * 1000 });
  for (const l of ['en', 'he']) { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x }), l);
    for (const s of [2, 3, 4]) { await win.evaluate((n) => window.__qrStep(n), s); await win.waitForTimeout(500); res[l + s] = await win.evaluate(scan); } }
  await win.evaluate(() => window.__qrStep(2)); const ttl = await win.evaluate(() => { const c = getComputedStyle(document.querySelector('.qr-wiz-title')); return c.fontSize + ' ' + c.fontWeight; });
  fs.writeFileSync(path.join(out, 'ui-audit.json'), JSON.stringify({ title: ttl, res }, null, 1));
  let nb = 0, ns = 0; for (const [k, v] of Object.entries(res)) { nb += v.bold.length; ns += v.sent.length; console.log(k, 'BOLD', v.bold.join(' | ')); console.log(k, 'SENT', v.sent.join(' | ')); }
  console.log('title', ttl, 'bold', nb, 'sentences', ns); await app.close();
})().catch((e) => { console.error(e); process.exit(1); });