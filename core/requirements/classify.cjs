'use strict';
// requirements/classify: category tags for a requirement line + the standards/specs it cites.
const { CATS, rx } = require('./rules.cjs');
const { uniq, all } = require('./util.cjs');

/** classify(*texts) -> category names whose pattern matches the upper-cased joined text. */
const classify = (...texts) => { const t = texts.join(' ').toUpperCase(); return CATS.filter(([, re]) => re.test(t)).map(([c]) => c); };

/** Standards (AMS, ASTM, MIL, QQ, EN/DIN/ISO...) plus "PER <token with a digit>" customer specs; shorter duplicates contained in longer ones are dropped. */
function getStandards(t) {
  const found = all(rx('STD_RE'), t).map((m) => m[0].trim());
  for (const m of all(rx('PER_RE'), t)) { const tok = m[1].replace(/[.,;:)]+$/, ''); if (/\d/.test(tok)) found.push(tok); }
  const u = uniq(found);
  return u.filter((s) => !u.some((o) => s !== o && o.toUpperCase().includes(s.toUpperCase())));
}
module.exports = { classify, getStandards };
