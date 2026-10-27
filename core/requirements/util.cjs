'use strict';
// requirements/util: Python-equivalent helpers (uniq by upper case, str.title, rect union, illegal-char clean).
const uniq = (seq) => { const seen = new Set(), out = []; for (const s of seq) { const k = s.toUpperCase(); if (!seen.has(k)) { seen.add(k); out.push(s); } } return out; };
/** Python str.title(): first letter of every letter-run upper, the rest lower. */
const title = (s) => String(s).toLowerCase().replace(/(^|[^a-z\u00C0-\uFFFF])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const clean = (v) => (typeof v === 'string' ? v.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '') : v);
const rect = (r) => ({ x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 });
/** pymupdf Rect |= (union; an empty rect is replaced). */
const union = (a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
/** Python re.sub over all matches. */
const sub = (re, rep, s) => s.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), rep);
const all = (re, s) => [...s.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))];
/** Python min(seq, key): first minimal element. */
const minBy = (seq, key) => { let best = null, bk = Infinity; for (const x of seq) { const k = key(x); if (k < bk) { bk = k; best = x; } } return best; };
/** Stable sort by key tuple (Python sorted). */
const sortBy = (seq, key) => seq.map((x, i) => [key(x), i, x]).sort((a, b) => { for (let j = 0; j < a[0].length; j++) if (a[0][j] !== b[0][j]) return a[0][j] < b[0][j] ? -1 : 1; return a[1] - b[1]; }).map((x) => x[2]);
module.exports = { uniq, title, clean, rect, union, sub, all, minBy, sortBy };
