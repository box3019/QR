'use strict';
// requirements/fields: value pickers used by the process records (type/class, thickness, coats, colour, hardness, temperature, case depth).
const { R, rx } = require('./rules.cjs');
const { uniq, title, all } = require('./util.cjs');

const typeClass = (t) => uniq([...all(rx('TYPE_RE'), t).map((m) => 'Type ' + m[1].toUpperCase()), ...all(rx('CLASS_RE'), t).map((m) => 'Class ' + m[1].toUpperCase())]).join('; ');

function thickness(t) {
  const out = [];
  for (const m of all(rx('THK_RE'), t)) {
    let val = m[1].replace(/\s*(?:-|–|TO)\s*/gi, '-').replace(/\s+/g, '');
    let u = m[2].toUpperCase();
    if (u.startsWith('MICRO') || 'µμ'.includes(u[0])) u = 'µm'; else if (u.startsWith('MIL')) u = 'mil'; else u = u.toLowerCase();
    let s = val + ' ' + u;
    if (m[3]) s += ' ' + m[3].slice(0, 3).toLowerCase();
    if (t.slice(Math.max(0, m.index - 40), m.index).toUpperCase().includes('TOTAL')) s += ' (total)';
    out.push(s);
  }
  return uniq(out).join('; ');
}
const coats = (t) => { const m = t.match(rx('COATS_RE')); if (!m) return ''; const g = m[1].toUpperCase(); return R.NUMWORD[g] || g; };
const colors = (t) => uniq([...all(rx('COLOR_NUM'), t).map((m) => '#' + m[1].toUpperCase()), ...all(rx('COLOR_WORD'), t).map((m) => title(m[1]))]).join('; ');
const hardness = (t) => uniq(all(rx('HARD_RE'), t).map((m) => (m[1] || m[4]).replace(/\s+/g, '') + ' ' + (m[2] || m[3]).toUpperCase())).join('; ');
function temperature(t) {
  return uniq(all(rx('TEMP_RE'), t).map((m) => { const pre = (m[1] || '').toLowerCase(); const s = m[2].replace(/\s+/g, '') + ' ' + m[3].toUpperCase(); return pre ? pre + ' ' + s : s; })).join('; ');
}
const caseDepth = (t) => { const m = t.match(rx('CASE_RE')); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; };
module.exports = { typeClass, thickness, coats, colors, hardness, temperature, caseDepth };
