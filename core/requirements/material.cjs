'use strict';
// requirements/material: material record (family, alloy, temper, form, standards, dims, cat no) from rows tagged Material.
const { rx } = require('./rules.cjs');
const { sub, all } = require('./util.cjs');

function extractMaterial(rows) {
  const mrows = rows.filter((r) => r.cat.includes('Material'));
  if (!mrows.length) return null;
  const text = mrows.map((r) => r.text).join(' ');
  const extra = mrows.map((r) => r.extra).join(' ');
  const stds = [];
  for (const m of all(rx('STD_RE'), text)) { const s = m[0].trim(); if (!stds.includes(s)) stds.push(s); }
  const body = sub(rx('STD_RE'), ' ', text);
  const up = body.toUpperCase();
  let family = '', alloy = '', temper = '';
  if (/ALUM/.test(up)) family = 'Aluminum';
  else if (/TITAN|TI-?6AL/.test(up)) family = 'Titanium';
  else if (/STEEL|STAINLESS|\bSS\b|CRES/.test(up) || rx('STEEL_RE').test(body)) family = 'Steel';
  else if (/BRASS|COPPER|BRONZE/.test(up)) family = 'Copper alloy';
  if (family === 'Aluminum') { const m = body.match(rx('AL_RE')); if (m) { alloy = m[1]; temper = m[2] || ''; } }
  else if (family === 'Titanium') { const m = body.match(rx('TI_RE')); alloy = m ? m[0].toUpperCase() : ''; }
  else if (family === 'Steel') { const m = body.match(rx('STEEL_RE')); alloy = m ? m[1].toUpperCase() : ''; }
  if (!temper) { const m = body.match(rx('TEMPER_RE')); temper = m ? m[1].toUpperCase() : ''; }
  const f = body.match(rx('FORM_RE')); const form = f ? f[1].toUpperCase() : '';
  let dims = all(rx('DIM_RE'), body).map((m) => `${m[1].toUpperCase()}=${m[2].replace(/\.+$/, '')}`).join(' ');
  if (dims) { const u = body.match(rx('UNIT_RE')); if (u) dims += ' ' + u[0].toUpperCase(); }
  const c = extra.match(rx('CATNO_RE'));
  const [catno, qty, unit] = c ? [c[1], c[2], c[3] || ''] : ['', '', ''];
  if (!(alloy || stds.length || form)) return null;
  return { family, alloy, temper, form, stds: stds.join('; '), dims, catno, qty, unit, src: mrows.map((r) => r.text).join(' | ') };
}
module.exports = { extractMaterial };
