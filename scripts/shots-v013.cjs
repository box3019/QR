// v0.1.3 screenshots of the INSTALLED app: main window (RAR set), every Settings tab, narrow top bar check.
// Usage: node scripts/shots-v013.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const TABS = ['general', 'ocr', 'materials', 'processes', 'customers', 'outlook', 'folders'];
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow(); await win.waitForSelector('[data-testid=dropzone]');
  const report = { title: await win.title() };
  const size = (s) => app.evaluate(({ BrowserWindow, screen }, s) => { const w = BrowserWindow.getAllWindows()[0]; const wa = screen.getDisplayMatching(w.getBounds()).workArea; if (s === 'max') { w.maximize(); return; } w.unmaximize(); w.setBounds({ x: wa.x + 20, y: wa.y + 20, width: s[0], height: s[1] }); }, s);
  await size('max'); await win.waitForTimeout(600);
  report.firstRun = !!(await win.$('[data-testid=first-run]'));
  await win.screenshot({ path: path.join(out, 'v013_first_run.png') });
  if (report.firstRun) { await win.click('[data-testid=first-run-ok]'); await win.waitForTimeout(400); }
  await win.screenshot({ path: path.join(out, 'v013_empty.png') });
  report.untitledButtons = await win.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !b.title).map((b) => b.textContent));
  await win.evaluate((p) => window.__qrRun(p), [path.join(data, 'fixtures', 'RAFAEL_batch1.rar'), path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=parts-panel]'), null, { timeout: 15 * 60 * 1000 });
  report.parts = await win.evaluate(() => window.__qrParts.map((p) => ({ part: p.partNo, rev: p.rev, status: p.status, material: p.material && p.material.normalized, readiness: p.readiness, cap: p.problems.filter((x) => /Material|Process/.test(x.category)).map((x) => x.severity + ': ' + x.message) })));
  const kla = report.parts.findIndex((p) => /^0\d{6}-\d{3}$/.test(p.part));
  if (kla >= 0) await win.evaluate((i) => window.__qrSelect(i, 'drawing'), kla);
  await win.waitForTimeout(2500);
  report.plainStatus = await win.evaluate(() => [...document.querySelectorAll('[data-testid=plain-status]')].map((e) => e.dataset.status));
  await win.screenshot({ path: path.join(out, 'v013_main.png') });
  await win.evaluate(() => window.__qrDetails(true)); await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, 'v013_main_details.png') }); await win.evaluate(() => window.__qrDetails(false)); await win.waitForTimeout(300);
  await size([900, 1000]); await win.waitForTimeout(900);
  report.topbar900 = await win.evaluate(() => { const t = document.querySelector('.qr-topbar'); const bs = [...t.querySelectorAll('button')].map((b) => b.getBoundingClientRect()); return { buttons: bs.length, allVisible: bs.every((r) => r.right <= innerWidth + 1 && r.width > 0), topbarHeight: Math.round(t.getBoundingClientRect().height) }; });
  await win.screenshot({ path: path.join(out, 'v013_main_900.png') });
  await size('max'); await win.waitForTimeout(700);
  await win.click('[data-testid=btn-settings]'); await win.waitForSelector('[data-testid=settings-dialog]');
  for (const t of TABS) {
    await win.click(`[data-testid=stab-${t}]`); await win.waitForTimeout(400);
    await win.screenshot({ path: path.join(out, `v013_settings_${t}.png`) });
    if (t === 'materials' || t === 'processes') { await win.click(`[data-testid=advanced-${t}]`); await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, `v013_settings_${t}_advanced.png`) }); await win.click(`[data-testid=advanced-${t}]`); }
  }
  await win.click('[data-testid=stab-general]');
  // live language switch through the real control (no restart)
  await win.click('[data-testid=stab-language]'); await win.selectOption('[data-testid=ui-lang]', 'he'); await win.waitForTimeout(500);
  report.liveDir = await win.evaluate(() => document.documentElement.dir);
  for (const t of TABS) { await win.click(`[data-testid=stab-${t}]`); await win.waitForTimeout(400); await win.screenshot({ path: path.join(out, `v013_he_settings_${t}.png`) }); }
  await win.click('[data-testid=settings-save]'); await win.waitForTimeout(600);
  const fit = () => win.evaluate(() => { const t = document.querySelector('.qr-topbar'); const bs = [...t.querySelectorAll('button')].map((b) => b.getBoundingClientRect()); return { dir: document.documentElement.dir, rootPx: getComputedStyle(document.documentElement).fontSize, hScroll: document.documentElement.scrollWidth > innerWidth + 1, topbarOk: bs.every((r) => r.left >= -1 && r.right <= innerWidth + 1 && r.width > 0), topbarHeight: Math.round(t.getBoundingClientRect().height) }; });
  report.he = { main: await fit() };
  await win.screenshot({ path: path.join(out, 'v013_he_main.png') });
  await win.evaluate(() => window.__qrSelect(0, 'route')); await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, 'v013_he_route.png') });
  await win.evaluate(() => window.__qrSelect(0, 'drawing'));
  await win.click('[data-testid=btn-questions]'); await win.waitForSelector('[data-testid=questions-dialog]'); await win.waitForTimeout(1200);
  await win.screenshot({ path: path.join(out, 'v013_he_questions.png') });
  // Hebrew export end to end (PDF + TXT written to a known folder)
  const qdir = path.join(out, 'questions_he'); fs.mkdirSync(qdir, { recursive: true });
  const ex = await win.evaluate((d) => window.qr.exportQuestions(window.__qrParts, 'he', d), path.join(qdir, 'Questions_he.pdf'));
  const txtFile = ex && (ex.txt || (ex.pdf && ex.pdf.replace(/\.pdf$/i, '.txt')));
  report.heExport = { result: ex, pdfBytes: ex && ex.pdf && fs.existsSync(ex.pdf) ? fs.statSync(ex.pdf).size : 0, txtHebrew: !!(txtFile && fs.existsSync(txtFile) && /[\u0590-\u05FF]/.test(fs.readFileSync(txtFile, 'utf8'))) };
  await win.keyboard.press('Escape'); await win.evaluate(() => window.__qrDialog(null)); await win.waitForTimeout(300);
  // text sizes, EN and HE, maximized and at 1280x800
  report.sizes = {};
  for (const lang of ['en', 'he']) for (const sz of ['normal', 'large', 'xlarge', 'huge']) {
    await win.evaluate((p) => window.__qrSetSettings(p), { uiLanguage: lang, textSize: sz }); await win.waitForTimeout(500);
    report.sizes[lang + '_' + sz] = await fit();
    await win.screenshot({ path: path.join(out, `v013_size_${lang}_${sz}.png`) });
  }
  await size([1280, 800]); await win.waitForTimeout(700); report.sizes.he_huge_1280 = await fit(); await win.screenshot({ path: path.join(out, 'v013_size_he_huge_1280.png') });
  await win.click('[data-testid=btn-settings]'); await win.waitForSelector('[data-testid=settings-dialog]'); await win.click('[data-testid=stab-customers]'); await win.waitForTimeout(400);
  await win.screenshot({ path: path.join(out, 'v013_size_he_huge_1280_customers.png') });
  fs.writeFileSync(path.join(out, 'v013_shots.json'), JSON.stringify(report, null, 1));
  await app.close(); console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
