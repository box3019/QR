'use strict';
// Persist files dropped from WinRAR / Explorer zip / 7-Zip before the source temp files vanish.
// WinRAR may only finish writing %TEMP%\Rar$DRa* after the drop handler returns, and may hand us a folder.
const fs = require('fs');
const os = require('os');
const path = require('path');

const DROP_RETRY = { timeoutMs: 10000, delayMs: 50 };
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
  const e = ext.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 24);
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
  try { const st = fsio.statSync(p); return !!(st && st.isFile() && st.size > 0); } catch { return false; }
}

function dirHasEntries(p, io) {
  const fsio = io || fs;
  try {
    const names = fsio.readdirSync(p).filter((n) => n && n !== '.' && n !== '..');
    return names.length > 0;
  } catch { return false; }
}

function pathKind(p, io) {
  if (!p) return '';
  const fsio = io || fs;
  try {
    const st = fsio.statSync(p);
    if (st.isDirectory()) return dirHasEntries(p, fsio) ? 'dir' : 'empty-dir';
    if (st.isFile()) return st.size > 0 ? 'file' : 'empty';
  } catch {}
  return '';
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

function copyDirRecursive(src, dest, io) {
  const fsio = io || fs;
  fsio.mkdirSync(dest, { recursive: true });
  let names = [];
  try { names = fsio.readdirSync(src); } catch { return; }
  for (const n of names) {
    if (!n || n === '.' || n === '..') continue;
    const s = path.join(src, n);
    const d = path.join(dest, n);
    let st; try { st = fsio.statSync(s); } catch { continue; }
    if (st.isDirectory()) copyDirRecursive(s, d, fsio);
    else if (st.isFile()) fsio.copyFileSync(s, d);
  }
}

function copyNow(dir, src, name, io) {
  const fsio = io || fs;
  const kind = pathKind(src, fsio);
  if (kind === 'dir' || kind === 'empty-dir') return { ok: false, error: 'is-dir', kind };
  if (kind === 'empty') return { ok: false, error: 'empty', kind: 'file', size: 0 };
  if (kind !== 'file') return { ok: false, error: 'missing', kind: kind || 'missing' };
  fsio.mkdirSync(dir, { recursive: true });
  const dest = uniqueDest(dir, name, usedSet(dir, fsio));
  try {
    fsio.copyFileSync(src, dest);
    if (!fileReady(dest, fsio)) return { ok: false, error: 'copy empty', kind: 'file' };
    let size = 0; try { size = fsio.statSync(dest).size; } catch {}
    return { ok: true, path: dest, kind: 'file', size };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e), kind: 'file' };
  }
}

function copyTreeNow(dir, src, name, io) {
  const fsio = io || fs;
  const kind = pathKind(src, fsio);
  if (kind === 'file' || kind === 'empty' || kind === '' || kind === 'missing') return copyNow(dir, src, name, fsio);
  if (kind === 'empty-dir') return { ok: false, error: 'empty', kind: 'dir', size: 0 };
  fsio.mkdirSync(dir, { recursive: true });
  const dest = uniqueDest(dir, name, usedSet(dir, fsio));
  try {
    copyDirRecursive(src, dest, fsio);
    if (!dirHasEntries(dest, fsio)) return { ok: false, error: 'empty', kind: 'dir', size: 0 };
    return { ok: true, path: dest, kind: 'dir' };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e), kind: 'dir' };
  }
}

function writeNow(dir, name, bytes, io) {
  const fsio = io || fs;
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (!buf.length) return { ok: false, error: 'empty', kind: 'bytes', size: 0 };
  fsio.mkdirSync(dir, { recursive: true });
  const dest = uniqueDest(dir, name, usedSet(dir, fsio));
  try {
    fsio.writeFileSync(dest, buf);
    return { ok: true, path: dest, kind: 'bytes', size: buf.length };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e), kind: 'bytes' };
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

const Log = require('./dropLog.cjs');
const Temp = require('./dropTemp.cjs');

module.exports = {
  DROP_RETRY, DROP_MAX_AGE_MS, dropCacheRoot, dropFileName, uniqueDest, fileReady, pathKind,
  newDropDir, pruneDropCache, copyNow, copyTreeNow, writeNow, dropSessionOf, dropSessionsOf,
  dropLogPath: Log.dropLogPath, dropLogFiles: Log.dropLogFiles, writeDropLog: Log.writeDropLog,
  DROP_TEMP_WAIT_MS: Temp.DROP_TEMP_WAIT_MS, isDropTempName: Temp.isDropTempName, tempRoots: Temp.tempRoots,
  findNamedInTemp: Temp.findNamedInTemp, harvestNamed: Temp.harvestNamed, harvestOne: Temp.harvestOne,
  parseHdrop: Temp.parseHdrop, clipboardDropPaths: Temp.clipboardDropPaths,
};
