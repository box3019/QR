'use strict';
// Persist files dropped from WinRAR / Explorer zip / 7-Zip before the source temp files vanish.
const fs = require('fs');
const os = require('os');
const path = require('path');

const DROP_RETRY = { tries: 8, delayMs: 40 };
const DROP_MAX_AGE_MS = 48 * 3600 * 1000;

function dropCacheRoot(env, tmp) {
  const e = env || process.env;
  if (e.LOCALAPPDATA) return path.join(e.LOCALAPPDATA, 'QR', 'DropCache');
  return path.join(tmp || os.tmpdir(), 'QR', 'DropCache');
}

function dropFileName(name) {
  const base = String(name || '').replace(/\\/g, '/').split('/').pop() || '';
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length).trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/[. ]+$/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  const e = ext.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 12);
  return (stem || 'file') + e;
}

function uniqueDest(dir, name, used) {
  const seen = used || new Set();
  const safe = dropFileName(name);
  const ext = path.extname(safe);
  const stem = safe.slice(0, safe.length - ext.length) || 'file';
  let dest = path.join(dir, stem + ext);
  let n = 2;
  const key = (p) => String(p).toLowerCase();
  while (seen.has(key(dest))) {
    dest = path.join(dir, stem + ' (' + n + ')' + ext);
    n++;
  }
  seen.add(key(dest));
  return dest;
}

const usedByDir = new Map();
function usedSet(dir, io) {
  const fsio = io || fs;
  if (!usedByDir.has(dir)) {
    const s = new Set();
    try { fsio.readdirSync(dir).forEach((n) => s.add(path.join(dir, n).toLowerCase())); } catch {}
    usedByDir.set(dir, s);
  }
  return usedByDir.get(dir);
}

function fileReady(p, io) {
  const fsio = io || fs;
  try { const st = fsio.statSync(p); return !!(st && st.isFile()); } catch { return false; }
}

function newDropDir(root, now, io) {
  const fsio = io || fs;
  const base = root || dropCacheRoot();
  pruneDropCache(base, DROP_MAX_AGE_MS, fsio, now);
  const stamp = String(now || Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
  const dir = path.join(base, stamp);
  fsio.mkdirSync(dir, { recursive: true });
  usedByDir.delete(dir);
  return dir;
}

function pruneDropCache(root, maxAgeMs, io, now) {
  const fsio = io || fs;
  const t = now || Date.now();
  let names = [];
  try { names = fsio.readdirSync(root); } catch { return []; }
  const gone = [];
  for (const n of names) {
    const p = path.join(root, n);
    let st; try { st = fsio.statSync(p); } catch { continue; }
    if (!st.isDirectory()) continue;
    if (t - (st.mtimeMs || 0) > maxAgeMs) {
      try { fsio.rmSync(p, { recursive: true, force: true }); gone.push(p); } catch {}
    }
  }
  return gone;
}

function copyNow(dir, src, name, io) {
  const fsio = io || fs;
  if (!src || !fileReady(src, fsio)) return { ok: false, error: 'missing' };
  fsio.mkdirSync(dir, { recursive: true });
  const dest = uniqueDest(dir, name, usedSet(dir, fsio));
  try {
    fsio.copyFileSync(src, dest);
    if (!fileReady(dest, fsio)) return { ok: false, error: 'copy empty' };
    return { ok: true, path: dest };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}

function writeNow(dir, name, bytes, io) {
  const fsio = io || fs;
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (!buf.length) return { ok: false, error: 'empty' };
  fsio.mkdirSync(dir, { recursive: true });
  const dest = uniqueDest(dir, name, usedSet(dir, fsio));
  try {
    fsio.writeFileSync(dest, buf);
    return { ok: true, path: dest };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}

function dropSessionOf(file, root) {
  const base = root || dropCacheRoot();
  const rel = path.relative(base, String(file || ''));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return '';
  const first = rel.split(/[/\\]/)[0];
  return first ? path.join(base, first) : '';
}

function dropSessionsOf(paths, root) {
  const out = new Set();
  for (const p of paths || []) {
    const d = dropSessionOf(p, root);
    if (d) out.add(d);
  }
  return [...out];
}

module.exports = {
  DROP_RETRY, DROP_MAX_AGE_MS, dropCacheRoot, dropFileName, uniqueDest, fileReady,
  newDropDir, pruneDropCache, copyNow, writeNow, dropSessionOf, dropSessionsOf,
};
