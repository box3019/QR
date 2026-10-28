// Pure helpers for the tutorial video: manifest lookup, chapters, time format, WebVTT checks.
// No DOM / Electron here so node:test can load it directly.
export const VIDEO_LANGS = ['he', 'en', 'ru'];

/** The manifest entry for a language, or null when there is no video for it (we never fall back to another language). */
export function pickVideo(manifest, lang) {
  if (!manifest || typeof manifest !== 'object' || !manifest.videos) return null;
  if (!VIDEO_LANGS.includes(lang)) return null;
  const v = manifest.videos[lang];
  if (!v || typeof v.file !== 'string' || !v.file) return null;
  return v;
}

/** Index of the chapter playing at time t (seconds); chapters are ascending by .t. */
export function chapterAt(chapters, t) {
  let idx = 0;
  for (let i = 0; i < (chapters || []).length; i++) { if (t + 0.001 >= chapters[i].t) idx = i; else break; }
  return idx;
}

/** m:ss */
export function fmtTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/** Parse "00:01:02.500" / "01:02.500" to seconds, NaN if invalid. */
export function parseVttTime(s) {
  const m = /^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})$/.exec(String(s).trim());
  if (!m) return NaN;
  return (m[1] ? +m[1] * 3600 : 0) + +m[2] * 60 + +m[3] + +m[4] / 1000;
}

/** Parse WebVTT text to [{start,end,text}]; throws on a bad header or bad cue. */
export function parseVtt(text) {
  const src = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!/^WEBVTT(\s|$)/.test(src)) throw new Error('missing WEBVTT header');
  const cues = [];
  for (const block of src.split(/\n{2,}/).slice(1)) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) continue;
    const ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) throw new Error('cue without timing: ' + lines[0]);
    const [a, b] = lines[ti].split('-->').map((x) => x.trim().split(/\s+/)[0]);
    const start = parseVttTime(a), end = parseVttTime(b);
    if (!(start >= 0) || !(end > start)) throw new Error('bad cue timing: ' + lines[ti]);
    cues.push({ start, end, text: lines.slice(ti + 1).join('\n') });
  }
  return cues;
}

/** Problems with a manifest entry (empty list = valid). */
export function validateEntry(v) {
  const bad = [];
  if (!v || typeof v !== 'object') return ['entry missing'];
  if (typeof v.file !== 'string' || !/\.mp4$/i.test(v.file)) bad.push('file must be .mp4');
  if (typeof v.captions !== 'string' || !/\.vtt$/i.test(v.captions)) bad.push('captions must be .vtt');
  if (!(v.duration > 0)) bad.push('duration must be > 0');
  const ch = Array.isArray(v.chapters) ? v.chapters : [];
  if (!ch.length) bad.push('no chapters');
  if (ch.length && ch[0].t !== 0) bad.push('first chapter must start at 0');
  ch.forEach((c, i) => {
    if (!c.title) bad.push('chapter ' + i + ' has no title');
    if (!(c.t >= 0) || c.t >= v.duration) bad.push('chapter ' + i + ' outside duration');
    if (i && !(c.t > ch[i - 1].t)) bad.push('chapter ' + i + ' not ascending');
  });
  return bad;
}