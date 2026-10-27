// v0.1.1 screenshots in the real window (no viewport emulation): RAR set + e-mail at 3 window sizes; layout and stale-state checks
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [] });
  const win = await app.firstWindow(); await win.waitForSelector('[data-testid=dropzone]');
  const report = {};
  const size = (s) => app.evaluate(({ BrowserWindow, screen }, s) => { const w = BrowserWindow.getAllWindows()[0]; const wa = screen.getDisplayMatching(w.getBounds()).workArea; if (s === 'max') { w.maximize(); return; } w.unmaximize(); w.setBounds({ x: wa.x + 20, y: wa.y + 20, width: s[0], height: s[1] }); }, s);
  for (const [name, files] of [['rar', ['fixtures\\RAFAEL_batch1.rar']], ['email', ['fixtures\\RFQ_701751.msg']], ['after_email_kla', ['KLA_matbug_d.pdf']]]) {
    await size('max'); await win.waitForTimeout(500);
    await win.evaluate((p) => window.__qrRun(p), files.map((f) => path.join(data, f)));
    await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=parts-panel]'), null, { timeout: 15 * 60 * 1000 });
    await win.waitForTimeout(2500);
    report[name] = { parts: await win.evaluate(() => window.__qrParts.map((p) => `${p.partNo} rev ${p.rev}${p.rfq ? ' qty ' + p.rfq.qty : ''}`)), rfqs: await win.evaluate(() => window.__qrRfqs.map((r) => ({ rfq_no: r.rfq_no, match: r.match }))), other: await win.evaluate(() => window.__qrUnknown), layout: {} };
    for (const s of name === 'after_email_kla' ? ['max'] : ['max', [1280, 800], [900, 1000]]) {
      await size(s); await win.waitForTimeout(900);
      const tag = s === 'max' ? 'full' : s.join('x');
      report[name].layout[tag] = await win.evaluate(() => { const b = document.querySelector('.qr-body'); const kids = [...b.children].map((c) => c.getBoundingClientRect()); return { iw: innerWidth, ih: innerHeight, bodyBottom: Math.round(b.getBoundingClientRect().bottom), maxRight: Math.round(Math.max(...kids.map((k) => k.right))), fits: kids.every((k) => k.right <= innerWidth + 1 && k.bottom <= innerHeight + 1) }; });
      await win.screenshot({ path: path.join(out, `v011_${name}_${tag}.png`) });
    }
  }
  fs.writeFileSync(path.join(out, 'v011_shots.json'), JSON.stringify(report, null, 1));
  await app.close(); console.log(JSON.stringify(report));
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
