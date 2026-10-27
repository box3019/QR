// Summary PDF report export: header meta from the project tab, language from the export language setting.
export async function exportReport(parts: any[], lang: string, meta: any) {
  const m = { rfq: meta?.label || '', customer: meta?.customer || '' };
  const r = await (window as any).qr.exportReport(parts, lang === 'en' ? 'en' : 'he', m);
  if (r && r.path) (window as any).qr.openPath(r.path);
  return r;
}
