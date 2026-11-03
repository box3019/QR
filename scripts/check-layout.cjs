// Layout / contrast check on SYNTHETIC drawings only. Usage: node scripts/check-layout.cjs <QR.exe> <outDir> [appDir]
// For every palette x language x size (1280x800, 1920x1080): Summary checklist table has no horizontal scroll and no clipped headers,
// text contrast >= 4.5, no ancestor opacity < 1, no full-page overlay; plus a scan for ANY horizontal scrollbar on steps 2-4.
// In the busy state (re-analysis running) the same contrast / opacity / overlay checks run once per palette. Writes layout_report.json + busy shots.
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out, appDir] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true }); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { DOCS } = require('./syn-docs.cjs');
const PALETTES = ['aris-glass', 'icloud-windows', 'cleanmymac', 'priority-erp', 'industrial-steel', 'graphite', 'warm-neutral', 'soft-salad', 'soft-beige', 'soft-olive-gray', 'high-contrast'];
const SIZES = [[1366, 768], [1920, 1080], [2560, 1440], [3840, 2160]];
const DPI_SCALES = [1, 1.25, 1.5, 2];
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
    { const cs = getComputedStyle(card); const inner = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); res.table.inner = inner; res.table.ow = tbl.offsetWidth; res.table.collapsed = tbl.querySelectorAll('[data-testid^=cks-count-]').length; res.table.expanded = tbl.querySelectorAll('[data-testid=cks-expanded]').length; if (tbl.offsetWidth > inner + 1 || tbl.scrollWidth > tbl.clientWidth + 1) res.issues.push('table width ' + tbl.offsetWidth + ' > ' + inner); }
    for (let e = tbl.parentElement; e && e !== document.body; e = e.parentElement) if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') res.issues.push('ancestor scrolls horizontally: ' + (e.className || e.tagName));
    tbl.querySelectorAll('th,td').forEach((c) => { if (c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1) res.issues.push('clipped cell ' + c.tagName + ':' + (c.textContent || '').slice(0, 20)); });
    let minC = 99, minEl = ''; tbl.querySelectorAll('th,td,td *').forEach((c) => { if (!(c.childNodes && [...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) return; const fg = rgba(getComputedStyle(c).color); if (!fg) return; const bg = bgOf(c); const f = over(fg, bg); const L1 = lum(f), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); if (cr < minC) { minC = cr; minEl = c.tagName + ':' + (c.textContent || '').trim().slice(0, 16); } });
    res.minContrast = Math.round(minC * 100) / 100; res.minContrastEl = minEl; if (minC < 4.5) res.issues.push('contrast ' + res.minContrast + ' at ' + minEl);
    const cv = document.createElement('canvas').getContext('2d'); tbl.querySelectorAll('th,td').forEach((c) => { const cs = getComputedStyle(c); cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const inner = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); const words = (c.innerText || '').split(/\s+/).filter(Boolean); const bad = words.find((x) => cv.measureText(x).width > inner + 1); if (bad) res.issues.push('word does not fit (would break): ' + bad + ' ' + Math.round(cv.measureText(bad).width) + '>' + Math.round(inner)); });
    tbl.querySelectorAll('.qr-cks-p bdi').forEach((b) => { const n = new Set([...b.getClientRects()].map((r) => Math.round(r.top))).size; if (n > 1) res.issues.push('part number wraps: ' + b.textContent); });
    { const EN_DOT = /\b(?:engr|asm|assy|spec|specs|insp|coat|dims?|qty|approx|incl|pcs|std|ref|mfg|dwg|mat|tol|dia|max|min|thr|cat|temp|no)\.(?=\s|$|\)|,)/i; const EN_SHORT = /\b(?:HT|dims|insp|Asm|Engr|Assy|Tol|thr)\b|\b(?:Al|SS|Cu|CS)\s+\d/; const BARE = /^(?:[\u2713\u2013?]\s*)?(?:100%|Clean|Fill|Tight|Coat|Heat|Laser|Engr|Asm)$/;
  const HE_ABBR = /[\u05D0-\u05EA]["\u05F4][\u05D0-\u05EA]|[\u05D0-\u05EA]['\u05F3](?=\s|$)/; const HE_OK = /(?:\u05DE|\u05E1|\u05E7)["\u05F4](?:\u05DE|\u05D2|\u05E8)|\u05D0\u05D9\u05E0\u05E5['\u05F3]|\u05D1\u05D6['\u05F3]/g; const abb = [];
  document.querySelectorAll('.qr-cks-tab, .qr-ck-tab').forEach((root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const x = n.textContent.replace(/\s+/g, ' ').trim(); if (!x) continue; if (EN_DOT.test(x) || EN_SHORT.test(x) || BARE.test(x) || HE_ABBR.test(x.replace(HE_OK, ''))) abb.push(x.slice(0, 40)); } });
  res.abbreviations = abb; abb.slice(0, 6).forEach((x) => res.issues.push('abbreviation: ' + x)); }
const o = opac(tbl); res.tableOpacity = o; if (o < 1) res.issues.push('ancestor opacity ' + o);
    tbl.querySelectorAll('*').forEach((c) => { if (Number(getComputedStyle(c).opacity) < 1) res.issues.push('opacity<1 inside table: ' + c.tagName); });
    const cb = rgba(getComputedStyle(card).backgroundColor), pg = bgOf(card.parentElement); res.cardBg = cb ? [cb.r, cb.g, cb.b, cb.a].join() : null; res.pageBg = [pg.r, pg.g, pg.b].map(Math.round).join();
    if (cb && cb.a === 1 && Math.abs(cb.r - pg.r) + Math.abs(cb.g - pg.g) + Math.abs(cb.b - pg.b) < 6) res.cardSameAsPage = true;
  }
  // one line per item: no header / label / chip / tag / button / summary-table item may wrap inside itself (height <= 1 line + 2px)
  const wraps = []; const nm = (e) => e.tagName + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : '');
  document.querySelectorAll('th, button, summary, .qr-stat-l, .qr-stat-n, .qr-chip, .qr-pcard-tag, .qr-pcard-badge, .qr-cks-t, .qr-cks-i, .qr-cks-p bdi, .qr-cks-g bdi, .qr-ck-items li, .qr-ck-where, .qr-ck-tab th, .qr-ck-l, .qr-ck-s, .qr-cks-x').forEach((e) => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('.qr-proj-off') || e.matches('[data-testid=tab-close],[data-testid=tab-more-close]')) return; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const pcs = getComputedStyle(n.parentElement); if (pcs.display === 'none' || pcs.visibility === 'hidden') continue; const rg = document.createRange(); rg.selectNodeContents(n); const rows = new Set([...rg.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top / 3))); if (rows.size > 1) { wraps.push(nm(e) + ':' + n.textContent.trim().slice(0, 24)); break; } } });
  res.wraps = wraps; wraps.slice(0, 8).forEach((x) => res.issues.push('item wraps: ' + x));
  const extra = [...document.querySelectorAll('.qr-provisional,[data-testid=busy],.qr-stat')]; res.extraContrast = []; extra.forEach((root) => { root.querySelectorAll('*').forEach((c) => { if (![...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return; const fg = rgba(getComputedStyle(c).color); if (!fg) return; const bg = bgOf(c); const f = over(fg, bg); const L1 = lum(f), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); res.extraContrast.push(Math.round(cr * 100) / 100); if (cr < 4.5) res.issues.push('contrast ' + (Math.round(cr * 100) / 100) + ' in ' + (root.className || root.dataset.testid).toString().slice(0, 20) + ':' + (c.textContent || '').trim().slice(0, 16)); }); });
  // full-page overlays / dimming
  document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'absolute') return; const r = e.getBoundingClientRect(); if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) return; const bg = rgba(cs.backgroundColor); const vis = cs.visibility !== 'hidden' && cs.display !== 'none'; if (vis && ((bg && bg.a > 0 && !e.classList.contains('qr-root') && !e.matches('[class*=qr-proj]')) || cs.backdropFilter !== 'none') && cs.pointerEvents !== 'none') res.issues.push('full-page overlay: ' + (e.className || e.tagName)); });
  const busy = document.querySelector('[data-testid=busy]'); res.busy = !!busy;
  document.querySelectorAll('[data-testid=project][data-id]:not(.qr-proj-off) , .qr-wiz, .qr-wiz-main, .qr-summary-step, .qr-sum-wrap').forEach((e) => { const o = opac(e); if (o < 1) res.issues.push('page opacity ' + o + ' at ' + (e.className || '').toString().slice(0, 30)); const f = getComputedStyle(e).filter; if (f && f !== 'none') res.issues.push('filter ' + f); });
  // any horizontal scrollbar in the visible app
  const hs = []; document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return; if (e.closest('.qr-proj-off')) return; if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1) { const rr = e.getBoundingClientRect(); const wide = [...e.querySelectorAll('*')].filter((d) => (d.getBoundingClientRect().right > rr.right + 1 || d.getBoundingClientRect().left < rr.left - 1) && d.getBoundingClientRect().width > 0).slice(0, 4).map((d) => { const ch = []; for (let x = d.parentElement; x && x !== e; x = x.parentElement) ch.push(x.tagName + '.' + (x.className || '').toString().slice(0, 18) + (getComputedStyle(x).whiteSpace === 'nowrap' ? '(nowrap)' : '') + ' w' + Math.round(x.getBoundingClientRect().width)); return ch.slice(0, 4).join('<') + ' >> ' + (d.textContent || '').slice(0, 24) + ' :: ' + d.tagName + '.' + (d.className || '').toString().slice(0, 30) + ' w' + Math.round(d.getBoundingClientRect().width) + (d.tagName === 'TABLE' ? ' layout=' + getComputedStyle(d).tableLayout : ''); }); hs.push((e.className || e.tagName).toString().slice(0, 40) + ' ' + e.scrollWidth + '>' + e.clientWidth + ' [' + wide.join(' | ') + ']'); } });
  if (document.documentElement.scrollWidth > innerWidth + 1) hs.push('document ' + document.documentElement.scrollWidth + '>' + innerWidth);
  res.hscroll = hs; hs.forEach((x) => res.issues.push('h-scroll: ' + x));
  // Check for overlapping elements in tables
  const overlaps = []; const tblEls = document.querySelectorAll('.qr-cks-tab td, .qr-cks-tab th, .qr-ck-tab td, .qr-ck-tab th');
  const rects = [...tblEls].map((e) => ({ el: e, r: e.getBoundingClientRect(), text: (e.textContent || '').slice(0, 20) }));
  for (let i = 0; i < rects.length; i++) { for (let j = i + 1; j < rects.length; j++) { const a = rects[i].r, b = rects[j].r;
    const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left), dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); /* sub-pixel rounding at fractional display scales is not an overlap */ if (dx > 2 && dy > 2 && a.width > 0 && b.width > 0) {
      const same = rects[i].el.closest('tr') === rects[j].el.closest('tr'); if (same) overlaps.push(rects[i].text + ' overlaps ' + rects[j].text); } } }
  res.overlaps = overlaps.slice(0, 5); overlaps.slice(0, 3).forEach((x) => res.issues.push('overlap: ' + x));
  // Check for Print / Save PDF button visibility (labels must stay on one line when shown)
  const printBtn = document.querySelector('[data-testid=btn-print]'); res.printButton = !!printBtn;
  if (!printBtn) res.issues.push('Print button not found');
  const savePdfBtn = document.querySelector('[data-testid=btn-save-pdf]'); res.savePdfButton = !!savePdfBtn;
  if (!savePdfBtn) res.issues.push('Save PDF button not found');
  if (savePdfBtn) {
    const lab = [...savePdfBtn.querySelectorAll('span')].find((s) => !s.classList.contains('ico'));
    const cs = lab && getComputedStyle(lab);
    if (cs && cs.display !== 'none' && cs.visibility !== 'hidden') {
      const t = (lab.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/Save PDF|שמור PDF/i.test(t)) res.issues.push('Save PDF label missing full words: ' + t);
      const rg = document.createRange(); rg.selectNodeContents(lab);
      const rows = new Set([...rg.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top / 3)));
      if (rows.size > 1) res.issues.push('Save PDF label wraps: ' + t);
    }
  }
  // Disabled Next (and other disabled buttons): white fill, dark text, dashed border, tooltip, contrast >= 4.5
  const disBtns = [...document.querySelectorAll('.mrt-btn:disabled, [data-testid=btn-next]:disabled, [data-testid=btn-print]:disabled, [data-testid=btn-save-pdf]:disabled, [data-testid=btn-cancel]:disabled')].filter((e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('.qr-proj-off'); });
  res.disabledButtons = disBtns.length;
  disBtns.forEach((b) => {
    const cs = getComputedStyle(b); const fg = rgba(cs.color); const bg = bgOf(b);
    if (fg) { const f = over(fg, bg); const L1 = lum(f), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (cr < 4.5) res.issues.push('disabled contrast ' + (Math.round(cr * 100) / 100) + ' ' + (b.getAttribute('data-testid') || b.textContent || '').toString().slice(0, 24)); }
    if (cs.borderTopStyle !== 'dashed' && cs.borderStyle !== 'dashed') res.issues.push('disabled border not dashed: ' + (b.getAttribute('data-testid') || '').slice(0, 20));
    const id = b.getAttribute('data-testid') || '';
    if ((id === 'btn-next' || id === 'btn-print' || id === 'btn-save-pdf') && !(b.getAttribute('title') || '').trim()) res.issues.push('disabled ' + id + ' missing tooltip');
  });
  const tabCloses = [...document.querySelectorAll('[data-testid=tab-close]')].filter((e) => { const cs = getComputedStyle(e); return !e.closest('.qr-proj-off') && cs.display !== 'none'; });
  if (!tabCloses.length) res.issues.push('tab close missing');
  res.tabCloses = tabCloses.length;
  tabCloses.forEach((b) => {
    const cs = getComputedStyle(b);
    if (cs.visibility === 'hidden') res.issues.push('tab close visibility hidden');
    const o = opac(b);
    if (o < 1 || Number(cs.opacity) < 1) res.issues.push('tab close opacity ' + o);
    const chip = b.closest('.mrt-workspace-tab') || b.parentElement || b;
    const fg = rgba(cs.color); const bg = bgOf(chip);
    if (fg) { const f = over(fg, bg); const L1 = lum(f), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (cr < 4.5) res.issues.push('tab close contrast ' + (Math.round(cr * 100) / 100)); }
    const rg = document.createRange(); rg.selectNodeContents(b);
    const gr = rg.getBoundingClientRect();
    const svg = b.querySelector('svg');
    const gw = Math.max(gr.width, svg ? svg.getBoundingClientRect().width : 0, b.scrollWidth);
    const gh = Math.max(gr.height, svg ? svg.getBoundingClientRect().height : 0, b.scrollHeight);
    const br = b.getBoundingClientRect();
    if (br.width < 24 || br.height < 24) res.issues.push('tab close hit area ' + Math.round(br.width) + 'x' + Math.round(br.height));
    if (gw < 14 || gh < 14) res.issues.push('tab close glyph size ' + Math.round(gw) + 'x' + Math.round(gh));
  });
  document.querySelectorAll('.qr-ptabs .mrt-workspace-tab__label').forEach((e) => {
    if (e.closest('.qr-proj-off')) return;
    const px = parseFloat(getComputedStyle(e).fontSize);
    if (px < 12) res.issues.push('tab chip font ' + px + 'px < 12px');
  });
  document.querySelectorAll('.qr-topbar .mrt-topbar-cmd').forEach((b) => {
    const cs = getComputedStyle(b); if (cs.display === 'none' || b.closest('.qr-proj-off')) return;
    const h = b.getBoundingClientRect().height;
    if (h > 46 || h < 40) res.issues.push('command button height ' + Math.round(h) + 'px (want 44)');
    const lab = [...b.querySelectorAll('span')].find((s) => !s.classList.contains('ico'));
    if (!lab) return;
    const lcs = getComputedStyle(lab);
    if (lcs.display === 'none' || lcs.visibility === 'hidden') return;
    if (lab.scrollWidth > lab.clientWidth + 1) res.issues.push('command label truncated: ' + (lab.textContent || '').trim().slice(0, 24));
  });
  document.querySelectorAll('.qr-rail .mrt-wizard-step-label, .qr-rail .mrt-wizard-step-text').forEach((e) => {
    const cs = getComputedStyle(e); if (cs.display === 'none' || e.closest('.qr-proj-off')) return;
    const ta = cs.textAlign;
    if (ta === 'center') res.issues.push('step menu centred: ' + (e.textContent || '').trim().slice(0, 24));
  });
  const ptabs = document.querySelector('.qr-ptabs');
  if (ptabs) { const cs = getComputedStyle(ptabs); if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') res.issues.push('job tabs must not scroll horizontally'); }
  const topbar = document.querySelector('.qr-topbar');
  if (topbar) {
    const tb = topbar.getBoundingClientRect();
    res.topbarHeight = Math.round(tb.height);
    if (tb.height > 58) res.issues.push('topbar wraps: ' + Math.round(tb.height) + 'px');
    ['btn-settings', 'btn-help'].forEach((id) => {
      const b = document.querySelector('[data-testid=' + id + ']');
      if (!b) { res.issues.push(id + ' missing'); return; }
      const r = b.getBoundingClientRect();
      if (r.top > tb.top + 16) res.issues.push(id + ' dropped below topbar row');
    });
  }
  // Every button, chip, tag, toggle, tab and menu item: no clipped text, no ellipsis, no wrap inside the control
  const clipSel = 'button, [role="button"], [role="menuitem"], [role="option"], [role="tab"], [role="switch"], [role="checkbox"], .qr-chip, .qr-tag, .qr-pcard-tag, .qr-pcard-badge, .qr-status, .qr-badge, .qr-tab, .qr-settings-tab, .mrt-workspace-tab, .qr-menu-item, .mrt-btn, .mrt-action-btn, summary, .qr-cks-x, .qr-sum-g, .qr-pres-chips button';
  const clipSkip = '[data-testid=tab-close],[data-testid=tab-more-close],[data-testid=ck-locate],[data-testid=block-locate],[data-testid=block-chev],[data-testid=cks-expand],.qr-ck-link,.qr-ck-loc,.qr-chip-x,.qr-face';
  const selOf = (e) => {
    const id = e.getAttribute('data-testid'); if (id) return '[data-testid=' + id + ']';
    if (e.id) return '#' + e.id;
    const cls = (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    return (e.tagName || 'EL').toLowerCase() + (cls ? '.' + cls : '');
  };
  const textBox = (el) => {
    const rg = document.createRange(); let minL = Infinity, maxR = -Infinity, minT = Infinity, maxB = -Infinity, tops = [], rects = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
    while ((n = walk.nextNode())) {
      if (!n.textContent.trim()) continue;
      const pcs = getComputedStyle(n.parentElement);
      if (pcs.display === 'none' || pcs.visibility === 'hidden') continue;
      try { rg.selectNodeContents(n); } catch { continue; }
      [...rg.getClientRects()].forEach((r) => {
        if (r.width < 1 || r.height < 2) return;
        minL = Math.min(minL, r.left); maxR = Math.max(maxR, r.right); minT = Math.min(minT, r.top); maxB = Math.max(maxB, r.bottom);
        tops.push(r.top);
        rects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
      });
    }
    return { w: maxR - minL, h: maxB - minT, left: minL, right: maxR, top: minT, bottom: maxB, tops, rects };
  };
  const stackedWrap = (box) => {
    const rs = box.rects || [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j];
      if (Math.abs(a.top - b.top) <= 6) continue;
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      if (overlap > Math.min(a.width, b.width) * 0.35) return true;
    }
    return false;
  };
  const clips = [];
  document.querySelectorAll(clipSel).forEach((e) => {
    if (e.closest('.qr-proj-off') || e.matches(clipSkip) || e.closest(clipSkip)) return;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
    const r0 = e.getBoundingClientRect();
    if (r0.width < 2 || r0.height < 2) return;
    const t = (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (/^[\u00D7\u2715\u25BE\u25B8\u2316\u2026]$/.test(t)) return;
    const lab = [...e.querySelectorAll('span,label,bdi')].find((s) => !s.classList.contains('ico') && (s.textContent || '').trim());
    if (e.matches('.mrt-topbar-cmd') && lab && (getComputedStyle(lab).display === 'none' || getComputedStyle(lab).visibility === 'hidden')) return;
    const measureEl = (e.matches('.mrt-topbar-cmd,.mrt-workspace-tab') && lab) ? lab : e;
    const mcs = measureEl === e ? cs : getComputedStyle(measureEl);
    const sw = measureEl.scrollWidth, cw = measureEl.clientWidth, sh = measureEl.scrollHeight, ch = measureEl.clientHeight;
    const found = [];
    if (sw > cw + 1) found.push('scrollWidth ' + Math.round(sw) + '>' + Math.round(cw));
    if (measureEl === e && sh > ch + 1) found.push('scrollHeight ' + Math.round(sh) + '>' + Math.round(ch));
    const ellip = (el) => {
      const s = getComputedStyle(el);
      return s.textOverflow === 'ellipsis' && (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflow === 'clip') && el.scrollWidth > el.clientWidth + 1;
    };
    if (ellip(measureEl) || ellip(e) || (lab && ellip(lab))) found.push('ellipsis');
    const box = textBox(measureEl);
    const isStack = e.matches('.mrt-topbar-cmd,.mrt-workspace-tab');
    if (!isStack && stackedWrap(box)) found.push('wrap');
    if (isStack && lab && stackedWrap(textBox(lab))) found.push('wrap');
    const br = measureEl.getBoundingClientRect();
    const padX = parseFloat(mcs.paddingLeft) + parseFloat(mcs.paddingRight);
    const padY = parseFloat(mcs.paddingTop) + parseFloat(mcs.paddingBottom);
    if (box.w > 0 && box.w > br.width - padX + 1) found.push('labelNarrower ' + Math.round(box.w) + '>' + Math.round(br.width - padX));
    const content = { left: br.left + parseFloat(mcs.paddingLeft), right: br.right - parseFloat(mcs.paddingRight) };
    if (box.w > 0 && (box.right > content.right + 1 || box.left < content.left - 1)) found.push('overflowBox');
    if (found.length) {
      const step = (document.querySelector('[data-testid=project]:not(.qr-proj-off)') || {}).getAttribute?.('data-step') || '';
      const dlg = e.closest('.qr-modal, .qr-settings, [data-testid=history], [data-testid=settings-dialog], [role=menu], .qr-filemenu');
      const screen = dlg ? (dlg.getAttribute('data-testid') || dlg.className || 'dialog') : ('step' + step);
      clips.push({ screen: String(screen).slice(0, 48), sel: selOf(e).slice(0, 72), text: t.slice(0, 56), size: innerWidth + 'x' + innerHeight, issues: [...new Set(found)] });
    }
  });
  res.clips = clips;
  clips.forEach((c) => res.issues.push('clip ' + c.screen + ' ' + c.sel + ' "' + c.text + '" @' + c.size + ' ' + c.issues.join(',')));
  // Checklist values: each of body / where / the row must fit (no text under locate, no zero-width, no horizontal clip).
  document.querySelectorAll('.qr-ck-body, .qr-ck-where, .qr-ck-items li, [data-testid=ck-item]').forEach((e) => {
    if (e.closest('.qr-proj-off')) return;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
    const t = (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    const sw = e.scrollWidth, cw = e.clientWidth;
    const found = [];
    if (sw > cw + 1) found.push('scrollWidth ' + Math.round(sw) + '>' + Math.round(cw));
    if (cw < 1) found.push('zeroWidth');
    if (!found.length) return;
    const step = (document.querySelector('[data-testid=project]:not(.qr-proj-off)') || {}).getAttribute?.('data-step') || '';
    const dlg = e.closest('.qr-modal, .qr-settings, [data-testid=history], [data-testid=settings-dialog], [role=menu], .qr-filemenu');
    const screen = dlg ? (dlg.getAttribute('data-testid') || dlg.className || 'dialog') : ('step' + step);
    const hit = { screen: String(screen).slice(0, 48), sel: selOf(e).slice(0, 72), text: t.slice(0, 56), size: innerWidth + 'x' + innerHeight, issues: found };
    clips.push(hit);
    res.issues.push('clip ' + hit.screen + ' ' + hit.sel + ' "' + hit.text + '" @' + hit.size + ' ' + found.join(','));
  });
  // Every button / role=button / onclick: visible border or fill distinct from the container, plus pointer (disabled may be default).
  const lookSkip = '.qr-modal-bg, .qr-modal-back, .qr-mark, video, .qr-vid-el, .qr-vid-bg, .qr-face, .qr-tour-dot';
  const looks = [];
  const distinct = (a, b) => { if (!a || !b) return false; return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) > 18 || Math.abs((a.a == null ? 1 : a.a) - (b.a == null ? 1 : b.a)) > 0.12; };
  document.querySelectorAll('button, [role="button"], [onclick]').forEach((e) => {
    if (e.closest('.qr-proj-off') || e.matches(lookSkip) || e.closest(lookSkip)) return;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
    if (e.getBoundingClientRect().width < 2 || e.getBoundingClientRect().height < 2) return;
    const parent = e.parentElement; const pbg = parent ? bgOf(parent) : { r: 255, g: 255, b: 255, a: 1 };
    const brd = rgba(cs.borderTopColor); const bw = parseFloat(cs.borderTopWidth) || 0;
    const bg = rgba(cs.backgroundColor);
    const hasBorder = bw >= 0.9 && brd && (brd.a == null ? 1 : brd.a) > 0.15 && distinct(over(brd, pbg), pbg);
    const hasFill = bg && (bg.a == null ? 1 : bg.a) > 0.12 && distinct(over(bg, pbg), pbg);
    const t = (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const found = [];
    if (!hasBorder && !hasFill) found.push('plain');
    if (!e.disabled && e.getAttribute('aria-disabled') !== 'true' && cs.cursor !== 'pointer') found.push('cursor:' + cs.cursor);
    if (found.length) looks.push({ sel: selOf(e), text: t, issues: found, size: innerWidth + 'x' + innerHeight });
  });
  res.looks = looks;
  looks.forEach((c) => res.issues.push('look ' + c.sel + ' "' + c.text + '" @' + c.size + ' ' + c.issues.join(',')));
  // Section heading hierarchy: size >= items in the section, weight >= 600
  const headPairs = [
    ['.qr-ck-gh th', '.qr-ck-tab td, .qr-ck-tab .qr-ck-l'],
    ['.qr-pgroup-h', '.qr-pgroup-body .pn, .qr-pgroup-body .qr-part'],
    ['.qr-block-title', '.qr-block-line'],
    ['.qr-panel-h', '.qr-tri-row, .qr-part, .qr-panel td'],
    ['.qr-cks > summary', '.qr-cks-tab td'],
    ['.qr-ck > summary', '.qr-ck-tab td, .qr-ck-items'],
    ['.qr-sec', '.qr-prob, .qr-sec + *'],
    ['.qr-hist-t th', '.qr-hist-t td'],
    ['.qr-cks-tab th', '.qr-cks-tab td'],
    ['.qr-catalog th', '.qr-catalog td'],
    ['.qr-field > label', '.qr-field input, .qr-field select, .qr-field .qr-input'],
    ['.qr-rc-sum', '.qr-rc-list, .qr-rc-note'],
    ['.qr-tri-sec .qr-panel-h', '.qr-tri-sec .qr-tri-row, .qr-tri-sec .qr-tri-open']
  ];
  const fw = (cs) => { const w = cs.fontWeight; return w === 'bold' ? 700 : w === 'normal' ? 400 : parseFloat(w) || 400; };
  headPairs.forEach(([hs, is]) => {
    document.querySelectorAll(hs).forEach((h) => {
      if (h.closest('.qr-proj-off')) return;
      const hcs = getComputedStyle(h); if (hcs.display === 'none') return;
      const scope = h.closest('.qr-ck-tab, .qr-pgroup, .qr-block, .qr-panel, .qr-cks, .qr-ck, .qr-hist-t, .qr-catalog, .qr-field, .qr-rc, .qr-tri-sec, .qr-cks-card, details, table') || h.parentElement;
      const items = [...(scope || document).querySelectorAll(is)].filter((el) => {
        if (el.closest('.qr-proj-off') || el === h || h.contains(el)) return false;
        const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
      });
      if (!items.length) return;
      const maxItem = Math.max(...items.map((el) => parseFloat(getComputedStyle(el).fontSize) || 0));
      const hsiz = parseFloat(hcs.fontSize) || 0;
      const t = (h.innerText || h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (hsiz + 0.05 < maxItem) res.issues.push('headingSize ' + selOf(h) + ' "' + t + '" ' + hsiz + '<' + maxItem);
      if (fw(hcs) < 600) res.issues.push('headingWeight ' + selOf(h) + ' "' + t + '" ' + fw(hcs));
    });
  });
  // Check header height (should be <=56px)
  const header = document.querySelector('.qr-wiz-head');
  if (header) {
    const hRect = header.getBoundingClientRect();
    res.headerHeight = Math.round(hRect.height);
    if (res.headerHeight > 56) res.issues.push('header too tall: ' + res.headerHeight + 'px > 56px');
  }
  // Check for large empty vertical regions in the top area (>24px unused band between header and content)
  const mainContent = document.querySelector('.qr-wiz-main');
  if (topbar && mainContent) {
    const topbarRect = topbar.getBoundingClientRect();
    const mainRect = mainContent.getBoundingClientRect();
    const firstChild = mainContent.querySelector(':scope > *:not(.qr-wiz-head)');
    if (firstChild) {
      const firstRect = firstChild.getBoundingClientRect();
      const gapToContent = firstRect.top - mainRect.top;
      res.topGap = Math.round(gapToContent);
      if (gapToContent > 24) res.issues.push('large gap above content: ' + Math.round(gapToContent) + 'px > 24px');
    }
    // Check rail-context height matches header
    const railContext = document.querySelector('.qr-rail-context');
    if (railContext && header) {
      const rcRect = railContext.getBoundingClientRect();
      res.railContextHeight = Math.round(rcRect.height);
      if (res.railContextHeight > 56) res.issues.push('rail context too tall: ' + res.railContextHeight + 'px > 56px');
    }
  }
  return res;
};
(async () => {
  const prof = path.join(out, 'layout_profile'); fs.rmSync(prof, { recursive: true, force: true }); fs.mkdirSync(prof, { recursive: true });
  fs.writeFileSync(path.join(prof, 'qr-settings.json'), JSON.stringify({ uiLanguage: 'en', firstRunDone: true, textSize: 'normal', palette: 'industrial-steel' }));
  const app = await _electron.launch({ executablePath: exe, args: appDir ? [appDir] : [], env: { ...process.env, QR_PROFILE_DIR: prof } });
  const win = await app.firstWindow();
  const size = (w, h, dpi = 1) => app.evaluate(({ BrowserWindow, webContents }, [w, h, dpi]) => {
    const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize();
    b.setContentBounds({ x: -30000, y: -30000, width: w, height: h }); // physical size w x h at display scale dpi: the page then sees (w / dpi) CSS pixels
    b.webContents.setZoomFactor(dpi);
  }, [w, h, dpi]);
  await win.waitForTimeout(2500); await size(1400, 900); await win.waitForTimeout(1200);
  if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const files = []; for (const d of DOCS) { const f = path.join(out, `SYN_${d.pn}_A.pdf`);
    const b64 = await app.evaluate(async ({ BrowserWindow }, h) => { const w = new BrowserWindow({ show: false }); await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h)); const b = await w.webContents.printToPDF({ pageSize: 'A4', landscape: true, margins: { marginType: 'none' } }); w.destroy(); return b.toString('base64'); }, d.html(d.pn));
    fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f); }
  await win.evaluate((f) => { window.__qrRun(f); }, files);
  await win.waitForFunction((n) => !document.querySelector('[data-testid=busy]') && (window.__qrParts || []).length >= n, files.length, { timeout: 240000 }); await sleep(800);
  const report = { idle: [], busy: [], scan: [], triage: [] }; let fail = 0; const QUICK = !!process.env.QUICK;
  const set = async (pal, lang) => { await win.evaluate((p) => window.__qrSetSettings && window.__qrSetSettings(p), { palette: pal, uiLanguage: lang }); await sleep(500); };
  // Test at different resolutions and DPI scales
  const DPI_TO_TEST = process.env.DPIS ? process.env.DPIS.split(',').map(Number) : QUICK ? [1] : DPI_SCALES;
  for (const lang of ['en', 'he']) for (const [w, h] of SIZES) for (const dpi of DPI_TO_TEST) {
    // Skip DPI variations for smaller screens (only test DPI on 1920+ widths)
    if (w < 1920 && dpi !== 1) continue;
    await size(w, h, dpi); await sleep(500);
    for (const pal of (QUICK ? ['industrial-steel'] : PALETTES)) {
      await set(pal, lang); await win.evaluate(() => window.__qrStep(4)); await sleep(500);
      const m = await win.evaluate(MEASURE);
      const r = { lang, size: w + 'x' + h, dpi, palette: pal, ...m, issues: [...new Set(m.issues)] };
      if (Math.abs(r.w - w / dpi) > 24) r.issues.push('window width ' + r.w + ' != ' + Math.round(w / dpi));
      if (r.hasTable) {
        const ex = await win.evaluate(() => { const b = document.querySelector('[data-testid=cks-expand]'); if (!b) return false; b.click(); return true; });
        await sleep(500);
        if (!ex) r.issues.push('no expand toggle');
        else {
          const m2 = await win.evaluate(MEASURE);
          r.expandedRow = { table: m2.table, wraps: m2.wraps, hscroll: m2.hscroll, abbreviations: m2.abbreviations, overlaps: m2.overlaps };
          if (!(m2.table && m2.table.expanded)) r.issues.push('expanded row did not open');
          m2.issues.forEach((x) => r.issues.push('expanded: ' + x));
          // Take screenshots at key resolutions
          if (!QUICK || (pal === 'industrial-steel' && dpi === 1)) {
            const shotName = `summary_${lang}_${w}x${h}_dpi${dpi}_${pal}.png`;
            await win.screenshot({ path: path.join(out, shotName) }).catch(() => {});
          }
          await win.evaluate(() => { const b = document.querySelector('[data-testid=cks-expand]'); if (b) b.click(); }); await sleep(300);
        }
        r.issues = [...new Set(r.issues)];
      }
      report.idle.push(r); if (r.issues.length || !r.hasTable) fail++;
    }
  }
  if (process.env.IDLE_ONLY) {
    report.fail = fail; fs.writeFileSync(path.join(out, 'layout_report.json'), JSON.stringify(report, null, 1));
    console.log(JSON.stringify({ idleChecked: report.idle.length, fail, bad: report.idle.filter((r) => r.issues.length).slice(0, 8).map((r) => ({ lang: r.lang, size: r.size, dpi: r.dpi, pal: r.palette, issues: r.issues.slice(0, 5) })) }, null, 1));
    await app.close().catch(() => {}); process.exit(fail ? 1 : 0);
  }
  // triage reason: one line, not truncated, at 1366x768 @100% and 1920x1080 @200%
  await set('industrial-steel', 'en');
  await win.evaluate(() => window.__qrStep(2));
  await sleep(700);
  const toNot = await win.$('[data-testid=tri-to-not]');
  if (toNot) { await toNot.click(); await sleep(250); }
  const TRI_SIZES = [[1366, 768, 1], [1920, 1080, 2]];
  for (const [w, h, dpi] of TRI_SIZES) {
    await size(w, h, dpi); await sleep(500);
    const m = await win.evaluate(() => {
      const issues = [];
      const why = [...document.querySelectorAll('[data-testid=tri-why]')];
      if (!why.length) issues.push('no triage reason cells');
      why.forEach((el) => {
        const cs = getComputedStyle(el);
        const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (cs.textOverflow === 'ellipsis' || (cs.overflow === 'hidden' && el.scrollWidth > el.clientWidth + 1)) issues.push('triage reason truncated: ' + t.slice(0, 48));
        const rg = document.createRange(); rg.selectNodeContents(el);
        const rows = new Set([...rg.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top / 3)));
        if (rows.size > 1) issues.push('triage reason wraps: ' + t.slice(0, 32));
      });
      const moved = document.querySelector('[data-testid=tri-moved]');
      if (moved) {
        const cs = getComputedStyle(moved);
        if (cs.textOverflow === 'ellipsis' && moved.scrollWidth > moved.clientWidth + 1) issues.push('moved badge truncated');
      }
      const hs = [];
      document.querySelectorAll('.qr-triage, .qr-tri-row, .qr-wiz-main').forEach((e) => { if (e.scrollWidth > e.clientWidth + 1) hs.push((e.className || '').toString().slice(0, 24) + ' ' + e.scrollWidth + '>' + e.clientWidth); });
      hs.forEach((x) => issues.push('h-scroll: ' + x));
      return { issues, nWhy: why.length, sample: why[0] && why[0].textContent, moved: !!(moved && moved.textContent) };
    });
    const r = { size: w + 'x' + h, dpi, ...m, issues: [...new Set(m.issues)] };
    report.triage.push(r); if (r.issues.length) fail++;
  }

  // other steps: any horizontal scrollbar at all, test all resolutions
  await set('industrial-steel', 'en');
  for (const lang of ['en', 'he']) for (const [w, h] of SIZES) {
    await size(w, h, 1); await sleep(400); await set('industrial-steel', lang);
    for (const st of [2, 3, 4]) {
      await win.evaluate((s) => { window.__qrStep(s); if (s === 2) window.__qrSelect && window.__qrSelect(0, 'drawing'); }, st); await sleep(900);
      const m = await win.evaluate(MEASURE);
      const clipIssues = (m.issues || []).filter((x) => /^clip /.test(x));
      report.scan.push({ lang, size: w + 'x' + h, step: st, hscroll: m.hscroll, wraps: m.wraps, overlaps: m.overlaps, clips: m.clips, printButton: m.printButton, savePdfButton: m.savePdfButton, issues: clipIssues });
      if (m.hscroll.length || m.wraps.length || (m.overlaps && m.overlaps.length) || clipIssues.length) fail++;
      // Check Print / Save PDF buttons are visible on each step
      if (!m.printButton) { report.scan[report.scan.length - 1].issues.push('Print button not visible'); fail++; }
      if (!m.savePdfButton) { report.scan[report.scan.length - 1].issues.push('Save PDF button not visible'); fail++; }
    }
  }
  // settings, history, file menu, package lists, route card, part card: clip scan at every size/DPI/palette/language
  report.clipScreens = [];
  const CLIP_SIZES = QUICK ? [[1920, 1080, 1]] : SIZES.flatMap(([w, h]) => (w >= 1920 ? DPI_SCALES : [1]).map((dpi) => [w, h, dpi]));
  const CLIP_PALS = QUICK ? ['industrial-steel'] : PALETTES;
  const SETTINGS_TABS = QUICK ? ['interface', 'processes', 'customers'] : ['interface', 'general', 'language', 'ocr', 'precision', 'materials', 'processes', 'customers', 'outlook', 'folders', 'updates', 'assistant'];
  for (const lang of ['en', 'he']) for (const [w, h, dpi] of CLIP_SIZES) for (const pal of CLIP_PALS) {
    await size(w, h, dpi); await set(pal, lang); await sleep(400);
    const closeUi = async () => {
      await win.evaluate(() => { document.querySelectorAll('.qr-modal-bg').forEach((e) => e.click()); });
      await win.keyboard.press('Escape').catch(() => {});
      await sleep(200);
    };
    const runClip = async (screen, open) => {
      await closeUi();
      await open(); await sleep(450);
      const m = await win.evaluate(MEASURE);
      const issues = (m.issues || []).filter((x) => /^clip /.test(x));
      const r = { screen, lang, palette: pal, size: w + 'x' + h, dpi, clips: m.clips, issues };
      report.clipScreens.push(r); if (issues.length) fail++;
    };
    await runClip('settings', async () => { const b = await win.$('[data-testid=btn-settings]'); if (b) await b.click({ force: true }); });
    for (const tab of SETTINGS_TABS) {
      await win.evaluate((k) => { window.__qrSettingsTab && window.__qrSettingsTab(k); }, tab);
      await sleep(250);
      const m = await win.evaluate(MEASURE);
      const issues = (m.issues || []).filter((x) => /^clip /.test(x));
      report.clipScreens.push({ screen: 'settings-' + tab, lang, palette: pal, size: w + 'x' + h, dpi, clips: m.clips, issues });
      if (issues.length) fail++;
    }
    await runClip('history', async () => { const b = await win.$('[data-testid=btn-history]'); if (b) await b.click({ force: true }); });
    await runClip('file-menu', async () => { const b = await win.$('[data-testid=btn-file]'); if (b) await b.click({ force: true }); });
    await closeUi();
    await win.evaluate(() => { window.__qrStep(2); });
    await sleep(500);
    await runClip('package-list', async () => {});
    await win.evaluate(() => { window.__qrStep(3); });
    await sleep(400);
    await runClip('docs-list', async () => {});
    await win.evaluate(() => { window.__qrStep(2); window.__qrSelect && window.__qrSelect(0, 'route'); });
    await sleep(700);
    await runClip('route-card', async () => {});
    await win.evaluate(() => { window.__qrSelect && window.__qrSelect(0, 'drawing'); });
    await sleep(400);
    await runClip('part-card', async () => {});
    await closeUi();
  }

  // job tabs: 4 / 8 / 15 chips at 1366×768 @100% and 1920×1080 @200% — one-row header, visible ×, overflow to More
  report.tabs = [];
  await set('industrial-steel', 'en');
  const TAB_SIZES = [[1366, 768, 1], [1920, 1080, 2]];
  const tabCount = () => win.evaluate(() => ((window.__qrTabs && window.__qrTabs()) || []).length);
  for (const n of [4, 8, 15]) {
    for (let i = await tabCount(); i < n; i++) { await win.evaluate(() => window.__qrAddTab()); await sleep(80); }
    for (let i = await tabCount(); i > n; i--) {
      await win.evaluate(() => { const tabs = (window.__qrTabs && window.__qrTabs()) || []; if (tabs.length) window.__qrCloseTab(tabs[tabs.length - 1].id); });
      await sleep(80);
    }
    await sleep(400);
    for (const [w, h, dpi] of TAB_SIZES) {
      await size(w, h, dpi); await sleep(500);
      const m = await win.evaluate(MEASURE);
      const extra = await win.evaluate(async () => {
        const issues = [];
        const more = document.querySelector('[data-testid=tab-more]');
        const nShown = document.querySelectorAll('.qr-ptabs [data-testid=tab]').length;
        const nAll = (window.__qrTabs && window.__qrTabs().length) || nShown;
        if (nAll > nShown && !more) issues.push('More jobs missing with ' + nAll + ' tabs, ' + nShown + ' shown');
        if (more) {
          more.click(); await new Promise((r) => setTimeout(r, 150)); // the menu renders on the next tick
          const items = [...document.querySelectorAll('[data-testid=tab-more-item]')];
          const xs = [...document.querySelectorAll('[data-testid=tab-more-close]')];
          if (!items.length) issues.push('More jobs menu empty');
          if (xs.length !== items.length) issues.push('More jobs close × count ' + xs.length + ' != items ' + items.length);
          xs.forEach((b) => {
            const cs = getComputedStyle(b);
            if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 1) issues.push('More jobs × not visible');
            const rg = document.createRange(); rg.selectNodeContents(b);
            const gr = rg.getBoundingClientRect();
            if (gr.width < 4 || gr.height < 4) issues.push('More jobs × glyph size ' + Math.round(gr.width) + 'x' + Math.round(gr.height));
          });
          document.body.click();
        }
        return { issues, nShown, nAll, more: !!more };
      });
      const r = { n, size: w + 'x' + h, dpi, topbarHeight: m.topbarHeight, tabCloses: m.tabCloses, ...extra, issues: [...new Set([...(m.issues || []), ...(extra.issues || [])])] };
      report.tabs.push(r); if (r.issues.length) fail++;
    }
  }

  // busy state (re-analysis running on Summary), once per palette at 1280x800 EN, plus HE
  await size(1280, 800);
  for (const [lang, pals] of (QUICK ? [] : [['en', PALETTES], ['he', ['industrial-steel']]])) for (const pal of pals) { await set(pal, lang); await win.evaluate(() => window.__qrStep(4)); await sleep(400);
    await win.evaluate((f) => { window.__qrRun(f); }, files); let seen = false; for (let i = 0; i < 40 && !seen; i++) { await sleep(150); seen = !!(await win.$('[data-testid=busy]')); }
    await sleep(500); const m = await win.evaluate(MEASURE); const r = { lang, palette: pal, busySeen: seen, ...m, issues: [...new Set(m.issues)] }; if (!seen) r.issues.push('busy state not reached'); report.busy.push(r); if (r.issues.length) fail++;
    if (pal === 'industrial-steel' || lang === 'en') await win.screenshot({ path: path.join(out, `busy_${lang}_${pal}.png`) });
    await win.waitForFunction(() => !document.querySelector('[data-testid=busy]'), null, { timeout: 240000 }).catch(() => {}); await sleep(600); }
  report.fail = fail; fs.writeFileSync(path.join(out, 'layout_report.json'), JSON.stringify(report, null, 1));
  const bad = [...report.idle, ...report.busy, ...(report.tabs || [])].filter((r) => r.issues.length || (r.hasTable === false));
  const scanBad = report.scan.filter((s) => s.hscroll.length || s.wraps.length || (s.overlaps && s.overlaps.length) || s.issues);
  console.log(JSON.stringify({
    idleChecked: report.idle.length, busyChecked: report.busy.length, scanChecked: report.scan.length, triageChecked: report.triage.length, tabsChecked: (report.tabs || []).length, fail,
    sizes: SIZES.map((s) => s.join('x')), dpiScales: DPI_SCALES,
    bad: bad.slice(0, 12).map((r) => ({ lang: r.lang, size: r.size, dpi: r.dpi, pal: r.palette, hasTable: r.hasTable, issues: r.issues.slice(0, 5) })),
    minContrast: Math.min(...report.idle.concat(report.busy).filter((r) => r.minContrast).map((r) => r.minContrast)),
    scanBad: scanBad.slice(0, 8).map((s) => ({ lang: s.lang, size: s.size, step: s.step, issues: s.issues, hscroll: s.hscroll.length, wraps: s.wraps.length, overlaps: (s.overlaps || []).length })),
    printButtonVisible: report.scan.every((s) => s.printButton),
    savePdfButtonVisible: report.scan.every((s) => s.savePdfButton),
    clipScreens: (report.clipScreens || []).length,
    clipFails: (report.clipScreens || []).filter((r) => r.issues && r.issues.length).length
  }, null, 1));
  await app.close().catch(() => {}); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
