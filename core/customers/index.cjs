'use strict';
// customers: customer profiles as plain data (built-ins + user entries) and profile detection from that data.
// Detection never names a customer in code; the base profile (RAFAEL/ELTA/KLA/ELBIT/GENERIC) picks the parsers.
const BUILTINS = require('./builtins.json');
const BASES = ['RAFAEL', 'ELTA', 'KLA', 'ELBIT', 'GENERIC'];
const ROUTING = ['auto', 'routing chart', 'notes', 'notes + parts list'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WEIGHT = { emailDomains: 4, filenamePatterns: 3, keywords: 2, partNoPatterns: 1 };

/** Pure: simple pattern -> regex source. # digit, @ letter, * anything, ? one char; the rest literal. */
function simplePattern(p) {
  return [...String(p).trim()].map((ch) => (ch === '#' ? '\\d' : ch === '@' ? '[A-Z]' : ch === '*' ? '.*' : ch === '?' ? '.' : esc(ch))).join('');
}
/** Pure: keyword -> regex source with word edges when the keyword starts/ends with a letter or digit. */
const keywordPattern = (k) => { const s = String(k).trim(); return (/^[A-Za-z0-9]/.test(s) ? '(?<![A-Za-z0-9])' : '') + esc(s) + (/[A-Za-z0-9]$/.test(s) ? '(?![A-Za-z0-9])' : ''); };

/** Merge saved profiles over the built-ins; built-ins can't be deleted (they come back disabled-or-edited). */
function mergeCustomers(saved) {
  const list = Array.isArray(saved) ? saved.filter((c) => c && c.id && c.detect) : [];
  const byId = new Map(list.map((c) => [c.id, c]));
  const out = BUILTINS.map((b) => { const s = byId.get(b.id); return s ? { ...b, ...s, id: b.id, base: b.base, builtin: true, detect: { ...b.detect, ...s.detect } } : JSON.parse(JSON.stringify(b)); });
  for (const c of list) if (!BUILTINS.some((b) => b.id === c.id)) out.push({ ...c, builtin: false, base: BASES.includes(c.base) ? c.base : 'GENERIC' });
  return out;
}
/** Pure: new user profile, optionally copied from another (Duplicate). */
function newCustomer(from, existingIds = []) {
  const src = from || BUILTINS.find((b) => b.id === 'GENERIC');
  let id = 'C-' + (from ? from.id : 'NEW'); let n = 2; while (existingIds.includes(id)) id = 'C-' + (from ? from.id : 'NEW') + '-' + n++;
  return { ...JSON.parse(JSON.stringify(src)), id, name: from ? from.name + ' (copy)' : 'New customer', base: src.base, builtin: false, enabled: true };
}
/**
 * Pure: pick the best enabled profile for { text, fileName, emails } -> { id, name, base, routing, questionsLanguage, score, why }.
 * Score: e-mail domain 4, file name 3, keyword 2, part-number pattern 1; ties -> list order (user profiles first).
 */
function detectProfile({ text = '', fileName = '', emails = [] }, customers) {
  const list = customers || mergeCustomers();
  const ordered = [...list.filter((c) => !c.builtin), ...list.filter((c) => c.builtin)].filter((c) => c.enabled !== false && c.id !== 'GENERIC');
  const domains = [...new Set([...emails, ...(String(text).match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || [])].map((e) => String(e).split('@').pop().toLowerCase()))];
  const T = String(text).toUpperCase(); const F = String(fileName).toUpperCase();
  let best = null;
  for (const c of ordered) {
    const d = c.detect || {}; let score = 0; const why = [];
    for (const dom of d.emailDomains || []) { const x = String(dom).toLowerCase().replace(/^@/, ''); if (x && domains.some((h) => h === x || h.endsWith('.' + x))) { score += WEIGHT.emailDomains; why.push('e-mail ' + x); break; } }
    for (const f of d.filenamePatterns || []) if (f && new RegExp('^' + simplePattern(f.toUpperCase()) + '$').test(F)) { score += WEIGHT.filenamePatterns; why.push('file ' + f); break; }
    for (const k of d.keywords || []) if (k && new RegExp(keywordPattern(k), 'i').test(T)) { score += WEIGHT.keywords; why.push('keyword ' + k); break; }
    for (const p of d.partNoPatterns || []) if (p && new RegExp('(?<![A-Z0-9])' + simplePattern(p.toUpperCase()) + '(?![A-Z0-9])').test(T)) { score += WEIGHT.partNoPatterns; why.push('part no. ' + p); break; }
    if (score && (!best || score > best.score)) best = { c, score, why };
  }
  const c = best ? best.c : list.find((x) => x.id === 'GENERIC') || BUILTINS[BUILTINS.length - 1];
  return { id: c.id, name: c.name, base: c.base, routing: c.routing || 'auto', questionsLanguage: c.questionsLanguage, contact: c.contact || '', score: best ? best.score : 0, why: best ? best.why.join(', ') : 'no match' };
}
module.exports = { BUILTINS, BASES, ROUTING, simplePattern, keywordPattern, mergeCustomers, newCustomer, detectProfile };
