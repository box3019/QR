// Buttons before/after: Step 1, Step 2, Summary (EN+HE), button sizes at Normal and Huge text, dark-fill check,
// plus PDF report and Excel samples. Usage: node scripts/shots-buttons.cjs <QR.exe> <testDataDir> <outDir> <tag>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out, tag] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g); if (!m) return 1; const [r, g, b, a] = m.map(Number); if (a === 0) return 1; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.unmaximize(); w.setBounds({ x: -30000, y: -30000, width: 1600, height: 1000 }); });
  await win.waitForSelector('[data-testid=dropzone]');
  if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]');
  const probe = async (name) => { const r = await win.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.getBoundingClientRect().width).map((b) => { const c = getComputedStyle(b); return { id: b.dataset.testid || b.textContent.trim().slice(0, 20), bg: c.backgroundColor, h: Math.round(b.getBoundingClientRect().height), fs: c.fontSize }; }));
    const dark = r.filter((x) => lum(x.bg) < 0.6); console.log(tag, name, 'buttons', r.length, 'dark', dark.length, JSON.stringify(dark.slice(0, 6)), 'h', [...new Set(r.map((x) => x.h))].join('/'), 'fs', [...new Set(r.map((x) => x.fs))].join('/')); };
  const shot = async (n) => { await win.waitForTimeout(400); await win.screenshot({ path: path.join(out, `${tag}_${n}.png`) }); await probe(n); };
  for (const l of ['en', 'he']) { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x, textSize: 'normal' }), l); await shot('step1_' + l); }
  await win.evaluate(() => window.__qrSetSettings({ textSize: 'huge' })); await shot('step1_he_huge'); await win.evaluate(() => window.__qrSetSettings({ textSize: 'normal' }));
  win.evaluate((p) => window.__qrRun(p), [path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => !document.querySelector('[data-testid=import-view][data-active=true]') && !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=parts-panel], [data-testid=breakdown-panel]'), null, { timeout: 10 * 60 * 1000 });
  for (const l of ['en', 'he']) { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x }), l); await win.evaluate(() => { window.__qrDetails(false); window.__qrSelect(0, 'drawing'); }); await shot('step2_' + l); }
  for (const l of ['en', 'he']) { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x }), l); await win.evaluate(() => window.__qrStep(4)); await shot('summary_' + l); }
  await win.evaluate(() => window.__qrSetSettings({ textSize: 'huge' })); await shot('summary_he_huge'); await win.evaluate(() => window.__qrSetSettings({ textSize: 'normal' }));
  const parts = await win.evaluate(() => window.__qrParts);
  if (await win.evaluate(() => !!window.qr.exportReport)) for (const l of ['en', 'he']) console.log(tag, 'pdf', l, JSON.stringify(await win.evaluate(([p, l, t]) => window.qr.exportReport(p, l, { rfq: '0518895-000', customer: 'KLA' }, t), [parts, l, path.join(out, `report_${l}.pdf`)])));
  console.log(tag, 'xlsx', JSON.stringify(await win.evaluate(([p, t]) => window.qr.exportRequirements(p, t), [parts, path.join(out, 'requirements.xlsx')])));
  await app.close(); console.log(tag, 'DONE');
})().catch((e) => { console.error(tag, 'FAIL', e); process.exit(1); });
