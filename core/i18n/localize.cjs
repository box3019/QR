'use strict';
// i18n/localize: adds Hebrew display fields (*He) to an analyzed part, from message keys and term tables. Mutates and returns the part.
const { render, text, category } = require('./messages.cjs');
const T = require('./terms.cjs');

function localizePart(part) {
  if (!part) return part;
  if (part.rejectKey) part.rejectReasonHe = render(part.rejectKey.key, part.rejectKey.vars, 'he').message;
  if (part.material) { part.material.normalizedHe = part.material.normalized ? T.mat(part.material.normalized) : ''; part.material.sourceHe = T.loc(part.material.source); }
  if (part.routeSource) part.routeSourceHe = T.loc(part.routeSource);
  for (const p of part.problems || []) {
    p.categoryHe = category(p.category, 'he');
    if (p.key) { const r = render(p.key, p.vars, 'he'); p.messageHe = r.message; p.suggestionHe = r.suggestion; }
    for (const e of p.evidence || []) e.sourceHe = T.loc(e.source);
  }
  for (const r of part.refs || []) {
    r.descriptionHe = T.desc(r.description);
    if (r.owner) r.ownerHe = T.owner(r.owner);
    if (r.blocksVars) r.blocksHe = text('task.blocks', r.blocksVars, 'he');
  }
  for (const t of part.tasks || []) {
    if (t.key) t.titleHe = text(t.key, t.vars, 'he');
    if (t.blocksVars) t.blocksHe = text('task.blocks', t.blocksVars, 'he');
  }
  for (const s of part.route || []) {
    s.typeHe = T.step(s.type); s.titleHe = T.title(s.title); s.sourceHe = T.loc(s.source);
    for (const i of s.items || []) if (i.key) i.textHe = text(i.key, i.vars, 'he');
  }
  const H = require('../requirements/he.cjs').he;
  for (const r of part.requirements || []) {
    if (r.summary) for (const k of ['heatTreat', 'masking', 'coatings', 'paint', 'flow']) r.summary[k + 'He'] = H(r.summary[k]);
    for (const q of r.procs || []) { q.processHe = H(q.process); q.subtypeHe = H(q.subtype); }
    for (const m of r.masks || []) { m.methodHe = H(m.method); m.areasHe = H(m.areas); m.beforeHe = H(m.before); }
    if (r.material) r.material.familyHe = H(r.material.family);
  }
  return part;
}
module.exports = { localizePart };
