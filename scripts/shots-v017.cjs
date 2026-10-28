// v0.1.5 UI checks + shots (SYNTHETIC only, no customer data): header HE/EN, select close-ups + DOM audit of every select in Settings,
// single Settings language (en/he/ru) in the tour, dragged tour card (drag, clamp, persisted, double-click reset).
// Usage: node scripts/shots-v017.cjs <QR.exe> <outDir>   (QR_APP=<app dir> to run the dev build)
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const LOG = path.join(out, 'v017_log.txt'); const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok   ' : 'FAIL ', m); if (!c) bad++; };
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  const size = async () => { await app.evaluate(({ BrowserWindow }) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: 1280, height: 800 }); }); await win.waitForTimeout(600); };
  await size(); await win.waitForTimeout(900);
  if (await win.$('[data-testid=first-run]')) { ok(!(await win.$('[data-testid=first-run] select')), 'first-run tour has no select'); await win.click('[data-testid=first-run-ok]'); }
  const p = (n) => path.join(out, `v017_${n}.png`);
  const setL = async (l) => { await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x === 'ru' ? 'en' : x, assistantLanguage: x, textSize: 'normal' }), l); await win.waitForTimeout(400); };
  const rect = (sel) => win.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
  // 1. header HE / EN
  await size();
  for (const l of ['he', 'en']) { await setL(l); await win.waitForTimeout(300); await win.screenshot({ path: p(`header_${l}`), clip: { x: 0, y: 0, width: 1280, height: 260 } }); }
  // 2. select audit + close-ups in every Settings tab, HE and EN
  for (const l of ['he', 'en']) {
    await size(); await setL(l); await win.click('[data-testid=btn-settings]'); await win.waitForSelector('[data-testid=settings-dialog]');
    const tabs = await win.$$('.qr-settings-tab'); let nsel = 0;
    for (let ti = 0; ti < tabs.length; ti++) {
      await (await win.$$('.qr-settings-tab'))[ti].click(); await win.waitForTimeout(200);
      const res = await win.evaluate(() => Array.from(document.querySelectorAll('[data-testid=settings-dialog] select')).filter((s) => s.offsetParent).map((s) => {
        const cs = getComputedStyle(s); const o = s.options[s.selectedIndex]; const c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const txt = c.measureText(o ? o.text : '').width; const avail = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return { id: s.getAttribute('data-testid') || s.className, dir: cs.direction, fs: parseFloat(cs.fontSize), pe: parseFloat(cs.paddingInlineEnd), txt: Math.round(txt), avail: Math.round(avail), pos: cs.backgroundPositionX };
      }));
      for (const r of res) { nsel++; ok(r.pe >= r.fs * 1.6 && r.txt <= r.avail + 1, `${l} tab${ti} select ${r.id}: dir=${r.dir} padding-inline-end=${r.pe}px (font ${r.fs}px) text ${r.txt}px <= free ${r.avail}px, arrow x=${r.pos}`); }
      if (ti === 0) {
        await win.screenshot({ path: p(`settings_${l}`) });
        const r = await rect('[data-testid=ui-lang]'); await win.screenshot({ path: p(`select_${l}`), clip: { x: Math.max(0, r.x - 30), y: Math.max(0, r.y - 14), width: r.w + 60, height: r.h + 28 } });
      }
    }
    ok(nsel > 3, `${l}: audited ${nsel} selects across ${tabs.length} Settings tabs`);
    await (await win.$$('.qr-settings-tab'))[0].click();
    // v0.1.5 (7:16): the UI language is en/he only; Russian lives in the Assistant language
    ok((await win.$$eval('[data-testid=ui-lang] option', (o) => o.map((x) => x.value))).join() === 'en,he', `${l}: UI language offers only en/he`);
    await win.click('[data-testid=stab-assistant]'); await win.waitForTimeout(200);
    ok((await win.$$eval('[data-testid=assistant-lang] option', (o) => o.map((x) => x.value))).includes('ru'), `${l}: the Assistant language offers Russian`);
    await win.keyboard.press('Escape'); const x = await win.$('[data-testid=settings-dialog]'); if (x) await win.click('[data-testid=settings-dialog] >> text=/Cancel|ביטול/').catch(() => {});
    await win.waitForTimeout(300);
  }
  await size();
  // 3. the tour follows the single Settings language
  const titles = {};
  for (const l of ['en', 'he', 'ru']) {
    await setL(l); await win.click('[data-testid=btn-help]'); await win.waitForSelector('[data-testid=tutorial-card]');
    const info = await win.evaluate(() => { const c = document.querySelector('[data-testid=tutorial-card]'); return { dir: c.getAttribute('dir'), lang: c.getAttribute('lang'), title: document.querySelector('[data-testid=tutorial-title]').textContent, sel: c.querySelectorAll('select').length }; });
    titles[l] = info.title; console.log('tour', l, JSON.stringify(info));
    ok(info.sel === 0 && !(await win.$('[data-testid=tutorial] select')), `${l}: no language select in the tour`);
    ok(l === 'he' ? info.dir === 'rtl' : info.dir === 'ltr', `${l}: tour direction ${info.dir}`);
    ok(l === 'he' ? /[\u0590-\u05ff]/.test(info.title) : l === 'ru' ? /[\u0400-\u04ff]/.test(info.title) : /^[\x20-\x7e]+$/.test(info.title.replace(/[\u2013\u2014\u2019\u00b7]/g, '')), `${l}: tour title is in ${l}: ${info.title}`);
    await win.screenshot({ path: p(`tour_${l}`) });
    await win.click('[data-testid=tutorial-skip]');
  }
  // 4. drag the tour card
  await size();
  await setL('he'); await win.click('[data-testid=btn-help]'); await win.waitForSelector('[data-testid=tutorial-card]');
  const c0 = await rect('[data-testid=tutorial-card]'); const h0 = await rect('[data-testid=tutorial-head]');
  const gx = h0.x + 24, gy = h0.y + h0.h / 2; // grab point on the header, away from any control
  const drag = async (dx, dy) => { await win.mouse.move(gx, gy); await win.mouse.down(); await win.mouse.move(gx + dx / 2, gy + dy / 2, { steps: 6 }); await win.mouse.move(gx + dx, gy + dy, { steps: 6 }); await win.mouse.up(); await win.waitForTimeout(300); };
  await drag(-220, 180); const c1 = await rect('[data-testid=tutorial-card]'); await win.screenshot({ path: p('tour_dragged') });
  ok(Math.abs(c1.x - (c0.x - 220)) <= 2 && Math.abs(c1.y - (c0.y + 180)) <= 2, `drag moves the card by the pointer delta (${c0.x},${c0.y}) -> (${c1.x},${c1.y})`);
  await win.mouse.move(c1.x + 24, c1.y + 14); await win.mouse.down(); await win.mouse.move(-4000, -4000, { steps: 8 }); await win.mouse.up(); await win.waitForTimeout(300);
  const c2 = await rect('[data-testid=tutorial-card]'); ok(c2.x >= 0 && c2.y >= 0, `dragging far outside the window is clamped: (${c2.x},${c2.y})`);
  await win.screenshot({ path: p('tour_clamped') });
  console.log('viewport', await win.evaluate(() => [window.innerWidth, window.innerHeight, devicePixelRatio, document.documentElement.clientWidth]));
  const h2 = await rect('[data-testid=tutorial-head]'); await win.mouse.move(h2.x + 24, h2.y + h2.h / 2); await win.mouse.down(); await win.mouse.move(2000, 1500, { steps: 8 }); await win.mouse.up(); await win.waitForTimeout(300);
  const c3 = await rect('[data-testid=tutorial-card]'); ok(c3.x + c3.w <= (await win.evaluate(() => innerWidth)) && c3.y + c3.h <= (await win.evaluate(() => innerHeight)), `clamped at the bottom-right too: right=${c3.x + c3.w} bottom=${c3.y + c3.h}`);
  const h3 = await rect('[data-testid=tutorial-head]'); await win.mouse.move(h3.x + 24, h3.y + h3.h / 2); await win.mouse.down(); await win.mouse.move(h3.x - 200, h3.y - 150, { steps: 8 }); await win.mouse.up(); await win.waitForTimeout(500);
  const c4 = await rect('[data-testid=tutorial-card]');
  const saved = await win.evaluate(() => window.qr.getSettings().then((s) => s.floatPos));
  ok(saved && Object.keys(saved).length > 0, 'position saved in settings: ' + JSON.stringify(saved));
  await win.click('[data-testid=tutorial-skip]'); await win.click('[data-testid=btn-help]'); await win.waitForSelector('[data-testid=tutorial-card]'); await win.waitForTimeout(500);
  const c5 = await rect('[data-testid=tutorial-card]'); ok(Math.abs(c5.x - c4.x) <= 2 && Math.abs(c5.y - c4.y) <= 2, `position remembered after reopening (${c4.x},${c4.y}) -> (${c5.x},${c5.y})`);
  const h5 = await rect('[data-testid=tutorial-head]'); await win.mouse.dblclick(h5.x + 24, h5.y + h5.h / 2); await win.waitForTimeout(400);
  const c6 = await rect('[data-testid=tutorial-card]'); ok(Math.abs(c6.x - c0.x) <= 2 && Math.abs(c6.y - c0.y) <= 2, `double-click on the header resets (${c6.x},${c6.y}) vs original (${c0.x},${c0.y})`);
  await win.screenshot({ path: p('tour_reset' ) });
  // the window itself must also work: the select-in-tour check when sized small
  await win.click('[data-testid=tutorial-skip]');
  await win.evaluate(() => window.qr.setFloatPos('tour', null));
  fs.writeFileSync(path.join(out, 'v017_report.txt'), `titles ${JSON.stringify(titles)}\nfailures ${bad}\n`);
  console.log(bad ? 'V017FAIL ' + bad : 'V017OK'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
