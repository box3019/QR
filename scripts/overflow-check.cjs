// Overflow check on the INSTALLED app: every button/chip/tab/select/badge on every screen and dialog,
// EN + HE, 4 text sizes, widths 900 / 1280 / full. Fails (exit 2) on any overflow or any text drawn over another element.
// The window is kept offscreen.
// Usage: node scripts/overflow-check.cjs <QR.exe> <testDataDir> <outDir> [tag]
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out, tag = 'ovf'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const LANGS = ['en', 'he'], SIZES = ['normal', 'large', 'xlarge', 'huge'], WIDTHS = [900, 1280, 'full'];
const SEL = 'button, select, .qr-chip, .qr-tab, .qr-settings-tab, [data-testid=plain-status], .qr-badge, .mrt-btn, summary';

/** In-page: returns overflowing controls. Ellipsis + tooltip counts as fitted (text is cut on purpose and shown on hover). */
function scan(SEL) {
  const fails = [];
  const name = (e) => (e.dataset.testid || e.className.toString().split(' ').find((c) => /^qr-|^mrt-/.test(c)) || e.tagName.toLowerCase());
  for (const e of document.querySelectorAll(SEL)) {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (!r.width || !r.height || cs.visibility === 'hidden' || r.bottom < 0 || r.top > innerHeight) continue;
    const ellipsis = cs.textOverflow === 'ellipsis' && e.title;
    const label = (e.innerText || e.value || '').trim().slice(0, 40);
    const f = [];
    if (e.tagName === 'SELECT') {
      const o = e.options[e.selectedIndex]; const c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const need = c.measureText(o ? o.text : '').width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + Math.max(0, 18 - parseFloat(cs.paddingInlineEnd || cs.paddingRight)); // arrow sits in the end padding (fit.css)
      if (need > e.clientWidth + 1) f.push(['textW', Math.round(need - e.clientWidth)]);
      const lh = parseFloat(cs.fontSize) * 1.15 + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      if (lh > e.clientHeight + 1) f.push(['textH', Math.round(lh - e.clientHeight)]);
    } else {
      if (!ellipsis && e.scrollWidth > e.clientWidth + 1) f.push(['scrollW', e.scrollWidth - e.clientWidth]);
      if (e.scrollHeight > e.clientHeight + 1) f.push(['scrollH', e.scrollHeight - e.clientHeight]);
      const rg = document.createRange(); rg.selectNodeContents(e);
      for (const t of rg.getClientRects()) {
        const dx = Math.max(r.left - t.left, t.right - r.right), dy = Math.max(r.top - t.top, t.bottom - r.bottom);
        if (!ellipsis && dx > 1) { f.push(['textX', Math.round(dx)]); break; }
        if (dy > 1) { f.push(['textY', Math.round(dy)]); break; }
      }
    }
    if (f.length) { e.setAttribute('data-ovf', '1'); fails.push({ el: name(e), label, issues: f, worst: Math.max(...f.map((x) => x[1])), rect: [r.x, r.y, r.width, r.height].map(Math.round) }); }
  }
  return fails.concat(overlaps());
}

/** In-page: text drawn on top of another element. Every visible text run (Range rects of text nodes) is checked against
 * the text runs and control boxes of elements that are not its ancestor/descendant; only what is actually on top
 * (elementFromPoint) counts, so a dialog over the main screen is not an overlap. */
function overlaps() {
  const CTRL = 'button, select, input, textarea, .qr-chip, .qr-tab, .qr-settings-tab, .qr-badge, .mrt-btn, img, svg, canvas';
  const name = (e) => (e.dataset.testid || e.className.toString().split(' ').find((c) => /^qr-|^mrt-/.test(c)) || e.tagName.toLowerCase());
  const own = (n) => n.parentElement.closest(CTRL) || n.parentElement;
  const shut = (e) => { const d = e.closest('details:not([open])'); return !!d && !e.closest('summary'); }; // content of a closed <details> is not painted
  const vis = (e) => { if (shut(e)) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0; };
  // Part of a rect that is really painted: cut by every ancestor that clips (overflow not visible).
  const clip = (e, r) => { let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const q = p.getBoundingClientRect(); x0 = Math.max(x0, q.left); y0 = Math.max(y0, q.top); x1 = Math.min(x1, q.right); y1 = Math.min(y1, q.bottom); } }
    return { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0, x: x0, y: y0 }; };
  const runs = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.textContent.trim() || !n.parentElement || n.parentElement.closest('.textLayer, .qr-pdf, [data-no-overlap], option, script, style')) continue;
    const el = own(n); if (!vis(n.parentElement)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const r0 of rg.getClientRects()) { const r = clip(n.parentElement, r0);
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
      if (!top || !(el.contains(top) || top.contains(el) || top === el)) continue; // hidden under something else
      runs.push({ el, r, text: n.textContent.trim().slice(0, 30) });
    }
  }
  const boxes = [...document.querySelectorAll(CTRL)].filter((e) => vis(e) && !e.closest('[data-no-overlap]')).map((e) => ({ el: e, r: clip(e, e.getBoundingClientRect()), text: (e.innerText || e.value || '').trim().slice(0, 30) })).filter((b) => b.r.width > 2 && b.r.height > 2);
  const rel = (a, b) => a === b || a.contains(b) || b.contains(a);
  const cut = (a, b) => { const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return w > 1.5 && h > 1.5 ? Math.round(Math.min(w, h)) : 0; };
  const out = []; const seen = new Set();
  const layer = (e) => e.closest('.qr-modal-bg') || document.body;
  const stuck = (e) => { for (let p = e; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'sticky' || ps === 'fixed') return p; } return null; };
  const hit = (a, b) => {
    if (layer(a.el) !== layer(b.el)) return; // a dialog over the screen is not an overlap
    if (stuck(a.el) !== stuck(b.el)) return; // a sticky header over content scrolled under it is covering, not overlapping
    const cx = (Math.max(a.r.left, b.r.left) + Math.min(a.r.right, b.r.right)) / 2, cy = (Math.max(a.r.top, b.r.top) + Math.min(a.r.bottom, b.r.bottom)) / 2;
    const t = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, cx)), Math.min(innerHeight - 1, Math.max(0, cy)));
    if (!t || !(rel(t, a.el) || rel(t, b.el))) return; // the meeting point is covered by something else
    const k = [name(a.el) + ':' + a.text, name(b.el) + ':' + b.text].sort().join(' | '); if (seen.has(k)) return; seen.add(k);
    a.el.setAttribute('data-ovf', '1'); b.el.setAttribute('data-ovf', '1');
    out.push({ el: name(a.el), label: `"${a.text}" over ${name(b.el)} "${b.text}"`, issues: [['overlap', cut(a.r, b.r)]], worst: cut(a.r, b.r), rect: [a.r.x, a.r.y, a.r.width, a.r.height].map(Math.round) });
  };
  for (let i = 0; i < runs.length; i++) {
    const a = runs[i];
    for (let j = i + 1; j < runs.length; j++) { const b = runs[j]; if (!rel(a.el, b.el) && cut(a.r, b.r)) hit(a, b); }
    for (const b of boxes) if (!rel(a.el, b.el) && cut(a.r, b.r)) hit(a, b);
  }
  return out;
}

(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile_' + tag) } });
  const win = await app.firstWindow(); await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.setPosition(-30000, -30000); }).catch(() => {}); await win.waitForSelector('[data-testid=dropzone]');
  const size = (s) => app.evaluate(({ BrowserWindow, screen }, s) => { const w = BrowserWindow.getAllWindows()[0]; const wa = screen.getDisplayMatching(w.getBounds()).workArea; w.setSkipTaskbar(true); w.unmaximize(); // kept offscreen so the test does not jump around on the desktop; capturePage still renders
    w.setBounds({ x: -30000, y: -30000, width: s === 'full' ? wa.width : s, height: s === 'full' ? wa.height : Math.min(900, wa.height - 20) }); }, s);
  const set = (p) => win.evaluate((p) => window.__qrSetSettings(p), p);
  const results = []; const worst = []; const ovShot = new Set();
  const sweep = async (screen, open) => {
    for (const lang of LANGS) for (const sz of SIZES) for (const w of WIDTHS) {
      await size(w); await set({ uiLanguage: lang, textSize: sz }); await win.waitForTimeout(250);
      if (open) await open();
      await win.waitForTimeout(150);
      const fails = await win.evaluate(`(() => { ${overlaps.toString()}; return (${scan.toString()})(${JSON.stringify(SEL)}); })()`);
      const combo = `${screen}|${lang}|${sz}|${w}`;
      results.push({ combo, fails });
      if (fails.length) {
        const m = Math.max(...fails.map((f) => f.worst));
        if (worst.length < 6 || m > worst[worst.length - 1].m) {
          const file = `${tag}_${screen}_${lang}_${sz}_${w}.png`;
          await win.addStyleTag({ content: '[data-ovf]{outline:3px solid #f0f !important; outline-offset:1px}' }).catch(() => {});
          await win.screenshot({ path: path.join(out, file) });
          worst.push({ m, combo, file, sample: fails.slice(0, 4) }); worst.sort((a, b) => b.m - a.m); const drop = worst.splice(6); for (const d of drop) fs.rmSync(path.join(out, d.file), { force: true });
        }
        const ov = fails.filter((f) => f.issues.some((i) => i[0] === 'overlap'));
        const ok = `${screen}|${lang}`;
        if (ov.length && !ovShot.has(ok)) { ovShot.add(ok); await win.addStyleTag({ content: '[data-ovf]{outline:3px solid #f0f !important; outline-offset:1px}' }).catch(() => {}); await win.screenshot({ path: path.join(out, `${tag}_overlap_${screen}_${lang}_${sz}_${w}.png`) }); }
        await win.evaluate(() => document.querySelectorAll('[data-ovf]').forEach((e) => e.removeAttribute('data-ovf')));
      }
    }
  };
  const has = (s) => win.$(s).then((x) => !!x);
  if (await has('[data-testid=first-run]')) await sweep('firstrun');
  if (await has('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]');
  await sweep('empty');
  await win.evaluate((p) => window.__qrRun(p), [path.join(data, 'fixtures', 'RAFAEL_batch1.rar'), path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]') && document.querySelector('[data-testid=parts-panel]'), null, { timeout: 15 * 60 * 1000 });
  await sweep('main', () => win.evaluate(() => { window.__qrDetails(false); window.__qrSelect(0, 'drawing'); }));
  await sweep('details', () => win.evaluate(() => { window.__qrDetails(true); window.__qrSelect(0, 'data'); }));
  await sweep('route', () => win.evaluate(() => { window.__qrDetails(false); window.__qrSelect(0, 'route'); }));
  await win.evaluate(() => window.__qrSelect(0, 'drawing'));
  await sweep('step1', () => win.evaluate(() => window.__qrStep(1)));
  await sweep('step3', () => win.evaluate(() => { window.__qrDetails(false); window.__qrStep(3); }));
  await sweep('step3-refs', async () => { await win.evaluate(() => window.__qrStep(3)); if (!(await has('[data-testid=box-refs]'))) await win.click('[data-testid=btn-refs]'); });
  await sweep('step4', () => win.evaluate(() => window.__qrStep(4)));
  await win.evaluate(() => window.__qrSelect(0, 'drawing'));
  await sweep('questions', async () => { if (!(await has('[data-testid=questions-dialog]'))) await win.evaluate(() => window.__qrDialog('questions')); });
  await win.evaluate(() => window.__qrDialog(null));
  await sweep('summary', async () => { if (!(await has('[data-testid=summary-dialog]'))) await win.evaluate(() => window.__qrDialog('summary')); });
  await win.evaluate(() => window.__qrDialog(null));
  for (const tb of ['general', 'ocr', 'materials', 'processes', 'customers', 'assistant', 'library', 'outlook', 'folders']) {
    await sweep('settings-' + tb, async () => { if (!(await has('[data-testid=settings-dialog]'))) await win.evaluate(() => window.__qrDialog('settings')); await win.waitForTimeout(150); if (await has(`[data-testid=stab-${tb}]`)) await win.click(`[data-testid=stab-${tb}]`); });
    if (!(await has(`[data-testid=stab-${tb}]`))) results.splice(-24, 24);
  }
  await win.evaluate(() => window.__qrDialog(null));
  if (await has('[data-testid=btn-help]')) await sweep('tutorial', async () => { if (!(await has('[data-testid=tutorial]'))) await win.click('[data-testid=btn-help]'); });
  const failing = results.filter((r) => r.fails.length);
  const byEl = {}; for (const r of failing) for (const f of r.fails) { const k = r.combo.split('|')[0] + ':' + f.el + ':' + f.label; byEl[k] = Math.max(byEl[k] || 0, f.worst); }
  const report = { tag, states: results.length, failingStates: failing.length, totalFailures: failing.reduce((a, r) => a + r.fails.length, 0), distinct: Object.keys(byEl).length, topElements: Object.entries(byEl).sort((a, b) => b[1] - a[1]).slice(0, 25), worst };
  fs.writeFileSync(path.join(out, tag + '_overflow.json'), JSON.stringify({ ...report, results: failing }, null, 1));
  await app.close(); console.log(JSON.stringify(report, null, 1)); process.exit(report.totalFailures ? 2 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
