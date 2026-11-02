'use strict';
// intake/package: group extracted files by part number / drawing stem (RAFAEL 518310-A-PD-… and similar).
const path = require('path');

const SUFFIX = /(?:[_-](?:MLED|PAS|PD|STEP|STP|IGS|IGES|X_T|X_B|SLDPRT|PRT))+$/i;
const RAF = /^([A-Z]{0,2}\d{5,7}[A-Z]?)(?:-[A-Z]{1,2})?(?:-PD-|_)/i;
const ELTA = /^(\d{4}[A-Z]\d{3}-\d{3})/i;
const KLA = /^(0\d{6}-\d{3})/i;
const ELBIT = /^(\d{4}-\d{4}-\d{2})/i;

function baseName(p) {
  return path.basename(String(p || ''));
}

function stemOf(name) {
  let s = baseName(name);
  s = s.replace(/(\.pdf)+$/i, '');
  s = s.replace(/\.[^.]+$/, '');
  return s;
}

/** Part-number key used to group drawing + STEP + PAS + MLED and similar. */
function partKeyFromName(name) {
  const stem = stemOf(name);
  const u = stem.toUpperCase();
  const raf = u.match(RAF); if (raf) return raf[1];
  const elta = u.match(ELTA); if (elta) return elta[1];
  const kla = u.match(KLA); if (kla) return kla[1];
  const elbit = u.match(ELBIT); if (elbit) return elbit[1];
  const cleaned = u.replace(SUFFIX, '').replace(/[_-][A-Z]$/, '');
  const tok = cleaned.match(/^([A-Z0-9]{4,}(?:-[A-Z0-9]+)*)/);
  return tok ? tok[1] : u;
}

function digits(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** @param {string[]} files @returns {Map<string, string[]>} */
function groupFilesByPart(files) {
  const m = new Map();
  for (const f of files || []) {
    const k = partKeyFromName(f);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(f);
  }
  return m;
}

function filesForPart(part, groups) {
  const pn = digits(part && part.partNo);
  const dn = digits(stemOf(part && part.drawing && part.drawing.name));
  let best = [];
  for (const [k, files] of groups) {
    const gk = digits(k);
    if (!gk) continue;
    if (pn && (pn === gk || pn.startsWith(gk) || gk.startsWith(pn))) return files;
    if (dn && (dn === gk || dn.startsWith(gk) || gk.startsWith(dn))) best = files;
  }
  return best;
}

function attachPackageFiles(parts, files) {
  const groups = groupFilesByPart(files || []);
  for (const p of parts || []) {
    const g = filesForPart(p, groups);
    p.packageFiles = [...new Set((g || []).map(baseName))];
    p.packageKey = partKeyFromName((p.drawing && p.drawing.name) || p.partNo || '');
  }
  return parts;
}

module.exports = { partKeyFromName, groupFilesByPart, filesForPart, attachPackageFiles, stemOf };
