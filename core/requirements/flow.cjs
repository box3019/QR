'use strict';
// requirements/flow: one-line process summary per page (heat treat, masking, coatings in order, paint, flow, flagged count).
const { uniq } = require('./util.cjs');
function summarize(procs, masks) {
  const j = (items) => uniq(items.filter(Boolean)).join(' | ');
  const lab = (r) => r.subtype + (r.typecls ? ' ' + r.typecls : '') + (r.stds ? ' [' + r.stds + ']' : '');
  const ht = j(procs.filter((r) => r.process === 'Heat treat').map((r) => (r.subtype + ' ' + r.hard).trim()));
  const mk = j(masks.map((m) => m.method + (m.areas ? ': ' + m.areas : '')));
  const co = procs.filter((r) => r.process === 'Coating');
  const coatings = uniq(co.map(lab)).join(' → ');
  const paint = j(procs.filter((r) => r.process === 'Paint').map(lab));
  const flow = [...(masks.length ? ['Masking'] : []), ...uniq(co.map((r) => r.subtype)), ...(paint ? ['Paint'] : [])].join(' → ');
  const flagged = [...procs, ...masks].filter((r) => r.flags).length;
  return { heatTreat: ht, masking: mk, coatings, paint, flow, flagged };
}
module.exports = { summarize };
