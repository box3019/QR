// Concise normalized display labels for the summary table (full text stays in the tooltip). Pure, no dependencies.
const DICT = [[/\b(?:aluminium|aluminum)\b/gi, 'Al'], [/\bstainless\s+steel\b/gi, 'SS'], [/\bcopper\b/gi, 'Cu'], [/\bcarbon\s+steel\b/gi, 'CS'], [/\balloy\s+steel\b/gi, 'AS'], [/\s*\/\s*acetal\b/gi, '']];
/** 'Aluminum 6061-T6 (AMS 4027), sheet' -> 'Al 6061-T6'; 'Delrin (POM / acetal)' -> 'Delrin (POM)'. Never longer than max chars (cut at a word). */
export function materialShort(spec, max = 18) {
  let s = String(spec == null ? '' : spec).replace(/\s+/g, ' ').trim(); if (!s) return s;
  for (const [re, to] of DICT) s = s.replace(re, to);
  s = s.replace(/\s+/g, ' ').trim();
  for (const re of [/\s*[,;].*$/, /\s*\([^)]*\)\s*$/, /\s+(?:per|to|acc\.?|according)\b.*$/i, /\s+(?:annealed|sheet|bar|plate|rod|tube|stock|round|hex)\b.*$/i]) { if (s.length <= max) break; const n = s.replace(re, '').trim(); if (n) s = n; }
  if (s.length > max) { const cut = s.slice(0, max); const sp = cut.lastIndexOf(' '); s = (sp > 6 ? cut.slice(0, sp) : cut).replace(/[\s,;(-]+$/, ''); }
  return s;
}
