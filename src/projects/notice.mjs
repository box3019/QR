// Plain reasons shown in a toast when an import gives nothing (never a silent failure). Pure logic.
const DRAW = /\.(pdf)$/i; const MODEL = /\.(step|stp|igs|iges|sldprt|x_t|x_b)$/i;
/** After a run with no parts: { key, vars } for t('notice.' + key). r = { files, other, unknown, errors, rfqs }. */
export function noPartsReason(r) {
  const x = r || {}; const files = x.files || []; const errs = (x.errors || []).map((e) => String((e && (e.file || e.name)) || '').split(/[\\/]/).pop()).filter(Boolean);
  const sj = ((x.rfqs || [])[0] || {}).subject || ''; const subject = sj ? '"' + sj + '"' : '';
  const names = (a) => a.slice(0, 4).join(', ') + (a.length > 4 ? ', ...' : '');
  if (errs.length) return { key: 'unreadable', vars: { subject, names: names(errs) } };
  if (!files.length) return { key: 'noAttach', vars: { subject } };
  if (!files.some((f) => DRAW.test(f) || MODEL.test(f))) return { key: 'otherOnly', vars: { subject, names: names(files) } };
  if ((x.unknown || []).length) return { key: 'specOnly', vars: { subject, names: names(x.unknown) } };
  return { key: 'noDrawings', vars: { subject, names: names(files) } };
}
