'use strict';
// Detect standard callouts on drawing text: ports (AS5202 / MS33649 dash), O-rings (AS568, M83248), inserts (Keensert, Helicoil), threads.
const { parseThread } = require('./threads.cjs');
const THREAD_IN = /((?:\d+-)?\d+\/\d+|\.\d{3,4}|\d\.\d{3,4}|#\d{1,2})\s*-\s*(\d{1,2})\s*-?\s*(UNJEF|UNJF|UNJC|UNJ|UNEF|UNF|UNC)(?:\s*-\s*(\d[AB]))?/g;
const THREAD_M = /\b(MJ|M)(\d{1,3}(?:\.\d+)?)\s*[xX×]\s*(\d(?:\.\d{1,2})?)(?:\s*-\s*(\d[gGhH](?:\d[gGhH])?))?/g;
const pad2 = (s) => String(+s).padStart(2, '0'), pad3 = (s) => String(+s).padStart(3, '0');
function detectCallouts(text) {
  const out = [], seen = new Set();
  const add = (c) => { const k = c.kind + '|' + c.std + '|' + (c.dash || '') + '|' + (c.thread ? c.thread.raw : ''); if (seen.has(k)) return; seen.add(k); out.push(c); };
  const lines = String(text || '').toUpperCase().split(/\n/);
  lines.forEach((line, i) => {
    const ctx = line + ' ' + (lines[i + 1] || '');
    for (const m of ctx.matchAll(/\b(AS[- ]?5202|MS[- ]?33649)\b[^\n]{0,40}?(?:DASH\s*(?:NO\.?|NUMBER)?\s*|-)(\d{1,2})\b/g)) {
      if (m.index > line.length) continue;
      const t = [...ctx.matchAll(THREAD_IN)].map((x) => parseThread(x[0]))[0] || null;
      add({ kind: 'port', std: m[1].replace(/[- ]/g, ''), dash: pad2(m[2]), thread: t, raw: line.trim().slice(0, 160), line: i });
    }
    for (const m of line.matchAll(/\b(?:SAE[- ])?AS[- ]?568[A-D]?[- ](\d{3})\b/g)) add({ kind: 'oring', std: 'AS568', dash: pad3(m[1]), raw: line.trim().slice(0, 160), line: i });
    for (const m of line.matchAll(/\b(?:MIL-DTL-)?M?83248\/([12])-(\d{3})\b/g)) add({ kind: 'oring', std: 'M83248/' + m[1], dash: pad3(m[2]), raw: line.trim().slice(0, 160), line: i });
    for (const m of line.matchAll(/\b(NASM[- ]?33537|MS[- ]?51830)[- ]?([A-Z0-9]{2,}(?:-[A-Z0-9]+)*)/g)) add({ kind: 'insert-key', std: m[1].replace(/[- ]/g, ''), dash: m[2], raw: line.trim().slice(0, 160), line: i });
    for (const m of line.matchAll(/\b(NASM[- ]?21209|MS[- ]?21209)[- ]?([A-Z0-9]{2,}(?:-[A-Z0-9]+)*)/g)) add({ kind: 'insert-coil', std: m[1].replace(/[- ]/g, ''), dash: m[2], raw: line.trim().slice(0, 160), line: i });
    for (const m of line.matchAll(THREAD_IN)) { const t = parseThread(m[0]); if (t) add({ kind: 'thread', std: t.j ? 'AS8879' : 'ASME B1.1', thread: t, raw: line.trim().slice(0, 160), line: i }); }
    for (const m of line.matchAll(THREAD_M)) { const t = parseThread(m[0]); if (t) add({ kind: 'thread', std: t.j ? 'ISO 5855' : 'ISO 965', thread: t, raw: line.trim().slice(0, 160), line: i }); }
  });
  // a port's own thread is not a separate thread callout
  const portThreads = new Set(out.filter((c) => c.kind === 'port' && c.thread).map((c) => c.line + '|' + c.thread.raw));
  return out.filter((c) => !(c.kind === 'thread' && (portThreads.has(c.line + '|' + c.thread.raw) || portThreads.has((c.line - 1) + '|' + c.thread.raw))));
}
module.exports = { detectCallouts };
