'use strict';
// requirements/coatings: which coating types a text names (in text order) and the meaning of their type/class.
const { R, rx, COAT_TYPES } = require('./rules.cjs');
const { all } = require('./util.cjs');
const PLATING = new Set(R.PLATING_SPECIFIC);

/** [[position, type]] sorted by position (then name) — one entry per coating type. */
function findCoats(t) {
  const hits = new Map();
  for (const [name, re] of COAT_TYPES) { const m = re.exec(t); if (m) hits.set(name, m.index); }
  for (const n of [...hits.keys()]) for (const s of R.SUPPRESS[n] || []) hits.delete(s);
  if ([...hits.keys()].some((k) => PLATING.has(k))) hits.delete('Plating (unspecified metal)');
  return [...hits].map(([n, p]) => [p, n]).sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
}

function coatDetail(name, w) {
  const up = w.toUpperCase(); const d = [];
  if (name === 'Anodize') {
    if (/HARD[- ]?(?:COAT|ANODI)/.test(up)) d.push('Hard anodize');
    if (/SULF/.test(up)) d.push('Sulfuric');
    if (/CHROMIC/.test(up)) d.push('Chromic');
    if (up.includes('8625')) for (const m of all(rx('TYPE_RE'), w)) { const tv = m[1].toUpperCase(); if (tv in R.ANOD_TYPES) d.push(`Type ${tv} = ${R.ANOD_TYPES[tv]}`); }
    if (/\bDY(?:E|ED)\b/.test(up)) d.push('Dyed');
    if (/\bSEAL/.test(up)) d.push('Sealed');
    if (/PTFE|TEFLON/.test(up)) d.push('PTFE-impregnated');
  } else if (name.startsWith('Conversion')) {
    if (up.includes('5541')) {
      for (const m of all(rx('TYPE_RE'), w)) { const tv = m[1].toUpperCase(); if (tv in R.CONV_TYPES) d.push(`Type ${tv} = ${R.CONV_TYPES[tv]}`); }
      for (const m of all(rx('CLASS_RE'), w)) { const cv = m[1].toUpperCase(); if (cv in R.CONV_CLASSES) d.push(`Class ${cv} = ${R.CONV_CLASSES[cv]}`); }
    }
    if (/TRIVALENT/.test(up)) d.push('Trivalent chromium');
    if (/HEXAVALENT/.test(up)) d.push('Hexavalent chromium');
    if (/ROHS/.test(up)) d.push('RoHS');
  } else if (name === 'Electroless nickel') {
    const m = up.match(/(HIGH|MEDIUM|MID|LOW)[- ]PHOS/); if (m) d.push(m[1][0] + m[1].slice(1).toLowerCase() + ' phosphorus');
    if (/\bBAK(?:E|ING)\b|EMBRITTLEMENT/.test(up)) d.push('Bake mentioned');
  }
  return d.join('; ');
}
module.exports = { findCoats, coatDetail };
