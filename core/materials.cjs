'use strict';
// materials: material detection, normalization and the allow-list (aluminium, bronze, copper/brass, plastics).
const bb = (t) => [Math.round(t.x), Math.round(t.y), Math.round(t.w), Math.round(t.h)];
// ---------- material (ported from MRT mrtCostEstimateParse.ts, incl. fix 8f54450 for KLA AL_6061-T651) ----------
const MATERIAL_RE = /\b(ALUMIN(?:UM|IUM)(?:\s+ALLOY)?|AL\.?\s*ALLOY|STAINLESS(?:\s+STEEL)?|CRES|(?:ALLOY\s+|CARBON\s+|TOOL\s+)?STEEL|BRASS|BRONZE|COPPER|TITANIUM(?:\s+ALLOY)?|INCONEL|PEEK|DELRIN|ACETAL|NYLON|PTFE|POM|ULTEM|MAGNESIUM(?:\s+ALLOY)?)\b/i;
const normalizeMaterialTokens = (t) => String(t || '').replace(/\b(AL|ALUMIN(?:UM|IUM)|SS|AISI|STEEL)_+(?=\d)/gi, '$1 ').replace(/(\d{4})_+(T\d)/gi, '$1-$2').replace(/(\d{4})\s+(T\d{1,4})\b/g, '$1-$2');
const NOT_MATERIAL = /^\s*(SEE\s+NOTES?|SEE\s+PLM|N\/A|NONE|-+)\s*$/i;
const isMaterialValue = (t) => { const r = normalizeMaterialTokens(t); return !NOT_MATERIAL.test(r) && !/\b(OXIDE|BLAST|PARTICLES|MESH)\b/i.test(r) && (MATERIAL_RE.test(r) || /\b(?:\d{4}-T\d+|AL\.?\s*[1-7]\d{3}|AMS\s*\d{4})/i.test(r)); };

const DEFAULT_ALLOW = [
  { family: 'Aluminium', re: '\\bALUMIN|\\bAL\\.?\\s*(?:ALLOY|[1-7]\\d{3})|\\b[1-7]\\d{3}-T\\d|\\bAMS[- ]?(?:4027|4117|QQ-A)' },
  { family: 'Bronze', re: '\\bBRONZE|\\bC9\\d{4}|\\bC6[1-4]\\d{3}' },
  { family: 'Copper/Brass', re: '\\bCOPPER|\\bBRASS|\\bC1[01]\\d{3}|\\bC3[0-9]{4}' },
  { family: 'Plastics', re: '\\bPEEK|\\bDELRIN|\\bACETAL|\\bNYLON|\\bPTFE|\\bPOM\\b|\\bULTEM|\\bPLASTIC|\\bPOLY(?:CARBONATE|AMIDE|ETHYLENE|PROPYLENE)' },
];
const REJECT_FAMILIES = [['Stainless steel', /\bSTAINLESS|\bCRES\b|17-4\s*PH|\b30[34]\b/], ['Steel', /\bSTEEL\b/], ['Titanium', /\bTITANIUM|\bTI-6AL/], ['Inconel', /\bINCONEL/]];

function materialFamily(raw, allow) {
  const n = normalizeMaterialTokens(raw).toUpperCase();
  for (const a of allow) if (new RegExp(a.re, 'i').test(n)) return { family: a.family, allowed: true };
  for (const [f, re] of REJECT_FAMILIES) if (re.test(n)) return { family: f, allowed: false };
  return { family: 'Unknown', allowed: false };
}
function prettyMaterial(raw) {
  const n = normalizeMaterialTokens(raw).toUpperCase();
  const g = n.match(/\b([1-7]\d{3})[-, ]?(T\d{1,4}(?:\/T\d{1,4})?)?/);
  if (g && /ALUMIN|\bAL\b|AL\.|AMS|PLATE|ROD/.test(n)) return `Aluminium ${g[1]}${g[2] ? '-' + g[2] : ''}`;
  return n.replace(/\s+/g, ' ').trim();
}

// title block: value right of OR under the MATERIAL label (cell geometry)
function materialFromTitleBlock(page) {
  const labels = page.tokens.filter((t) => /^\s*MATERIAL\s*:?\s*$/i.test(t.text) || /^\s*MATL\.?\s*:?\s*$/i.test(t.text));
  for (const L of labels) {
    const cands = page.tokens.filter((t) => t !== L && (
      (Math.abs(t.y - L.y) < L.h * 0.8 && t.x > L.x + L.w - 1 && t.x < L.x + L.w + 220) ||
      (t.y > L.y + L.h * 0.3 && t.y < L.y + L.h * 4 && t.x + t.w > L.x - 30 && t.x < L.x + L.w + 120)));
    cands.sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y));
    const seeNotes = cands.find((t) => /SEE\s+NOTES?/i.test(t.text));
    const v = cands.find((t) => isMaterialValue(t.text));
    if (v) return { raw: v.text.trim(), source: 'title block', page: page.n, bbox: bb(v), conf: v.conf };
    if (seeNotes) return { seeNotes: true, page: page.n, bbox: bb(seeNotes) };
  }
  return null;
}
module.exports = { MATERIAL_RE, normalizeMaterialTokens, NOT_MATERIAL, isMaterialValue, DEFAULT_ALLOW, REJECT_FAMILIES, materialFamily, prettyMaterial, materialFromTitleBlock };
