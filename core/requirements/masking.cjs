'use strict';
// requirements/masking: masking is its own record — method, areas, and the process it is done before.
const { MASK_METHODS, MASK_AREAS, MASK_TARGET } = require('./rules.cjs');
const { getStandards } = require('./classify.cjs');
function maskRecord(no, seg, common) {
  const methods = MASK_METHODS.filter(([, re]) => re.test(seg)).map(([n]) => n);
  const areas = MASK_AREAS.filter(([, re]) => re.test(seg)).map(([n]) => n);
  const before = MASK_TARGET.filter(([, re]) => re.test(seg)).map(([n]) => n);
  if (before.length > 1 && before.includes('Coating')) before.splice(before.indexOf('Coating'), 1);
  return { no, method: methods.join(', ') || 'Masking (method not stated)', areas: areas.join(', '), before: before.join(' | '), stds: getStandards(seg).join('; '), flags: common.join('; '), src: seg };
}
module.exports = { maskRecord };
