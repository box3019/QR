// Make the voice-over: one mp3 per step with edge-tts, plus durations.json. Usage: node scripts/tutorial/make-audio.cjs <lang> <outDir>
const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const [lang, out] = process.argv.slice(2); const S = require('./' + lang + '.cjs'); fs.mkdirSync(path.join(out, 'audio'), { recursive: true });
const dur = {};
S.steps.forEach((st, i) => { const f = path.join(out, 'audio', String(i + 1).padStart(2, '0') + '.mp3'); const txt = path.join(out, 'audio', String(i + 1).padStart(2, '0') + '.txt'); fs.writeFileSync(txt, st.say, 'utf8');
  execFileSync('python', ['-m', 'edge_tts', '--voice', S.voice, '--rate=-5%', '--file', txt, '--write-media', f], { stdio: 'inherit' });
  dur[i + 1] = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()); });
fs.writeFileSync(path.join(out, 'durations.json'), JSON.stringify(dur, null, 1)); console.log(JSON.stringify(dur), 'total', Object.values(dur).reduce((a, b) => a + b, 0).toFixed(1));
