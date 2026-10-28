// Checks the in-app tutorial video player on a built (unpacked) QR: buttons, playback, seek, chapters, subtitles, unavailable language, tour card. Saves 3 stills.
// Usage: node scripts/shots-video.cjs <QR.exe> <outDir>   (own userData in <outDir>/profile; never the installed copy)
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const LOG = path.join(out, 'video_log.txt'); const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok   ' : 'FAIL ', m); if (!c) bad++; };
(async () => {
  const app = await _electron.launch({ executablePath: exe, env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow(); await win.waitForTimeout(2500);
  await app.evaluate(({ BrowserWindow }) => { const b = BrowserWindow.getAllWindows()[0]; b.setSkipTaskbar(true); b.setFullScreen(false); b.unmaximize(); b.setMinimumSize(800, 600); b.setContentBounds({ x: -30000, y: -30000, width: 1280, height: 800 }); }); await win.waitForTimeout(1500);
  ok((await win.evaluate(() => innerWidth)) === 1280, 'viewport 1280');
  if (await win.$('[data-testid=first-run]')) await win.click('[data-testid=first-run-ok]').catch(() => {});
  const set = (o) => win.evaluate((x) => window.__qrSetSettings(x), { uiLanguage: 'he', textSize: 'normal', palette: 'industrial-steel', ...o });
  await set({ assistantLanguage: 'he' }); await win.waitForTimeout(600);
  const st = (sel) => win.evaluate((s) => { const e = document.querySelector(s); return e ? { unavailable: e.getAttribute('data-unavailable'), title: e.title, text: e.textContent } : null; }, sel);
  // resources
  const res = await app.evaluate(({ app }) => app.isPackaged ? process.resourcesPath : ''); const fsx = require('fs');
  console.log('resourcesPath', res || '(not packaged)'); if (res) ok(fsx.existsSync(path.join(res, 'tutorial', 'he', 'qr-tutorial.mp4')) && fsx.existsSync(path.join(res, 'tutorial', 'manifest.json')), 'video bundled in resources/tutorial');
  // Settings > Assistant
  await win.click('[data-testid=btn-settings]'); await win.click('[data-testid=stab-assistant]'); await win.waitForSelector('[data-testid=settings-watch-video]');
  let b = await st('[data-testid=settings-watch-video]'); let tipOk = ''; console.log('settings button', JSON.stringify(b)); await win.waitForTimeout(500); b = await st('[data-testid=settings-watch-video]'); tipOk = b.title;
  ok(b && b.text === '\u05e6\u05e4\u05d4 \u05d1\u05e1\u05e8\u05d8\u05d5\u05df' && !b.unavailable && b.title, 'Settings > Assistant: Watch video button available with a tooltip (' + (b && b.title) + ')');
  await win.screenshot({ path: path.join(out, 'video_settings_assistant.png') });
  await win.click('[data-testid=settings-watch-video]'); await win.waitForSelector('[data-testid=video-player]');
  await win.waitForFunction(() => { const v = document.querySelector('[data-testid=video-el]'); return v && v.readyState >= 1; }, null, { timeout: 15000 });
  const meta = await win.evaluate(() => { const v = document.querySelector('[data-testid=video-el]'); return { w: v.videoWidth, h: v.videoHeight, d: v.duration, err: !!v.error, }; });
  console.log('meta', JSON.stringify(meta)); ok(meta.w === 1280 && meta.h === 800 && !meta.err && meta.d > 100, 'H.264/AAC mp4 decodes in the app: ' + meta.w + 'x' + meta.h + ' ' + Math.round(meta.d) + 's');
  await win.click('[data-testid=video-play]'); await win.waitForSelector('[data-testid=video-cue]', { timeout: 8000 }); const cueTxt = await win.textContent('[data-testid=video-cue]'); ok(/[\u0590-\u05ff]/.test(cueTxt), 'Hebrew subtitle visible by default: ' + cueTxt.length + ' chars'); await win.click('[data-testid=video-play]');
  const nch = await win.$$eval('[data-testid=video-chapter]', (a) => a.length); ok(nch === 8, 'chapters list: ' + nch);
  const allTitled = await win.$$eval('.qr-vid button', (a) => a.every((x) => x.title)); ok(allTitled, 'every player button has a tooltip');
  const fonts = await win.evaluate(() => { const fam = new Set(), sz = new Set(); document.querySelectorAll('.qr-vid, .qr-vid *').forEach((e) => { if (e.tagName === 'VIDEO' || e.tagName === 'TRACK' || e.tagName === 'INPUT') return; if (!(e.textContent || '').trim() && !e.title) return; const c = getComputedStyle(e); fam.add(c.fontFamily); sz.add(c.fontSize); }); return { fam: [...fam], sz: [...sz] }; });
  console.log('fonts', JSON.stringify(fonts)); ok(fonts.fam.length === 1, 'one font family in the player'); ok(fonts.sz.every((s) => ['14px', '14.25px', '16.625px', '19px'].includes(s)), 'token sizes only: ' + fonts.sz.join(','));
  const cur = () => win.evaluate(() => { const v = document.querySelector('[data-testid=video-el]'); return { t: v.currentTime, paused: v.paused, label: document.querySelector('[data-testid=video-time]').textContent, active: [...document.querySelectorAll('[data-testid=video-chapter]')].findIndex((e) => e.getAttribute('data-active') === 'true') }; });
  await win.click('[data-testid=video-chapter] >> nth=2'); await win.waitForTimeout(2800); let c = await cur(); console.log('after chapter 3', JSON.stringify(c));
  ok(c.t > 33.3 && c.t < 40 && !c.paused && c.active === 2, 'chapter click seeks to step 3 and plays'); ok(/^0:3\d \/ 2:02$/.test(c.label), 'time label ' + c.label);
  await win.screenshot({ path: path.join(out, 'video_still_1.png') });
  await win.click('[data-testid=video-play]'); await win.waitForTimeout(400); c = await cur(); const tp = c.t; await win.waitForTimeout(800); const c2 = await cur(); ok(c.paused && Math.abs(c2.t - tp) < 0.05, 'pause stops playback');
  ok((await win.getAttribute('[data-testid=video-play]', 'data-playing')) === 'false', 'play button state'); await win.click('[data-testid=video-play]'); await win.waitForTimeout(700); c = await cur(); ok(!c.paused && c.t > tp, 'play resumes');
  await win.evaluate(() => { const r = document.querySelector('[data-testid=video-seek]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(r, '70'); r.dispatchEvent(new Event('input', { bubbles: true })); }); await win.waitForTimeout(600); c = await cur(); ok(c.t >= 69.9 && c.t < 73 && c.active === 4, 'seek bar jumps to 70s (step 5): ' + c.t.toFixed(1) + ' active ' + c.active);
  await win.click('[data-testid=video-subs]'); await win.waitForTimeout(300); ok(!(await win.$('[data-testid=video-cue]')), 'subtitles toggle off'); await win.screenshot({ path: path.join(out, 'video_subs_off.png') });
  await win.click('[data-testid=video-subs]'); await win.waitForTimeout(300); ok(!!(await win.$('[data-testid=video-cue]')), 'subtitles toggle on');
  await win.click('[data-testid=video-chapter] >> nth=4'); await win.waitForTimeout(3000); await win.screenshot({ path: path.join(out, 'video_still_2.png') });
  await win.click('[data-testid=video-chapter] >> nth=6'); await win.waitForTimeout(3000); await win.screenshot({ path: path.join(out, 'video_still_3.png') });
  await win.keyboard.press('Escape'); await win.waitForTimeout(400); ok(!(await win.$('[data-testid=video-player]')), 'Esc closes the player'); ok(!!(await win.$('[data-testid=settings-about]')) || !!(await win.$('[data-testid=stab-assistant]')), 'Settings stays open under it');
  // unavailable language: no fallback to Hebrew
  await win.selectOption('[data-testid=assistant-lang]', 'en'); await win.waitForTimeout(700); b = await st('[data-testid=settings-watch-video]'); console.log('en button', JSON.stringify(b));
  ok(b && b.unavailable === 'true' && b.title && b.title !== tipOk, 'English assistant: button marked unavailable with an explanation');
  await win.click('[data-testid=settings-watch-video]', { force: true }); await win.waitForTimeout(300); ok(!(await win.$('[data-testid=video-player]')), 'unavailable button does not open a video in another language');
  await win.selectOption('[data-testid=assistant-lang]', 'he'); await win.waitForTimeout(700);
  // tutorial card
  await win.click('[data-testid=restart-tour]'); await win.waitForSelector('[data-testid=tutorial-card]'); await win.waitForSelector('[data-testid=tour-watch-video]'); await win.waitForTimeout(600);
  b = await st('[data-testid=tour-watch-video]'); console.log('tour button', JSON.stringify(b)); ok(b && !b.unavailable && b.title && b.text === '\u05e6\u05e4\u05d4 \u05d1\u05e1\u05e8\u05d8\u05d5\u05df', 'tutorial card has the Watch video button');
  const card = await win.evaluate(() => { const r = document.querySelector('[data-testid=tutorial-card]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; }); ok(card.top >= 0 && card.bottom <= card.vh, 'tutorial card fits the window ' + JSON.stringify(card));
  await win.screenshot({ path: path.join(out, 'video_tour_card.png') });
  await win.click('[data-testid=tour-watch-video]'); await win.waitForSelector('[data-testid=video-player]'); await win.keyboard.press('Escape'); await win.waitForTimeout(400);
  ok(!(await win.$('[data-testid=video-player]')) && !!(await win.$('[data-testid=tutorial-card]')), 'Esc closes only the player, the tutorial stays');
  await app.close(); console.log(bad ? 'FAILED ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('ERR', e.stack || e.message); process.exit(2); });