// Assemble the tutorial video: node scripts/tutorial/build-video.cjs <lang> <workDir> [<repoRoot>]
// Inputs in workDir: frames/<epoch-ms>.jpg, timeline.json, audio/NN.mp3, durations.json (from record.cjs / make-audio.cjs).
// Outputs in <repo>/assets/tutorial: <lang>/qr-tutorial.mp4, <lang>/qr-tutorial.vtt, manifest.json (merged per language).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const [lang, work, repo = path.join(__dirname, '..', '..')] = process.argv.slice(2);
if (!lang || !work) { console.error('usage: build-video.cjs <lang> <workDir> [repo]'); process.exit(1); }
const S = require('./' + lang + '.cjs');
const FPS = 15;
const tl = JSON.parse(fs.readFileSync(path.join(work, 'timeline.json'), 'utf8'));
const dur = JSON.parse(fs.readFileSync(path.join(work, 'durations.json'), 'utf8'));
const frames = fs.readdirSync(path.join(work, 'frames')).filter((f) => f.endsWith('.jpg')).map((f) => ({ t: +f.replace('.jpg', ''), f })).sort((a, b) => a.t - b.t);
const t0 = tl.tStart, tEnd = tl.tEnd + 1000;
const sel = frames.filter((x) => x.t >= t0 - 50 && x.t <= tEnd);
// concat list with true durations, first frame pinned to t0 and last held to tEnd
let list = '';
sel.forEach((x, i) => { const next = i + 1 < sel.length ? sel[i + 1].t : tEnd; const d = Math.max(0.001, (next - (i === 0 ? t0 : x.t)) / 1000); list += `file '${path.join(work, 'frames', x.f).replace(/\\/g, '/')}'\nduration ${d.toFixed(3)}\n`; });
list += `file '${path.join(work, 'frames', sel[sel.length - 1].f).replace(/\\/g, '/')}'\n`;
fs.writeFileSync(path.join(work, 'list.txt'), list);

// chapters + audio offsets
const starts = tl.steps.map((s, i) => (i === 0 ? 0 : (s.t0 - t0) / 1000));
const audioAt = tl.steps.map((s) => Math.max(0, (s.t0 - t0) / 1000 + 0.15));
const total = (tEnd - t0) / 1000;

// WebVTT: sentences per step, spread over the step's audio duration by character count
const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor(x / 60) % 60, s = x % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + s.toFixed(3).padStart(6, '0'); };
const split = (txt) => { const out = []; for (const s of txt.split(/(?<=[.!?:])\s+/)) { if (s.length <= 85) out.push(s); else { let cur = ''; for (const w of s.split(/(?<=,)\s+/)) { if (cur && (cur + ' ' + w).length > 85) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } } return out.filter(Boolean); };
let vtt = 'WEBVTT\n\n'; let n = 1;
S.steps.forEach((st, i) => {
  const parts = split(st.say), sum = parts.reduce((a, p) => a + p.length, 0); let at = audioAt[i]; const d = dur[i + 1] - 0.3;
  parts.forEach((p) => { const len = d * p.length / sum; vtt += `${n++}\n${ts(at)} --> ${ts(at + len - 0.05)}\n${p}\n\n`; at += len; });
});
const outDir = path.join(repo, 'assets', 'tutorial', lang); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'qr-tutorial.vtt'), vtt);

// ffmetadata chapters
let meta = ';FFMETADATA1\n'; tl.steps.forEach((s, i) => { const a = Math.round(starts[i] * 1000), b = Math.round((i + 1 < starts.length ? starts[i + 1] : total) * 1000); meta += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${a}\nEND=${b}\ntitle=${S.stepWord} ${i + 1}: ${S.steps[i].title}\n`; });
fs.writeFileSync(path.join(work, 'chapters.txt'), meta, 'utf8');

const inputs = ['-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt')];
S.steps.forEach((_, i) => inputs.push('-i', path.join(work, 'audio', String(i + 1).padStart(2, '0') + '.mp3')));
inputs.push('-i', path.join(work, 'chapters.txt'));
const aparts = S.steps.map((_, i) => `[${i + 1}:a]adelay=${Math.round(audioAt[i] * 1000)}|${Math.round(audioAt[i] * 1000)}[a${i}]`).join(';');
const amix = S.steps.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${S.steps.length}:normalize=0:dropout_transition=0,apad[aout]`;
const mp4 = path.join(outDir, 'qr-tutorial.mp4');
const args = ['-y', ...inputs, '-filter_complex', `[0:v]fps=${FPS},scale=1280:800:flags=lanczos,format=yuv420p[v];${aparts};${amix}`, '-map', '[v]', '-map', '[aout]', '-map_metadata', String(S.steps.length + 1), '-map_chapters', String(S.steps.length + 1),
  '-t', total.toFixed(3), '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-profile:v', 'high', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '80k', '-ac', '1', '-ar', '44100', mp4];
const r = cp.spawnSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
if (r.status) { console.error(r.stderr.slice(-2500)); process.exit(2); }
const probe = JSON.parse(cp.execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '-show_chapters', mp4], { encoding: 'utf8' }));
const duration = +(+probe.format.duration).toFixed(2);

const manPath = path.join(repo, 'assets', 'tutorial', 'manifest.json');
const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { version: 1, videos: {} };
man.videos[lang] = { file: lang + '/qr-tutorial.mp4', captions: lang + '/qr-tutorial.vtt', duration, size: fs.statSync(mp4).size, dir: S.dir, title: S.title,
  chapters: tl.steps.map((s, i) => ({ t: +starts[i].toFixed(2), title: `${S.stepWord} ${i + 1}: ${S.steps[i].title}` })) };
fs.writeFileSync(manPath, JSON.stringify(man, null, 2) + '\n');
console.log(JSON.stringify({ duration, size: fs.statSync(mp4).size, chapters: probe.chapters.length, streams: probe.streams.map((s) => s.codec_name + ' ' + (s.width ? s.width + 'x' + s.height : '')) }));