'use strict';
// Tutorial video: manifest/chapters/VTT helpers, the real bundled video + captions, the main-process loader, and the wiring (Tour card, Settings > Assistant, IPC, packaging).
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const root = path.join(__dirname, '..'); const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, '');
const TUT = path.join(root, 'assets', 'tutorial');
const lib = () => import('../src/video/manifest.mjs');
const manifest = () => JSON.parse(fs.readFileSync(path.join(TUT, 'manifest.json'), 'utf8'));

test('pickVideo: only the exact language, never a fallback to another one', async () => {
  const { pickVideo } = await lib(); const m = manifest();
  assert.ok(pickVideo(m, 'he')); assert.strictEqual(pickVideo(m, 'en'), null); assert.strictEqual(pickVideo(m, 'ru'), null);
  assert.strictEqual(pickVideo(m, '../he'), null); assert.strictEqual(pickVideo(null, 'he'), null); assert.strictEqual(pickVideo({ videos: { he: {} } }, 'he'), null);
});
test('chapterAt / fmtTime / parseVtt helpers', async () => {
  const { chapterAt, fmtTime, parseVtt, parseVttTime } = await lib(); const ch = [{ t: 0, title: 'a' }, { t: 10, title: 'b' }, { t: 25.5, title: 'c' }];
  assert.deepStrictEqual([0, 9.99, 10, 25.4, 25.5, 99].map((t) => chapterAt(ch, t)), [0, 0, 1, 1, 2, 2]);
  assert.deepStrictEqual([0, 5.9, 61, 600].map(fmtTime), ['0:00', '0:05', '1:01', '10:00']);
  assert.strictEqual(parseVttTime('00:01:02.500'), 62.5); assert.ok(Number.isNaN(parseVttTime('1.5')));
  assert.deepStrictEqual(parseVtt('WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.500\nhello\nworld\n'), [{ start: 1, end: 2.5, text: 'hello\nworld' }]);
  assert.throws(() => parseVtt('nope')); assert.throws(() => parseVtt('WEBVTT\n\n00:00:03.000 --> 00:00:02.000\nx\n'));
});
test('validateEntry catches bad manifests', async () => {
  const { validateEntry } = await lib(); const ok = { file: 'he/a.mp4', captions: 'he/a.vtt', duration: 30, chapters: [{ t: 0, title: 'a' }, { t: 10, title: 'b' }] };
  assert.deepStrictEqual(validateEntry(ok), []);
  assert.ok(validateEntry({ ...ok, chapters: [{ t: 1, title: 'a' }] }).length); assert.ok(validateEntry({ ...ok, chapters: [{ t: 0, title: 'a' }, { t: 0, title: 'b' }] }).length);
  assert.ok(validateEntry({ ...ok, chapters: [{ t: 0, title: 'a' }, { t: 40, title: 'b' }] }).length); assert.ok(validateEntry({ ...ok, file: 'a.avi' }).length); assert.ok(validateEntry({ ...ok, duration: 0 }).length);
});
test('the bundled Hebrew video: files exist, size < 30 MB, 2-4 min, chapters = steps, captions valid and inside the duration', async () => {
  const { validateEntry, parseVtt } = await lib(); const v = manifest().videos.he; const S = require('../scripts/tutorial/he.cjs');
  assert.deepStrictEqual(validateEntry(v), []); const mp4 = path.join(TUT, v.file); assert.ok(fs.existsSync(mp4));
  assert.ok(fs.statSync(mp4).size < 30 * 1024 * 1024, 'under 30 MB'); assert.ok(v.duration >= 120 && v.duration <= 240, 'duration ' + v.duration);
  assert.strictEqual(v.chapters.length, S.steps.length); assert.strictEqual(v.dir, 'rtl');
  v.chapters.forEach((c, i) => assert.ok(c.title.startsWith(S.stepWord + ' ' + (i + 1) + ':'), c.title));
  const cues = parseVtt(fs.readFileSync(path.join(TUT, v.captions), 'utf8')); assert.ok(cues.length >= S.steps.length);
  cues.forEach((c, i) => { assert.ok(c.end <= v.duration + 0.5, 'cue inside video'); assert.ok(/[\u0590-\u05ff]/.test(c.text), 'Hebrew cue'); if (i) assert.ok(c.start >= cues[i - 1].end - 0.001, 'cues do not overlap'); });
  v.chapters.forEach((c, i) => assert.ok(cues.some((q) => q.start >= c.t && q.start < (v.chapters[i + 1] ? v.chapters[i + 1].t : v.duration)), 'every step has captions: ' + i));
  const ffm = fs.readFileSync(mp4).subarray(0, 64).toString('latin1'); assert.ok(ffm.includes('ftyp'), 'mp4 container');
});
test('the demo video carries no customer names and no prices (synthetic DEMO parts only)', () => {
  const S = require('../scripts/tutorial/he.cjs'); const text = JSON.stringify(S) + fs.readFileSync(path.join(TUT, 'he/qr-tutorial.vtt'), 'utf8') + JSON.stringify(manifest());
  assert.ok(!/rafael|elta|elbit|\bkla\b|\u05e8\u05e4\u05d0\u05dc|\u05de\u05d7\u05d9\u05e8|\u05d4\u05e6\u05e2\u05ea/i.test(text));
});
test('main-process loader returns file URL + captions text for he, null for missing languages and escapes', async () => {
  const { loadTutorialVideo } = require('../electron/tutorial.cjs');
  const v = await loadTutorialVideo(TUT, 'he'); assert.ok(v && /^file:\/\/\//.test(v.src) && /qr-tutorial\.mp4$/.test(v.src)); assert.ok(v.vtt.startsWith('WEBVTT')); assert.strictEqual(v.dir, 'rtl'); assert.ok(v.chapters.length === 8 && v.duration > 100);
  assert.strictEqual(await loadTutorialVideo(TUT, 'en'), null); assert.strictEqual(await loadTutorialVideo(TUT, '../x'), null); assert.strictEqual(await loadTutorialVideo(path.join(TUT, 'nope'), 'he'), null);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qrv-')); // manifest pointing outside the root, and a listed file that is missing
  fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ version: 1, videos: { he: { file: '../evil.mp4', captions: 'a.vtt', duration: 10, chapters: [{ t: 0, title: 'a' }] }, en: { file: 'en/x.mp4', captions: 'en/x.vtt', duration: 10, chapters: [{ t: 0, title: 'a' }] } } }));
  assert.strictEqual(await loadTutorialVideo(tmp, 'he'), null); assert.strictEqual(await loadTutorialVideo(tmp, 'en'), null);
});
test('a second language only needs files + a manifest entry (structure ready for EN/RU)', async () => {
  const { loadTutorialVideo } = require('../electron/tutorial.cjs'); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qrv-')); fs.mkdirSync(path.join(tmp, 'en'));
  fs.writeFileSync(path.join(tmp, 'en/x.mp4'), 'x'); fs.writeFileSync(path.join(tmp, 'en/x.vtt'), 'WEBVTT\n\n');
  fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ version: 1, videos: { en: { file: 'en/x.mp4', captions: 'en/x.vtt', duration: 10, chapters: [{ t: 0, title: 'Step 1' }] } } }));
  const v = await loadTutorialVideo(tmp, 'en'); assert.ok(v); assert.strictEqual(v.dir, 'ltr'); assert.strictEqual(v.chapters[0].title, 'Step 1');
});
test('packaging + IPC wiring: resources entry, manifest helper in files, handler, preload', () => {
  const pk = JSON.parse(rd('package.json')).build; assert.ok(pk.extraResources.some((e) => e.from === 'assets/tutorial' && e.to === 'tutorial')); assert.ok(pk.files.includes('src/video/manifest.mjs'));
  assert.ok(/ipcMain\.handle\('qr:tutorialVideo'/.test(rd('electron/main.cjs'))); assert.ok(/process\.resourcesPath, 'tutorial'/.test(rd('electron/main.cjs')));
  assert.ok(/tutorialVideo: \(lang\) => ipcRenderer\.invoke\('qr:tutorialVideo', lang\)/.test(rd('electron/preload.cjs')));
});
test('Watch video buttons: in the tutorial card (tour language) and in Settings > Assistant (assistant language)', () => {
  const tv = rd('src/tutorial/TourView.tsx'), sd = rd('src/settings/SettingsDialog.tsx');
  assert.ok(/<WatchVideo lang=\{lang\} testid="tour-watch-video" label=\{T\.ui\.watch\}/.test(tv));
  assert.ok(/<WatchVideo lang=\{s\.assistantLanguage\} testid="settings-watch-video"/.test(sd));
  assert.ok(sd.indexOf('assistant-lang') < sd.indexOf('settings-watch-video'), 'in the Assistant tab, after the language row');
});
test('player: play/pause, seek, chapters, subtitles toggle as an overlay from the VTT text; every button has a tooltip', () => {
  const vp = rd('src/video/VideoPlayer.tsx'), wv = rd('src/video/WatchVideo.tsx');
  for (const id of ['video-play', 'video-seek', 'video-chapters', 'video-chapter', 'video-subs', 'video-close', 'video-time', 'video-el']) assert.ok(vp.includes(`data-testid="${id}"`), id);
  assert.ok(/parseVtt\(data\.vtt\)/.test(vp) && /data-testid="video-cue"/.test(vp) && !/<track /.test(vp), 'captions drawn from the VTT text, not a file:// track');
  for (const src of [vp, wv]) for (const m of src.match(/<button\b[^>]*>/g) || []) assert.ok(/title=/.test(m), 'tooltip: ' + m.slice(0, 80));
  assert.ok(!/style=\{\{[^}]*font/.test(vp), 'no inline font styles');
  assert.ok(/data-unavailable/.test(wv) && /noTip/.test(wv), 'unavailable language: visible, explained, not clickable');
});
test('i18n: player + button strings exist in en and he, and the tour card has them in he/en/ru', () => {
  const en = JSON.parse(rd('src/i18n/en.json')), he = JSON.parse(rd('src/i18n/he.json'));
  for (const k of ['video.watch', 'st.watchVideo', 'tip.watchVideo', 'dis.noVideo', 'video.title', 'video.play', 'video.pause', 'video.subs', 'video.chapters', 'video.loading', 'video.missing', 'video.error', 'tip.videoPlay', 'tip.videoPause', 'tip.videoSeek', 'tip.videoSubs', 'tip.videoChapter', 'tip.videoClose']) { assert.ok(en[k] && he[k], k); assert.ok(/[\u0590-\u05ff]/.test(he[k]) && !/[A-Za-z]/.test(he[k]), 'he ' + k); }
  return import('../src/tutorial/tour.mjs').then(({ TOUR_TEXT }) => { for (const l of ['he', 'en', 'ru']) for (const k of ['watch', 'tipWatch', 'noVideo']) assert.ok(TOUR_TEXT[l].ui[k], l + '.' + k); });
});
test('video CSS uses token font sizes only', () => { const css = rd('src/styles/video.css'); for (const m of css.matchAll(/font-size:\s*([^;}]+)/g)) assert.ok(/^var\(--qr-fs-(xs|sm|md|lg|xl)\)$/.test(m[1].trim()) || m[1].trim() === '100%', m[1]); assert.ok(rd('src/main.tsx').includes("styles/video.css")); });