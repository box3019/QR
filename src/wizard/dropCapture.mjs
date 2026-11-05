// Capture files the moment they are dropped. WinRAR may only write %TEMP%\Rar$DRa* after the
// drop event returns, and may hand us a folder (PRODUCT.ZIP_1_123). Explorer zip view often has
// a File with no real path. Copy or write into QR's DropCache; poll the path up to ~5s.
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_DELAY_MS = 50;

function bytesLen(buf) {
  if (!buf) return 0;
  return buf.byteLength || buf.length || 0;
}

function logFail(api, rec) {
  if (!api || !api.log) return;
  api.log('drop fail name=' + rec.name
    + ' type=' + (rec.type || '')
    + ' size=' + (rec.size != null && rec.size !== '' ? rec.size : '')
    + ' path=' + (rec.src || '')
    + ' kind=' + (rec.kind || '')
    + ' error=' + (rec.error || 'unreadable'));
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
      logFail(api, rec);
      return rec;
    });
    return { paths: [], failed, dir: '' };
  }
  const jobs = list.map((f) => {
    const name = (f && (f.name || f.path)) || 'file';
    const bytesP = Promise.resolve(api.arrayBuffer(f)).catch(() => null);
    const src = (api.pathForFile && api.pathForFile(f)) || (f && f.path) || '';
    return captureOne({
      name,
      src,
      bytesP,
      size: f && f.size,
      type: (f && f.type) || '',
    }, dir, api, timeoutMs, delayMs, tries);
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
    logFail(api, rec);
    return rec;
  };
  let last = { error: 'unreadable', kind: '' };

  if (j.src) {
    let r = api.stagePath(dir, j.src, j.name);
    if (r && typeof r.then === 'function') r = await r;
    if (r && r.ok) return { ok: true, path: r.path, name: j.name };
    if (r) last = r;
  }

  let buf = null;
  let bytesSettled = false;
  Promise.resolve(j.bytesP).then((b) => { buf = b; bytesSettled = true; }).catch(() => { buf = null; bytesSettled = true; });

  const tryBytes = async () => {
    if (!bytesLen(buf)) return null;
    let r = api.stageBytes(dir, j.name, buf);
    if (r && typeof r.then === 'function') r = await r;
    return r;
  };
  const tryPath = async () => {
    if (!j.src) return null;
    let r = api.stagePath(dir, j.src, j.name);
    if (r && typeof r.then === 'function') r = await r;
    return r;
  };

  const started = Date.now();
  let n = 1;
  while (n < tries && Date.now() - started < timeoutMs) {
    n++;
    if (api.sleep) await api.sleep(delayMs);
    else await Promise.resolve();
    if (bytesSettled) {
      const br = await tryBytes();
      if (br && br.ok) return { ok: true, path: br.path, name: j.name };
      if (br) last = br;
      else if (!bytesLen(buf)) last = { error: 'empty-bytes', kind: last.kind || '' };
    }
    const pr = await tryPath();
    if (pr && pr.ok) return { ok: true, path: pr.path, name: j.name };
    if (pr) last = pr;
  }

  if (!bytesSettled && !j.src) {
    try { buf = await j.bytesP; } catch { buf = null; }
    bytesSettled = true;
  }
  const br = await tryBytes();
  if (br && br.ok) return { ok: true, path: br.path, name: j.name };
  if (br) last = br;
  else if (bytesSettled && !bytesLen(buf)) last = { error: last.error && last.error !== 'unreadable' ? last.error : 'empty-bytes', kind: last.kind || '' };
  const pr = await tryPath();
  if (pr && pr.ok) return { ok: true, path: pr.path, name: j.name };
  if (pr) last = pr;
  return fail(last.error || 'unreadable', last);
}
