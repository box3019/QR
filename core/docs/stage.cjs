'use strict';
// Document stages (rules table). Every document requirement belongs to ONE stage:
//   'now'       needed to evaluate the quote: the drawing, the 3D model, and referenced public standards the engineer must read
//               (library standards QR can fetch). Only these can be missing / red, count in the tiles and the next-step line.
//   'routecard' needed later, for the production ROUTE CARD: customer specs (GEN_*, PS-*, RAFDOCS ...) and the customer's
//               certificate / report / traceability / packing requirements. Neutral, never missing, never blocks anything,
//               never a customer question. Stored per part, grouped by routing step.
// Pure logic, no dependencies. The renderer only reads part.routeCard and task.stage that this module produced.
const STAGE = { NOW: 'now', ROUTE: 'routecard' };

/** Rules table, first match wins (specific before generic). group = which routing step type the item belongs to. */
const RULES = [
  { id: 'material-cert', group: 'material', en: 'Material certificate / mill test report', he: 'תעודת חומר / דוח בדיקת יצרן',
    re: /\b(?:mill\s+(?:test|cert\w*)|mtr\b|material\s+(?:test\s+)?(?:cert\w*|report)|material\s+certification|chemical\s+(?:and|&)\s+mechanical|(?:chemical|mechanical)\s+(?:analysis|properties)\s+(?:cert|report)|heat\s+(?:no|number|lot)\b)|תעודת\s+חומר/i },
  { id: 'coating-cert', group: 'surface', en: 'Coating / plating certificate', he: 'תעודת ציפוי / טיפול שטח',
    re: /(?:coating|plating|anodi[sz]\w*|chromate|conversion|passivat\w*|finish\w*|paint\w*|alodine|process)\W+(?:\w+\W+){0,4}?(?:cert\w*|test\s+report)|(?:cert\w*|test\s+report)\W+(?:\w+\W+){0,4}?(?:coating|plating|anodi[sz]\w*|chromate|passivat\w*|finish\w*|paint\w*|alodine)|תעודת\s+ציפוי/i },
  { id: 'heat-cert', group: 'machining', en: 'Heat treatment certificate', he: 'תעודת טיפול תרמי',
    re: /heat\s+treat\w*\W+(?:\w+\W+){0,4}?(?:cert\w*|report)|(?:cert\w*|report)\W+(?:\w+\W+){0,4}?heat\s+treat\w*|תעודת\s+טיפול\s+תרמי/i },
  { id: 'coc', group: 'general', en: 'Certificate of conformance (CoC)', he: 'תעודת התאמה (CoC)',
    re: /\bC\.?\s?o\.?\s?C\b|\bC\s+of\s+C\b|\bCofC\b|cert\w*\s+of\s+(?:conformance|conformity|compliance)|declaration\s+of\s+(?:conformity|conformance|compliance)|תעודת\s+(?:התאמה|תאימות)|הצהרת\s+התאמה/i },
  { id: 'fai', group: 'inspection', en: 'First article inspection report (FAI / AS9102)', he: 'דוח בדיקת פריט ראשון (FAI / AS9102)',
    re: /\bFAIR?\b|\bAS\s?-?9102\b|first\s+article|פריט\s+ראשון/i },
  { id: 'inspection-report', group: 'inspection', en: 'Inspection / test report', he: 'דוח בדיקה / בדיקות',
    re: /(?:inspection|dimensional|test|cmm|measurement|final\s+inspection)\s+(?:report|certificate|results?)|report\s+of\s+(?:inspection|test)|test\s+certificate|דוח\s+(?:בדיקה|בדיקות|מדידה)/i },
  { id: 'traceability', group: 'general', en: 'Traceability (lot / batch / serial)', he: 'עקיבות (אצווה / סידורי)',
    re: /traceab\w*|(?:lot|batch|heat)\s+(?:number|no\b|code)|serial\s+(?:number\w*|no\b)\s+(?:record|log|list)|עקיבות/i },
  { id: 'compliance', group: 'general', en: 'Compliance declaration (RoHS / REACH)', he: 'הצהרת עמידה בתקנות (RoHS / REACH)',
    re: /\bRoHS\b|\bREACH\b|2002-95\/EC|conflict\s+minerals/i },
  { id: 'packing', group: 'packing', en: 'Packing / shipping requirement', he: 'דרישות אריזה ומשלוח',
    re: /\bGS-4P\d{5}\b|packing\s+(?:for\s+shipment|requirement|specification)|\bpackag\w+\s+(?:requirement|specification|per)|preservation\s+and\s+packag\w*/i },
  { id: 'certificate', group: 'general', en: 'Certificate required', he: 'נדרשת תעודה',
    re: /\bcert(?:s\b|ificates?\b|ification\b|ified\b)(?!\s+(?:inspector|welder|operator))|תעוד(?:ה|ות)\s+נלווה/i },
];

/** The first rule that matches a text, or null. */
function classifyText(text) {
  const s = String(text || ''); if (!s.trim()) return null;
  for (const r of RULES) if (r.re.test(s)) return r;
  return null;
}
/** Stage of a free text requirement or document title: 'routecard' when a rule matches, else 'now'. */
const stageOfText = (text) => (classifyText(text) ? STAGE.ROUTE : STAGE.NOW);

/** Customer-internal documents (GEN_*, PS-*, RAFDOCS-*, the customer's own drawing numbers) are specs for the route card.
 *  The separate part list is different: the engineer needs it to evaluate, so it stays 'now'. */
function stageOfRef(ref) {
  if (!ref) return STAGE.NOW;
  if (ref.number === 'SEPARATE PART LIST') return STAGE.NOW;
  if (ref.kind === 'internal') return STAGE.ROUTE;
  if (ref.kind === 'public' && classifyText(ref.number + ' ' + (ref.description || ''))) return STAGE.ROUTE;
  return STAGE.NOW;
}

/** A task counts toward missing / tiles / next-step only when it is an open upload task of stage 'now'. */
const taskStage = (t) => (t && t.stage) || STAGE.NOW;
const isOpenNowTask = (t) => !!t && t.type === 'uploadDocument' && t.status !== 'done' && taskStage(t) !== STAGE.ROUTE;

const GROUP_OF_STEP = { material: 'material', surface: 'surface', inspection: 'inspection', packing: 'packing', marking: 'marking', inserts: 'inserts', machining: 'machining' };
/** Route step a rule-based item attaches to: the first step of its group, else null (general). */
function stepFor(route, group) {
  if (!group || group === 'general') return null;
  return (route || []).find((s) => GROUP_OF_STEP[s.type] === group) || null;
}

/** Scans lines { text, where } with the rules table. One item per rule and line, deduplicated. */
function scanLines(lines) {
  const out = []; const seen = new Set();
  for (const l of lines || []) {
    const r = classifyText(l.text); if (!r) continue;
    const k = r.id + '|' + String(l.text).toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 80);
    if (seen.has(k)) continue; seen.add(k);
    out.push({ kind: 'doc', ruleId: r.id, group: r.group, text: r.en, textHe: r.he, line: String(l.text).replace(/\s+/g, ' ').trim().slice(0, 160), where: l.where || '' });
  }
  return out;
}

/**
 * Route card section of a part: customer specs + certificate / report / traceability requirements, grouped by routing step.
 * part: { route, refs, notes }. Returns { groups: [{ key, seq, title, type, items: [...] }], count }.
 */
function buildRouteCard(part) {
  const route = part.route || []; const groups = new Map();
  const grp = (step) => { const key = step ? 'step:' + step.seq : 'general'; if (!groups.has(key)) groups.set(key, { key, seq: step ? step.seq : '', title: step ? step.title : '', type: step ? step.type : 'general', items: [] }); return groups.get(key); };
  const stepOfRef = (num) => route.find((s) => (s.items || []).some((i) => String(i.text || '').includes(num)));
  for (const r of part.refs || []) {
    if (stageOfRef(r) !== STAGE.ROUTE) continue;
    const rule = classifyText(r.number + ' ' + (r.description || ''));
    const st = stepOfRef(r.number) || (rule ? stepFor(route, rule.group) : null);
    const g = grp(st); if (g.items.some((i) => i.number === r.number)) continue;
    g.items.push(rule && r.kind !== 'internal' ? { kind: 'doc', ruleId: rule.id, group: rule.group, text: rule.en, textHe: rule.he, number: r.number, line: r.raw || '', where: '' }
      : { kind: 'spec', number: r.number, desc: r.description || '', owner: r.owner || '', line: r.raw || '' });
  }
  const lines = [...(part.notes || []).map((n) => ({ text: n.text, where: 'note ' + n.n })), ...route.flatMap((s) => (s.items || []).map((i) => ({ text: i.text, where: 'routing ' + s.seq })))];
  for (const it of scanLines(lines)) {
    const rt = (part.refs || []).some((r) => r.kind === 'public' && it.line.includes(r.number) && stageOfRef(r) === STAGE.ROUTE && classifyText(r.number + ' ' + r.description) && classifyText(r.number + ' ' + r.description).id === it.ruleId);
    const g = grp(stepFor(route, it.group)); if (rt && g.items.some((i) => i.ruleId === it.ruleId)) continue;
    if (g.items.some((i) => i.ruleId === it.ruleId && i.kind === 'doc')) continue;
    g.items.push(it);
  }
  const order = (g) => (g.key === 'general' ? 9999 : parseInt(g.seq, 10) || 5000);
  const list = [...groups.values()].filter((g) => g.items.length).sort((a, b) => order(a) - order(b));
  return { groups: list, count: list.reduce((n, g) => n + g.items.length, 0) };
}

/** Adds Hebrew display fields (called by localizePart). */
function localizeRouteCard(rc, T) {
  if (!rc) return rc;
  for (const g of rc.groups || []) { g.typeHe = T.step(g.type); g.titleHe = g.title ? T.title(g.title) : ''; for (const i of g.items) if (i.kind === 'spec') { i.descHe = T.desc(i.desc); if (i.owner) i.ownerHe = T.owner(i.owner); } }
  return rc;
}

/** Idempotent: stage the tasks and build the route card on a part from an older project or analysis. Mutates and returns it. */
function upgradePart(part) {
  if (!part) return part;
  const refs = part.refs || [];
  for (const t of part.tasks || []) {
    if (t.type !== 'uploadDocument' || t.stage) continue;
    const ref = refs.find((r) => r.number === t.refNumber);
    t.stage = !t.std && ref && stageOfRef(ref) === STAGE.ROUTE ? STAGE.ROUTE : !t.std && !ref && t.refNumber !== 'SEPARATE PART LIST' && /^(?:GEN_|PS-|RAFDOCS|GS-4P)/.test(t.refNumber || '') ? STAGE.ROUTE : STAGE.NOW;
  }
  if (!part.routeCard || part.routeCard.v !== 1) { part.routeCard = { ...buildRouteCard(part), v: 1 }; }
  if (part.tasks) for (const s of part.route || []) if (s.blocked && !part.tasks.some((t) => isOpenNowTask(t) && (t.blocksVars || {}).seq === s.seq)) delete s.blocked;
  return part;
}

module.exports = { STAGE, RULES, classifyText, stageOfText, stageOfRef, taskStage, isOpenNowTask, scanLines, buildRouteCard, localizeRouteCard, upgradePart, stepFor };
