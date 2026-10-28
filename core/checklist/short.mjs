// Material text for the summary table: full words only (never abbreviated); long specs are trimmed at a natural break, the full text stays in the tooltip. Pure, no dependencies.
const DROP = [/\s*\/\s*acetal\b/gi];
/** 'Aluminum 6061-T6 (AMS 4027), sheet' -> 'Aluminum 6061-T6'; 'Delrin (POM / acetal)' -> 'Delrin (POM)'. Never longer than max characters (cut at a word). */
export function materialShort(spec, max = 26) {
  let s = String(spec == null ? '' : spec).replace(/\s+/g, ' ').trim(); if (!s) return s;
  for (const re of DROP) s = s.replace(re, '');
  s = s.replace(/\s+/g, ' ').trim();
  for (const re of [/\s*[,;].*$/, /\s*\([^)]*\)\s*$/, /\s+(?:per|to|acc\.?|according)\b.*$/i, /\s+(?:annealed|sheet|bar|plate|rod|tube|stock|round|hex)\b.*$/i]) { if (s.length <= max) break; const n = s.replace(re, '').trim(); if (n) s = n; }
  if (s.length > max) { const cut = s.slice(0, max); const sp = cut.lastIndexOf(' '); s = (sp > 6 ? cut.slice(0, sp) : cut).replace(/[\s,;(-]+$/, ''); }
  return s;
}
