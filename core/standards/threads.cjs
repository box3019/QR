'use strict';
// Screw threads: parse inch (UNC/UNF/UNEF/UNJC/UNJF/UNJ) and metric (M/MJ) callouts; basic sizes in inch and mm.
const NUM = { '0': 0.06, '1': 0.073, '2': 0.086, '3': 0.099, '4': 0.112, '5': 0.125, '6': 0.138, '8': 0.164, '10': 0.19, '12': 0.216 };
/** '.3750' -> '0.3750' everywhere in a display string. */
const lz = (x) => String(x).replace(/(^|[^\d])\.(\d)/g, (_, a, b) => a + '0.' + b);
const r3 = (x) => Math.round(x * 1000) / 1000, r4 = (x) => Math.round(x * 10000) / 10000;
function diaInch(s) {
  s = String(s).replace(/^#/, '');
  if (/^\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return a / b; }
  if (/^\d+-\d+\/\d+$/.test(s)) { const [w, f] = s.split('-'); const [a, b] = f.split('/').map(Number); return +w + a / b; }
  if (/^\.\d+$|^\d+\.\d+$/.test(s)) return parseFloat(s);
  if (NUM[s] != null) return NUM[s];
  if (/^\d$/.test(s)) return +s;
  return NaN;
}
/** "3/8-24 UNF-2B", ".3750-24-UNJF-3B", "M12x1.25-6H", "MJ6x1-4H5H" -> thread object or null */
function parseThread(raw) {
  const s = String(raw || '').toUpperCase().replace(/\s+/g, ' ').trim();
  let m = s.match(/^((?:\d+-)?\d+\/\d+|\.\d{2,4}|\d+\.\d{2,4}|#?\d{1,2})\s*-\s*(\d{1,2})\s*-?\s*(UNJEF|UNJF|UNJC|UNJ|UNEF|UNF|UNC|UNS|UN)(?:\s*-\s*|\s+)?(\d[AB])?/);
  if (m) {
    const d = diaInch(m[1]); if (!(d > 0)) return null; const tpi = +m[2]; const p = 1 / tpi;
    const series = m[3], j = series.startsWith('UNJ');
    const minorInt = d - 1.08253 * p; // basic internal minor (UN); UNJ internal minor is larger (0.9743p)
    const sz = /^\./.test(m[1]) ? '0' + m[1] : m[1]; return { system: 'inch', raw: `${sz}-${m[2]} ${series}${m[4] ? '-' + m[4] : ''}`, dia: r4(d), tpi, series, j, cls: m[4] || '', mm: { major: r3(d * 25.4), pitch: r3(25.4 / tpi), minor: r3((j ? d - 0.97428 * p : minorInt) * 25.4), tapDrill: r3((d - p) * 25.4) } };
  }
  m = s.match(/^(MJ|M)\s*(\d{1,3}(?:\.\d+)?)\s*[X×]\s*(\d(?:\.\d+)?)(?:\s*-\s*(\d[GH](?:\d[GH])?))?/);
  if (m) {
    const d = +m[2], p = +m[3];
    return { system: 'metric', raw: s, dia: d, pitch: p, series: m[1], j: m[1] === 'MJ', cls: m[4] || '', mm: { major: d, pitch: p, minor: r3(d - (m[1] === 'MJ' ? 0.9 : 1.0825) * p), tapDrill: r3(d - p) } };
  }
  return null;
}
/** Compare a drawing thread with the thread the standard requires. Returns flag objects. */
function compareThreads(drawing, required) {
  const out = []; if (!drawing || !required) return out;
  if (drawing.system !== required.system || Math.abs((drawing.dia || 0) - (required.dia || 0)) > 0.002 || (drawing.tpi || drawing.pitch) !== (required.tpi || required.pitch)) out.push({ type: 'size', drawing: drawing.raw, required: required.raw });
  if (drawing.system === required.system && (drawing.j !== required.j || (drawing.series || '').replace('J', '') !== (required.series || '').replace('J', ''))) out.push({ type: 'series', drawing: drawing.series, required: required.series + (required.cls ? ' ' + required.cls : '') });
  if (drawing.cls && required.cls && drawing.cls !== required.cls) out.push({ type: 'class', drawing: drawing.cls, required: required.cls });
  return out;
}
module.exports = { lz, parseThread, compareThreads, diaInch };
