// Step 1 after loading: counts for the tiles and the file list grouped by part (replaces the empty grey area). Pure logic.
const MODEL = /\.(step|stp|igs|iges|sldprt|x_t|x_b)$/i;
const base = (s) => String(s || '').split(/[\\/]/).pop();
/** { tiles: { parts, files, drawings, models }, groups: [{ index, partNo, rev, files }], other: [names] } */
export function loadedSummary(parts = [], files = [], unknown = []) {
  const groups = (parts || []).map((p, i) => {
    const dn = base(p.drawing && p.drawing.name); const mn = p.model && p.model.path ? base(p.model.path) : '';
    return { index: i, partNo: p.partNo || dn || '', rev: p.rev || '', files: [...new Set([dn, mn, ...(p.duplicates || []).map(base)].filter(Boolean))], drawings: [dn, ...(p.duplicates || []).map(base)].filter(Boolean), model: mn };
  });
  const used = new Set(groups.flatMap((g) => g.files));
  const listed = [...new Set((files || []).map(base).filter(Boolean))];
  const other = listed.filter((n) => !used.has(n));
  const all = new Set([...listed, ...used]);
  const drawings = new Set(groups.flatMap((g) => g.drawings));
  const models = new Set([...[...all].filter((n) => MODEL.test(n)), ...groups.map((g) => g.model).filter(Boolean)]);
  return { tiles: { parts: groups.length, files: all.size, drawings: drawings.size, models: models.size }, groups: groups.map(({ index, partNo, rev, files: f }) => ({ index, partNo, rev, files: f })), other, unknown: (unknown || []).map(base) };
}
/** The loaded summary replaces the import view once nothing is being read. */
export const showLoaded = (view, nParts) => nParts > 0 && !(view && view.active);
