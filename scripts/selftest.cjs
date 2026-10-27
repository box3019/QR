// QR self-test: launches the installed QR.exe with Playwright _electron, runs the acceptance sets, takes screenshots.
// Usage: node scripts/selftest.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright');
const fs = require('fs');
const path = require('path');
const [exe, data, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const SETS = [
  ['bq', ['BQ43596A_d.pdf', ...(fs.existsSync(path.join(data, 'BQ43596A_step')) ? ['BQ43596A_step'] : [])]],
  ['elta', ['ELTA_ex1.pdf', 'ELTA_ex2.pdf']],
  ['kla', ['KLA_matbug_d.pdf']],
  ['kla_ex3', ['KLA_ex3.pdf']],
  ['elbit_ex4', ['ELBIT_ex4.pdf']],
];
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_MAXIMIZE: '0' } });
  const win = await app.firstWindow();
  await win.setViewportSize({ width: 1700, height: 1000 }).catch(() => {});
  await win.waitForSelector('[data-testid=dropzone]');
  const title = await win.title();
  await win.screenshot({ path: path.join(out, '00_main_empty.png') });
  const summary = { title, sets: {} };
  for (const [name, files] of SETS) {
    const t0 = Date.now();
    await win.evaluate((p) => window.__qrRun(p), files.map((f) => path.join(data, f)));
    await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=parts-panel]'), null, { timeout: 15 * 60 * 1000 });
    const parts = await win.evaluate(() => window.__qrParts);
    summary.sets[name] = { seconds: Math.round((Date.now() - t0) / 1000), parts: parts.map((p) => ({ partNo: p.partNo, rev: p.rev, customer: p.customer, material: p.material, status: p.status, rejectReason: p.rejectReason, readiness: p.readiness, textMode: p.textMode, problems: p.problems.map((x) => ({ severity: x.severity, category: x.category, message: x.message, loc: x.loc })), tasks: p.tasks.map((t) => ({ type: t.type, title: t.title })), threads: p.threads, threadMatches: p.threadMatches, zones: p.zones, route: p.route.map((s) => ({ seq: s.seq, type: s.type, moved: s.moved, blocked: s.blocked, text: s.items.map((i) => i.text).join(' | ').slice(0, 160) })), model: p.model, modelSearchLog: p.modelSearchLog, ocr: p.drawing.pages.map((g) => ({ n: g.n, mode: g.quality.mode, reasons: g.quality.reasons, ocr: g.ocr ? { dpi: g.ocr.dpi, tiles: g.ocr.tiles, seconds: g.ocr.seconds, words: g.ocr.words.length, low: g.ocr.words.filter((w) => w.conf < 0.6).length, sample: g.ocr.words.slice(0, 40).map((w) => w.text + ':' + Math.round(w.conf * 100)) } : null, ocrError: g.ocrError })) })) };
    await win.waitForTimeout(2500); // drawing preview render
    await win.screenshot({ path: path.join(out, `${name}_1_main_problems.png`) });
    await win.click('[data-testid=tab-route]');
    await win.waitForTimeout(400);
    await win.screenshot({ path: path.join(out, `${name}_2_route_card.png`) });
    await win.click('[data-testid=tab-data]');
    await win.waitForTimeout(400);
    await win.screenshot({ path: path.join(out, `${name}_3_data.png`) });
    await win.click('[data-testid=tab-drawing]');
    await win.click('[data-testid=btn-questions]');
    await win.waitForTimeout(1200);
    await win.screenshot({ path: path.join(out, `${name}_4_questions_he.png`) });
    if (name === 'bq' || name === 'elbit_ex4') {
      await win.click('[data-testid=lang-en]'); await win.waitForTimeout(800);
      await win.screenshot({ path: path.join(out, `${name}_5_questions_en.png`) });
    }
    await win.keyboard.press('Escape').catch(() => {});
    await win.evaluate(() => window.__qrDialog(null));
    for (const lang of ['he', 'en']) await win.evaluate(([p, l, t]) => window.qr.exportQuestions(p, l, t), [parts, lang, path.join(out, `${name}_questions_${lang}.pdf`)]);
    await win.evaluate(([p, t]) => window.qr.exportSummary(p, 'csv', t), [parts, path.join(out, `${name}_summary.csv`)]);
  }
  await win.click('[data-testid=btn-settings]'); await win.waitForTimeout(500);
  await win.screenshot({ path: path.join(out, '90_settings.png') });
  await win.evaluate(() => window.__qrDialog('summary')); await win.waitForTimeout(400);
  await win.screenshot({ path: path.join(out, '91_summary.png') });
  fs.writeFileSync(path.join(out, 'selftest.json'), JSON.stringify(summary, null, 1));
  await app.close();
  console.log('SELFTEST DONE', title);
})().catch((e) => { console.error('SELFTEST FAIL', e); process.exit(1); });
