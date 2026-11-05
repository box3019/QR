// Capture files the moment they are dropped. WinRAR delayed-renders nested archives
// (BK49998A.rar inside vhgfhgfhghg.rar) to %TEMP%\Rar$DRa* only when OLE GetData runs;
// Chromium's HTML5 drop often gives a 0-byte File with no path. Copy into DropCache first,
// harvest matching names from Rar$DRa*/7z* temp folders, poll up to ~10s, log every failure.
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_DELAY_MS = 50;

function bytesLen(buf) {
  if (!buf) return 0;
  return buf.byteLength || buf.length || 0;
}

function logLine(api, rec, extra) {
  if (!api || !api.log) return;
  api.log('drop ' + (extra || 'fail')
    + ' name=' + rec.name
    + ' type=' + (rec.type || '')
    + ' size=' + (rec.size != null && rec.size !== '' ? rec.size : '')
    + ' path=' + (rec.src || '')
    + ' kind=' + (rec.kind || '')
    + ' error=' + (rec.error || ''));
}

export async function captureDroppedFiles(files, api, opts) {
  const delayMs = (opts && opts.delayMs) != null ? opts.delayMs : DEFAULT_DELAY_MS;
  const timeoutMs = (opts && opts.timeoutMs) != null ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  const tries = (opts && opts.tries) != null ? opts.tries : Math.ceil(timeoutMs / Math.max(delayMs, 1)) + 1;
  const list = Array.from(files || []);
  const session = api.startSession && api.startSession();
  const dir = session && session.dir;
  if (!dir) {
    const failed = list.map((f) => {
      const rec = { name: (f && f.name) || 'file', error: 'no-session', type: (f && f.type) || '', size: f && f.size, src: '', kind: '' };
      logLine(api, rec);
      return rec;
    });
    return { paths: [], failed, dir: '' };
  }
  const jobs = list.map((f) => {
    const name = (f && (f.name || f.path)) || 'file';
    const bytesP = Promise.resolve(api.arrayBuffer(f)).catch(() => null);
    const src = (api.pathForFile && api.pathForFile(f)) || (f && f.path) || '';
    const size = f && f.size;
    const type = (f && f.type) || '';
    logLine(api, { name, type, size, src, kind: '', error: '' }, 'begin');
    return captureOne({ name, src, bytesP, size, type }, dir, api, timeoutMs, delayMs, tries);
  });
  const out = await Promise.all(jobs);
  return { paths: out.filter((x) => x.ok).map((x) => x.path), failed: out.filter((x) => !x.ok), dir };
}

async function captureOne(j, dir, api, timeoutMs, delayMs, tries) {
  const fail = (error, extra) => {
    const rec = {
      ok: false,
      name: j.name,
      error: error || 'unreadable',
      src: j.src || '',
      type: j.type || '',
      size: extra && extra.size != null ? extra.size : j.size,
      kind: (extra && extra.kind) || '',
    };
    logLine(api, rec);
    return rec;
  };
  let last = { error: 'unreadable', kind: '' };

  const take = (r) => {
    if (!r) return null;
    last = r;
    return r.ok ? r : null;
  };

  let hit = null;
  try { hit = j.src ? take(api.stagePath(dir, j.src, j.name)) : null; } catch (e) { last = { error: (e && e.message) || String(e), kind: 'path' }; }
  if (hit) return { ok: true, path: hit.path, name: j.name };
  try { if (api.harvestTemp) hit = take(api.harvestTemp(dir, j.name, j.size)); } catch (e) { last = { error: (e && e.message) || String(e), kind: 'temp' }; }
  if (hit) return { ok: true, path: hit.path, name: j.name };

  let buf = null;
  let bytesSettled = false;
  Promise.resolve(j.bytesP).then((b) => { buf = b; bytesSettled = true; }).catch(() => { buf = null; bytesSettled = true; });

  const tryBytes = () => {
    if (!bytesLen(buf)) return null;
    return take(api.stageBytes(dir, j.name, buf));
  };
  const tryPath = () => (j.src ? take(api.stagePath(dir, j.src, j.name)) : null);
  const tryTemp = () => (api.harvestTemp ? take(api.harvestTemp(dir, j.name, j.size)) : null);

  const started = Date.now();
  let n = 1;
  while (n < tries && Date.now() - started < timeoutMs) {
    n++;
    if (api.sleep) await api.sleep(delayMs);
    else await Promise.resolve();
    const hit = tryBytes() || tryPath() || tryTemp();
    if (hit && hit.ok) return { ok: true, path: hit.path, name: j.name };
    if (bytesSettled && !bytesLen(buf)) last = { error: last.error && last.error !== 'unreadable' ? last.error : 'empty-bytes', kind: last.kind || '' };
  }

  if (!bytesSettled && !j.src) {
    try { buf = await j.bytesP; } catch { buf = null; }
    bytesSettled = true;
  }
  const lastHit = tryBytes() || tryPath() || tryTemp();
  if (lastHit && lastHit.ok) return { ok: true, path: lastHit.path, name: j.name };
  if (bytesSettled && !bytesLen(buf) && (!last || last.error === 'unreadable')) last = { error: 'empty-bytes', kind: last.kind || '' };
  return fail(last.error || 'unreadable', last);
}
