// Version label checks + shots: header text, window title, Settings About, AA contrast, LTR in Hebrew. Usage: node scripts/shots-version.cjs <QR.exe> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const LOG = path.join(out, 'version_log.txt'); const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok   ' : 'FAIL ', m); if (!c) bad++; };
const want = 'v' + require('../package.json').version;
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: process.env.QR_APP ? [process.env.QR_APP] : [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.unmaximize(); b.setContentBounds({ x: -30000, y: -30000, width: 1280, height: 800 }); }); await win.waitForTimeout(900);
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const title = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle()); ok(title === 'QR ' + want, `window title "${title}"`);
  const appVer = await app.evaluate(({ app }) => app.getVersion()); ok('v' + appVer === want, `app.getVersion() ${appVer} matches package.json`);
  for (const l of ['en', 'he']) {
    await win.evaluate((x) => window.__qrSetSettings({ uiLanguage: x, assistantLanguage: x, textSize: 'normal', palette: 'industrial-steel' }), l); await win.waitForTimeout(500);
    await win.waitForSelector('[data-testid=app-version]'); const r = await win.evaluate(() => {
      const e = document.querySelector('[data-testid=app-version]'); const cs = getComputedStyle(e); const p = (c) => c.match(/[\d.]+/g).map(Number);
      let bg = [255, 255, 255, 0], n = e; const over = (top, under) => { const a = top[3] == null ? 1 : top[3]; return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)); }; const chain = []; while (n) { const c = p(getComputedStyle(n).backgroundColor); if (c[3] !== 0) chain.push(c); n = n.parentElement; }
      let base = [255, 255, 255]; for (const c of chain.reverse()) base = over(c.length === 3 ? [...c, 1] : c, base);
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const fg = over(p(cs.color).length === 3 ? [...p(cs.color), 1] : p(cs.color), base); const L1 = lum(fg), L2 = lum(base); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const b = e.getBoundingClientRect(); const tb = document.querySelector('.qr-topbar').getBoundingClientRect(); const badge = document.querySelector('.qr-brand-badge').getBoundingClientRect();
      return { text: e.textContent, dir: e.getAttribute('dir'), ratio: Math.round(ratio * 100) / 100, size: cs.fontSize, tip: e.title, inBar: b.top >= tb.top && b.bottom <= tb.bottom, beside: Math.abs((b.top + b.bottom) / 2 - (badge.top + badge.bottom) / 2) < 12, buttons: document.querySelectorAll('.qr-topbar .mrt-topbar-cmd').length };
    }); console.log(l, JSON.stringify(r));
    ok(r.text === want && r.dir === 'ltr', `${l}: header shows ${r.text} (dir ${r.dir})`); ok(r.ratio >= 4.5, `${l}: contrast ${r.ratio} (AA needs 4.5)`); ok(r.inBar && r.beside, `${l}: next to the app name inside the top bar`); ok(parseFloat(r.size) <= 13, `${l}: small (${r.size})`);
    await win.screenshot({ path: path.join(out, `ver_${l}_header.png`), clip: { x: 0, y: 0, width: 1280, height: 70 } });
    await win.click('[data-testid=btn-settings]'); await win.waitForSelector('[data-testid=settings-about]'); const ab = await win.evaluate(() => document.querySelector('[data-testid=settings-about]').textContent); ok(ab.includes(want), `${l}: Settings About shows ${ab}`); await win.screenshot({ path: path.join(out, `ver_${l}_settings.png`) });
    await win.keyboard.press('Escape'); await win.waitForTimeout(300); if (await win.$('[data-testid=settings-about]')) await win.click('[data-testid=settings-dialog] >> text=/Cancel|ביטול/').catch(() => {}); await win.waitForTimeout(300);
  }
  await app.close().catch(() => {}); console.log(bad ? `FAILED ${bad}` : 'ALL OK'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('CRASH', e && e.stack || e); process.exit(2); });
