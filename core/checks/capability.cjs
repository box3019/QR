'use strict';
// checks/capability: material + processes on a drawing vs the enabled capability catalog -> status + problems.
const { matchMaterial, detectProcesses } = require('../catalog/index.cjs');
const { problem } = require('../i18n/messages.cjs');

/**
 * Pure. input { material|null, lines:[{text, where}], catalog:{materials, processes} }
 * -> { status, rejectReason, materialMatch|null, processes[], problems:[{severity, category, message, suggestion, where}] }
 */
function checkCapability({ material, lines, catalog }) {
  const problems = [];
  let status = 'pending', rejectReason = 'Material not found', materialMatch = null, rejectKey = { key: 'mat.none', vars: {} };
  if (material) {
    materialMatch = matchMaterial(material.raw, catalog.materials);
    if (materialMatch.allowed) { status = 'accepted'; rejectReason = ''; rejectKey = null; }
    else {
      status = 'rejected'; rejectReason = materialMatch.reason;
      const m = materialMatch, e = m.entry;
      const key = !e ? 'mat.notInList' : e.enabled === false ? 'mat.disabled' : 'mat.temper';
      problems.push(problem('Blocker', 'Material', key, { found: m.found, raw: String(material.raw).slice(0, 60), src: material.source, temper: m.temper, list: e && e.tempers ? e.tempers.join(', ') : '' }, { where: material.source }));
      rejectKey = { key, vars: problems[problems.length - 1].vars };
    }
  }
  const processes = detectProcesses(lines, catalog.processes);
  for (const p of processes) {
    if (p.status === 'ok') continue;
    problems.push(problem('Question', 'Process', p.status === 'unmapped' ? 'proc.unmapped' : 'proc.disabled', { label: p.label, found: p.found, where: p.where, entry: p.entry ? p.entry.nameEn : '' }, { where: p.where, internal: true }));
  }
  return { status, rejectReason, rejectKey, materialMatch, processes, problems };
}
module.exports = { checkCapability };
