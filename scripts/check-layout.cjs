// Layout / contrast check on SYNTHETIC drawings only. Usage: node scripts/check-layout.cjs <QR.exe> <outDir> [appDir]
// For every palette x language x size (1280x800, 1920x1080): Summary checklist table has no horizontal scroll and no clipped headers,
// text contrast >= 4.5, no ancestor opacity < 1, no full-page overlay; plus a scan for ANY horizontal scrollbar on steps 2-4.
// In the busy state (re-analysis running) the same contrast / opacity / overlay checks run once per palette. Writes layout_report.json + busy shots.
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out, appDir] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true }); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { DOCS } = require('./syn-docs.cjs');
const PALETTES = ['aris-glass', 'icloud-windows', 'cleanmymac', 'priority-erp', 'industrial-steel', 'graphite', 'warm-neutral', 'soft-salad', 'soft-beige', 'soft-olive-gray', 'high-contrast'];
const SIZES = [[1280, 800], [1920, 1080]];
// runs in the page
const MEASURE = () => {
  const rgba = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e); let base = { r: 255, g: 255, b: 255, a: 1 }; for (const e of chain.reverse()) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c.a > 0) base = over(c, base); } return base; };
  const opac = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  const res = { w: innerWidth, h: innerHeight, issues: [] };
  const card = document.querySelector('[data-testid=checklist-summary]'); const tbl = card && card.querySelector('table');
  res.hasTable = !!tbl;
  if (tbl) {
    res.table = { sw: tbl.scrollWidth, cw: tbl.clientWidth, card: card.clientWidth, rows: tbl.querySelectorAll('tbody tr').length };
    if (tbl.scrollWidth > tbl.clientWidth + 1) res.issues.push('table scrollWidth ' + tbl.scrollWidth + ' > ' + tbl.clientWidth);
    for (let e = tbl.parentElement; e && e !== document.body; e = e.parentElement) if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') res.issues.push('ancestor scrolls horizontally: ' + (e.className || e.tagName));
    tbl.querySelectorAll('th,td').forEach((c) => { if (c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1) res.issues.push('clipped cell ' + c.tagName + ':' + (c.textContent || '').slice(0, 20)); });
    let minC = 99, minEl = ''; tbl.querySelectorAll('th,td,td *').forEach((c) => { if (!(c.childNodes && [...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) return; const fg = rgba(getComputedStyle(c).color); if (!fg) return; const bg = bgOf(c); const f = over(fg, bg); const L1 = lum(f), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); if (cr < minC) { minC = cr; minEl = c.tagName + ':' + (c.textContent || '').trim().slice(0, 16); } });
    res.minContrast = Math.round(minC * 100) / 100; res.minContrastEl = minEl; if (minC < 4.5) res.issues.push('contrast ' + res.minContrast + ' at ' + minEl);
    const cv = document.createElement('canvas').getContext('2d'); tbl.querySelectorAll('th,td').forEach((c) => { const cs = getComputedStyle(c); cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const inner = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); const words = (c.innerText || '').split(/\s+/).filter(Boolean); const bad = words.find((x) => cv.measureText(x).width > inner + 1); if (bad) res.issues.push('word does not fit (would break): ' + bad + ' ' + Math.round(cv.measureText(bad).width) + '>' + Math.round(inner)); });
    tbl.querySelectorAll('.qr-cks-p bdi').forEach((b) => { const n = new Set([...b.getClientRects()].map((r) => Math.round(r.top))).size; if (n > 1) res.issues.push('part number wraps: ' + b.textContent); });
    const o = opac(tbl); res.tableOpacity = o; if (o < 1) res.issues.push('ancestor opacity ' + o);
    tbl.querySelectorAll('*').forEach((c) => { if (Number(getComputedStyle(c).opacity) < 1) res.issues.push('opacity<1 inside table: ' + c.tagName); });
    const cb = rgba(getComputedStyle(card).backgroundColor), pg = bgOf(card.parentElement); res.cardBg = cb ? [cb.r, cb.g, cb.b, cb.a].join() : null; res.pageBg = [pg.r, pg.g, pg.b].map(Math.round).join();
    if (cb && cb.a === 1 && Math.abs(cb.r - pg.r) + Math.abs(cb.g - pg.g) + Math.abs(cb.b - pg.b) < 6) res.cardSameAsPage = true;
  }
  const extra = [...document.querySelectorAll('.qr-provisional,[data-testid=busy],.qr-stat')]; res.extraContrast = []; extra.forEach((root) => { root.querySelectorAll('*').forEach((c) => { if (![...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return; const fg = rgba(getComputedStyle(c).color); if (!fg) return; const bg = bgOf(c); const f = over(fg, bg); const L1 = lum(f), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); res.extraContrast.push(Math.round(cr * 100) / 100); if (cr < 4.5) res.issues.push('contrast ' + (Math.round(cr * 100) / 100) + ' in ' + (root.className || root.dataset.testid).toString().slice(0, 20) + ':' + (c.textContent || '').trim().slice(0, 16)); }); });
  // full-page overlays / dimming
  document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'absolute') return; const r = e.getBoundingClientRect(); if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) return; const bg = rgba(cs.backgroundColor); const vis = cs.visibility !== 'hidden' && cs.display !== 'none'; if (vis && ((bg && bg.a > 0 && !e.classList.contains('qr-root') && !e.matches('[class*=qr-proj]')) || cs.backdropFilter !== 'none') && cs.pointerEvents !== 'none') res.issues.push('full-page overlay: ' + (e.className || e.tagName)); });
  const busy = document.querySelector('[data-testid=busy]'); res.busy = !!busy;
  document.querySelectorAll('[data-testid=project][data-id]:not(.qr-proj-off) , .qr-wiz, .qr-wiz-main, .qr-summary-step, .qr-sum-wrap').forEach((e) => { const o = opac(e); if (o < 1) res.issues.push('page opacity ' + o + ' at ' + (e.className || '').toString().slice(0, 30)); const f = getComputedStyle(e).filter; if (f && f !== 'none') res.issues.push('filter ' + f); });
  // any horizontal scrollbar in the visible app
  const hs = []; document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return; if (e.closest('.qr-proj-off')) return; if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1) { const rr = e.getBoundingClientRect(); const wide = [...e.querySelectorAll('*')].filter((d) => (d.getBoundingClientRect().right > rr.right + 1 || d.getBoundingClientRect().left < rr.left - 1) && d.getBoundingClientRect().width > 0).slice(0, 4).map((d) => { const ch = []; for (let x = d.parentElement; x && x !== e; x = x.parentElement) ch.push(x.tagName + '.' + (x.className || '').toString().slice(0, 18) + (getComputedStyle(x).whiteSpace === 'nowrap' ? '(nowrap)' : '') + ' w' + Math.round(x.getBoundingClientRect().width)); return ch.slice(0, 4).join('<') + ' >> ' + (d.textContent || '').slice(0, 24) + ' :: ' + d.tagName + '.' + (d.className || '').toString().slice(0, 30) + ' w' + Math.round(d.getBoundingClientRect().width) + (d.tagName === 'TABLE' ? ' layout=' + getComputedStyle(d).tableLayout : ''); }); hs.push((e.className || e.tagName).toString().slice(0, 40) + ' ' + e.scrollWidth + '>' + e.clientWidth + ' [' + wide.join(' | ') + ']'); } });
  if (document.documentElement.scrollWidth > innerWidth + 1) hs.push('document ' + document.documentElement.scrollWidth + '>' + innerWidth);
  res.hscroll = hs; hs.forEach((x) => res.issues.push('h-scroll: ' + x));
  return res;
};
(async () => {
  const prof = path.join(out, 'layout_profile'); fs.rmSync(prof, { recursive: true, force: true }); fs.mkdirSync(prof, { recursive: true });
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
  const report = { idle: [], busy: [], scan: [] }; let fail = 0; const QUICK = !!process.env.QUICK;
  const set = async (pal, lang) => { await win.evaluate((p) => window.__qrSetSettings && window.__qrSetSettings(p), { palette: pal, uiLanguage: lang }); await sleep(500); };
  for (const lang of ['en', 'he']) for (const [w, h] of SIZES) { await size(w, h); await sleep(500);
    for (const pal of (QUICK ? ['industrial-steel'] : PALETTES)) { await set(pal, lang); await win.evaluate(() => window.__qrStep(4)); await sleep(500); const m = await win.evaluate(MEASURE); const r = { lang, size: w + 'x' + h, palette: pal, ...m, issues: [...new Set(m.issues)] }; if (Math.abs(r.w - w) > 24) r.issues.push('window width ' + r.w + ' != ' + w); report.idle.push(r); if (r.issues.length || !r.hasTable) fail++; } }
  // other steps: any horizontal scrollbar at all
  await set('industrial-steel', 'en');
  for (const lang of ['en', 'he']) for (const [w, h] of SIZES) { await size(w, h); await sleep(400); await set('industrial-steel', lang);
    for (const st of [2, 3, 4]) { await win.evaluate((s) => { window.__qrStep(s); if (s === 2) window.__qrSelect && window.__qrSelect(0, 'drawing'); }, st); await sleep(900); const m = await win.evaluate(MEASURE); report.scan.push({ lang, size: w + 'x' + h, step: st, hscroll: m.hscroll }); if (m.hscroll.length) fail++; } }
  // busy state (re-analysis running on Summary), once per palette at 1280x800 EN, plus HE
  await size(1280, 800);
  for (const [lang, pals] of (QUICK ? [] : [['en', PALETTES], ['he', ['industrial-steel']]])) for (const pal of pals) { await set(pal, lang); await win.evaluate(() => window.__qrStep(4)); await sleep(400);
    await win.evaluate((f) => { window.__qrRun(f); }, files); let seen = false; for (let i = 0; i < 40 && !seen; i++) { await sleep(150); seen = !!(await win.$('[data-testid=busy]')); }
    await sleep(500); const m = await win.evaluate(MEASURE); const r = { lang, palette: pal, busySeen: seen, ...m, issues: [...new Set(m.issues)] }; if (!seen) r.issues.push('busy state not reached'); report.busy.push(r); if (r.issues.length) fail++;
    if (pal === 'industrial-steel' || lang === 'en') await win.screenshot({ path: path.join(out, `busy_${lang}_${pal}.png`) });
    await win.waitForFunction(() => !document.querySelector('[data-testid=busy]'), null, { timeout: 240000 }).catch(() => {}); await sleep(600); }
  report.fail = fail; fs.writeFileSync(path.join(out, 'layout_report.json'), JSON.stringify(report, null, 1));
  const bad = [...report.idle, ...report.busy].filter((r) => r.issues.length || (r.hasTable === false));
  console.log(JSON.stringify({ idleChecked: report.idle.length, busyChecked: report.busy.length, scanChecked: report.scan.length, fail, bad: bad.slice(0, 12).map((r) => ({ lang: r.lang, size: r.size, pal: r.palette, hasTable: r.hasTable, issues: r.issues.slice(0, 5) })), minContrast: Math.min(...report.idle.concat(report.busy).filter((r) => r.minContrast).map((r) => r.minContrast)), scanBad: report.scan.filter((s) => s.hscroll.length) }, null, 1));
  await app.close().catch(() => {}); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
