// Capture files the moment they are dropped. WinRAR deletes %TEMP%\Rar$DRa* right after drop;
// Explorer zip view often has a File with no real path. Copy or write into QR's DropCache first.
export async function captureDroppedFiles(files, api, opts) {
  const list = Array.from(files || []);
  const tries = (opts && opts.tries) || 8;
  const delayMs = (opts && opts.delayMs) != null ? opts.delayMs : 40;
  const session = api.startSession && api.startSession();
  const dir = session && session.dir;
  if (!dir) return { paths: [], failed: list.map((f) => ({ name: (f && f.name) || 'file', error: 'no-session' })), dir: '' };
  const jobs = list.map((f) => {
    const name = (f && (f.name || f.path)) || 'file';
    const bytesP = Promise.resolve(api.arrayBuffer(f)).catch(() => null);
    const src = (api.pathForFile && api.pathForFile(f)) || '';
    return captureOne({ name, src, bytesP }, dir, api, tries, delayMs);
  });
  const out = await Promise.all(jobs);
  return { paths: out.filter((x) => x.ok).map((x) => x.path), failed: out.filter((x) => !x.ok), dir };
}

async function captureOne(j, dir, api, tries, delayMs) {
  if (j.src) {
    let r = api.stagePath(dir, j.src, j.name);
    if (r && typeof r.then === 'function') r = await r;
    if (r && r.ok) return { ok: true, path: r.path, name: j.name };
    for (let i = 1; i < tries; i++) {
      if (api.sleep) await api.sleep(delayMs);
      r = api.stagePath(dir, j.src, j.name);
      if (r && typeof r.then === 'function') r = await r;
      if (r && r.ok) return { ok: true, path: r.path, name: j.name };
    }
  }
  const buf = await j.bytesP;
  if (buf && (buf.byteLength || buf.length)) {
    let r = api.stageBytes(dir, j.name, buf);
    if (r && typeof r.then === 'function') r = await r;
    if (r && r.ok) return { ok: true, path: r.path, name: j.name };
  }
  if (api.log) api.log('drop unreadable ' + j.name);
  return { ok: false, name: j.name, error: 'unreadable' };
}
