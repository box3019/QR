// Material triage of a package: Suitable (shop list) vs Not suitable vs Material not detected. Nothing is deleted; the user can move a part.
export const TRIAGE_ORDER = ['suitable', 'notSuitable', 'unknown'];

/** Auto list from detected material vs the shop catalog (accepted = suitable). */
export function autoTriage(part) {
  if (!part) return 'unknown';
  const mat = part.material && (part.material.normalized || part.material.raw);
  if (!mat) return 'unknown';
  if (part.status === 'rejected') return 'notSuitable';
  if (part.status === 'accepted') return 'suitable';
  return 'unknown';
}

/** Effective list after a manual move. */
export function triageListOf(part) {
  const over = part && part.triageList;
  if (over === 'suitable' || over === 'notSuitable') return over;
  return autoTriage(part);
}

export function triageReason(part) {
  const mat = (part && part.material && (part.material.normalized || part.material.raw)) || '';
  const zone = (part && part.material && part.material.source) || '';
  const moved = !!(part && part.triageList);
  return { material: mat, zone, moved, auto: autoTriage(part) };
}

export function moveTriage(part, list) {
  if (list !== 'suitable' && list !== 'notSuitable') return part;
  return { ...part, triageList: list };
}

export function setInclude(part, on) {
  return { ...part, includeInReport: !!on };
}

export function isIncluded(part) {
  if (part && part.includeInReport === false) return false;
  if (part && part.includeInReport === true) return true;
  return triageListOf(part) === 'suitable';
}

export function triageLists(parts) {
  const lists = { suitable: [], notSuitable: [], unknown: [] };
  (parts || []).forEach((part, index) => { lists[triageListOf(part)].push({ part, index }); });
  return lists;
}

/** Counts for the cover: processed = included suitable parts. */
export function triageCounts(parts) {
  const lists = triageLists(parts);
  const n = (parts || []).length;
  const processed = (parts || []).filter((p) => isIncluded(p) && triageListOf(p) === 'suitable').length;
  return { total: n, suitable: lists.suitable.length, notSuitable: lists.notSuitable.length, unknown: lists.unknown.length, processed };
}

export function includedParts(parts) {
  return (parts || []).filter(isIncluded);
}

/** Which parts to save as separate PDFs: checked (include box), all suitable, or all. */
export function saveEachIndexes(parts, which) {
  const list = parts || [];
  if (which === 'all') return list.map((_, i) => i);
  if (which === 'checked') return list.map((p, i) => (isIncluded(p) ? i : -1)).filter((i) => i >= 0);
  return list.map((p, i) => (triageListOf(p) === 'suitable' ? i : -1)).filter((i) => i >= 0);
}

export function saveEachCounts(parts) {
  const list = parts || [];
  return { checked: list.filter(isIncluded).length, suitable: list.filter((p) => triageListOf(p) === 'suitable').length, all: list.length };
}
