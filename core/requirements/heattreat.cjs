'use strict';
// requirements/heattreat: heat-treat types named in a text ("general" only when nothing more specific).
const { R, HT_TYPES } = require('./rules.cjs');
function heatTreatTypes(tt) {
  const ht = HT_TYPES.filter(([, re]) => re.test(tt)).map(([n]) => n);
  if (ht.length > 1 && ht.includes(R.HT_GENERAL)) ht.splice(ht.indexOf(R.HT_GENERAL), 1);
  return ht;
}
module.exports = { heatTreatTypes };
