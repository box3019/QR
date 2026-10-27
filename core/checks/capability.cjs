'use strict';
// checks/capability: material + processes on a drawing vs the enabled capability catalog -> status + problems.
const { matchMaterial, detectProcesses } = require('../catalog/index.cjs');

/**
 * Pure. input { material|null, lines:[{text, where}], catalog:{materials, processes} }
 * -> { status, rejectReason, materialMatch|null, processes[], problems:[{severity, category, message, suggestion, where}] }
 */
function checkCapability({ material, lines, catalog }) {
  const problems = [];
  let status = 'pending', rejectReason = 'Material not found', materialMatch = null;
  if (material) {
    materialMatch = matchMaterial(material.raw, catalog.materials);
    if (materialMatch.allowed) { status = 'accepted'; rejectReason = ''; }
    else {
      status = 'rejected'; rejectReason = materialMatch.reason;
      problems.push({ severity: 'Blocker', category: 'Material', message: `${materialMatch.reason} — "${String(material.raw).slice(0, 60)}" (${material.source}).`, suggestion: 'Decline, or add/enable it in Settings → Materials.', where: material.source });
    }
  }
  const processes = detectProcesses(lines, catalog.processes);
  for (const p of processes) {
    if (p.status === 'ok') continue;
    const what = p.status === 'unmapped' ? 'not in the processes list' : `disabled (${p.entry.nameEn})`;
    problems.push({ severity: 'Question', category: 'Process', message: `${p.label} "${p.found}" (${p.where}) — ${what}.`, suggestion: p.status === 'unmapped' ? 'Outsource/decline, or add it in Settings → Processes.' : 'Outsource/decline, or enable it in Settings → Processes.', where: p.where, internal: true });
  }
  return { status, rejectReason, materialMatch, processes, problems };
}
module.exports = { checkCapability };
