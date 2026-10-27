'use strict';
// catalog: the shop's capability catalog (materials + processes). Plain data in JSON; matching regexes are
// generated here from each entry's aliases and are never hand-written anywhere else.
const MATERIALS = require('./materials.json');
const PROCESSES = require('./processes.json');
const VOCABULARY = require('./vocabulary.json');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Pure: alias -> regex source. Spaces, '-', '_' and '.' between tokens are interchangeable; no letter/digit glued on. */
function aliasPattern(alias) {
  const parts = String(alias).trim().toUpperCase().split(/[\s\-_.]+/).filter(Boolean).map(esc);
  if (!parts.length) return null;
  const body = parts.join('[\\s\\-_.]*');
  const lead = /^[A-Z0-9]/.test(parts[0]) ? '(?<![A-Z0-9])' : '';
  const tail = /\d$/.test(alias.trim()) ? '(?!\\d)' : /[A-Z]$/i.test(alias.trim()) ? '(?![A-Z])' : '';
  return lead + body + tail;
}
/** Pure: entry -> one combined regex source (longest alias first). */
function entryPattern(entry) {
  const ps = [...(entry.aliases || []), entry.grade].filter(Boolean).sort((a, b) => b.length - a.length).map(aliasPattern).filter(Boolean);
  return ps.length ? '(?:' + [...new Set(ps)].join('|') + ')' : null;
}
const reOf = (entry) => { const p = entryPattern(entry); return p ? new RegExp(p, 'i') : null; };

/** Merge saved user entries over the defaults (by id); entries the user added are kept; old regex-style lists are ignored. */
function mergeCatalog(defaults, saved) {
  if (!Array.isArray(saved) || saved.some((e) => !e || !e.id)) return defaults.map((d) => ({ ...d }));
  const byId = new Map(saved.map((e) => [e.id, e]));
  const out = defaults.map((d) => ({ ...d, ...(byId.get(d.id) || {}) }));
  for (const e of saved) if (!defaults.some((d) => d.id === e.id)) out.push(e);
  return out;
}
function defaultCatalog() { return { materials: MATERIALS.map((m) => ({ ...m })), processes: PROCESSES.map((p) => ({ ...p })) }; }

const TEMPER_RE = /(?<![A-Z0-9])(T\d{1,5}|H\d{2,3}|O)(?![A-Z0-9])/;
/** Pure: find the temper next to a grade, e.g. "6061-T651" -> T651, "5052 H32" -> H32. */
function temperOf(text, grade) {
  const u = String(text).toUpperCase().replace(/_/g, ' ');
  if (grade) { const m = u.match(new RegExp(esc(grade) + '\\s*[-,/ ]?\\s*(T\\d{1,5}|H\\d{2,3}|O)(?![A-Z0-9])')); if (m) return m[1]; }
  const m = u.match(/[-\s](T\d{2,5}|H\d{2,3})(?![A-Z0-9])/); return m ? m[1] : null;
}
/** Pure: generic description of any material string, so a "not in list" problem can name it exactly (e.g. Aluminium 5052-H32). */
function describeMaterial(raw) {
  const u = String(raw || '').toUpperCase().replace(/_/g, ' ');
  const SPEC = /(AMS|ASTM|QQ-A-\d+\/?|[BD]|DIN|EN|MIL)[\s\-]*$/;
  const grades = [...u.matchAll(/(?<![\d.\/])([1-8]\d{3})(?:\s*[-,/ ]\s*(T\d{1,5}|H\d{2,3}|O)(?![A-Z0-9]))?(?![\d.])/g)].filter((m) => !SPEC.test(u.slice(Math.max(0, m.index - 8), m.index)));
  const al = grades.find((m) => m[2]) || grades[0];
  if (al && /ALUM|\bAL\b|\bAA|AMS|QQ-A|PLATE|BAR|ROD|SHEET|EXTRU|^\s*\d{4}/.test(u)) return { family: 'Aluminium', grade: al[1], temper: al[2] || null, text: `Aluminium ${al[1]}${al[2] ? '-' + al[2] : ''}` };
  const pairs = [[/17-4\s*PH|15-5\s*PH|\b3[01]\d\b|\b4[1-4]\d\b(?=.*(STAINLESS|CRES|SS))|STAINLESS|CRES/, 'Stainless steel'], [/TI[- ]?6AL[- ]?4V|TITANIUM/, 'Titanium'], [/INCONEL\s*\d*/, 'Inconel'], [/\bC[1-9]\d{4}\b|BRASS|BRONZE|COPPER/, 'Copper alloy'], [/ULTEM\s*\d*|PEEK|NYLON|POLYCARBONATE|PEI\b/, 'Plastic'], [/\b(1018|1045|4130|4140|4340)\b|STEEL/, 'Steel']];
  for (const [re, fam] of pairs) { const m = u.match(re); if (m) { const g = (u.match(/17-4\s*PH|15-5\s*PH|TI[- ]?6AL[- ]?4V|INCONEL\s*\d+|\bC[1-9]\d{4}\b|ULTEM\s*\d*|\b(?:30[34]L?|316L?|4130|4140|4340|1018|1045)\b/) || [m[0]])[0].trim(); return { family: fam, grade: g, temper: temperOf(u, null), text: /^(STAINLESS|CRES|TITANIUM|STEEL|BRASS|BRONZE|COPPER)$/.test(g) ? fam : `${fam} ${g}` }; } }
  return { family: 'Unknown', grade: null, temper: null, text: u.replace(/\s+/g, ' ').trim().slice(0, 60) };
}
/**
 * Pure: classify a material string against the catalog.
 * -> { entry|null, allowed, temper, found: 'Aluminium 6061-T651', reason|null }
 */
function matchMaterial(raw, materials) {
  const u = String(raw || '').toUpperCase().replace(/_/g, ' ');
  const desc = describeMaterial(u);
  // several entries can hit (ASTM B209/B221 cover many alloys): the one whose grade is on the drawing wins
  const hits = materials.filter((m) => { const re = reOf(m); return re && re.test(u); });
  const entry = desc.family === 'Aluminium' && desc.grade ? hits.find((m) => m.grade === desc.grade) || null : hits[0] || null;
  const temper = temperOf(u, entry ? entry.grade : desc.grade) || desc.temper;
  const found = entry ? `${entry.nameEn}${temper ? '-' + temper : ''}`.replace(/ \(.*\)-/, '-') : desc.text;
  if (!entry) return { entry: null, allowed: false, temper, found, reason: `${found} is not in the materials list` };
  if (entry.enabled === false) return { entry, allowed: false, temper, found, reason: `${found} is disabled in the materials list` };
  if (temper && entry.tempers && entry.tempers.length && !entry.tempers.includes(temper)) return { entry, allowed: false, temper, found, reason: `${found}: temper ${temper} is not in the list (${entry.tempers.join(', ')})` };
  return { entry, allowed: true, temper, found, reason: null };
}

const NEG_RE = /\b(DO NOT|DON'T|NO|NOT|WITHOUT|EXCEPT)\s+(?:\w+\s+){0,2}$/;
/** Pure: every alias hit of `entries` in `lines` [{text, where}], skipping negated mentions ("DO NOT ANODIZE"). */
function findHits(entries, lines) {
  const hits = [];
  for (const e of entries) {
    const p = entryPattern(e); if (!p) continue;
    const re = new RegExp(p, 'gi');
    for (const l of lines) for (const m of String(l.text).toUpperCase().matchAll(re)) {
      if (NEG_RE.test(String(l.text).toUpperCase().slice(Math.max(0, m.index - 30), m.index))) continue;
      hits.push({ entry: e, text: m[0], where: l.where }); break;
    }
  }
  return hits;
}
/**
 * Pure: processes called out on the drawing, mapped to catalog entries.
 * -> [{ key, label, found, where, entry|null, status: 'ok'|'disabled'|'unmapped' }]
 */
function detectProcesses(lines, processes) {
  const out = [];
  const add = (o) => { if (!out.some((x) => x.key === o.key)) out.push(o); };
  for (const h of findHits(VOCABULARY, lines)) {
    const entry = processes.find((p) => { const re = reOf(p); return re && re.test(h.text); }) || null;
    add({ key: h.entry.key, label: h.entry.label, found: h.text, where: h.where, entry, status: !entry ? 'unmapped' : entry.enabled === false ? 'disabled' : 'ok' });
  }
  for (const h of findHits(processes, lines)) if (!out.some((o) => o.entry && o.entry.id === h.entry.id)) add({ key: h.entry.id, label: h.entry.nameEn, found: h.text, where: h.where, entry: h.entry, status: h.entry.enabled === false ? 'disabled' : 'ok' });
  return out;
}
module.exports = { MATERIALS, PROCESSES, VOCABULARY, aliasPattern, entryPattern, mergeCatalog, defaultCatalog, temperOf, describeMaterial, matchMaterial, detectProcesses };
