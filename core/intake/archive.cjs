'use strict';
// intake/archive: unpack ZIP (yauzl) and RAR (node-unrar-js WASM) in-process; never WinRAR. 7z still uses bundled 7-Zip.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { execFile } = require('child_process');

const MAX_UNCOMPRESSED = 2 * 1024 * 1024 * 1024;
const MAX_FILES = 20000;
const ZIP_NEST_DEPTH = 3;
const CACHE_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const CACHE_MAX_DIRS = 40;
const CACHE_MARKER = '.qr-ok';

// CP437 0x80-0xFF (IBM PC), then CP862 replaces 0x80-0x9A with Hebrew letters.
const CP437_HI = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0';
const CP862_HEB = 'אבגדהוזחטיךכלםמןנסעףפץצקרשת';

const defaultImportCache = () => {
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'QR', 'ImportCache');
  return path.join(os.homedir(), 'AppData', 'Local', 'QR', 'ImportCache');
};

const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function winLong(p) {
  if (process.platform !== 'win32') return p;
  const abs = path.resolve(p);
  if (abs.startsWith('\\\\?\\')) return abs;
  if (abs.length < 248) return abs;
  return abs.startsWith('\\\\') ? '\\\\?\\UNC\\' + abs.slice(2) : '\\\\?\\' + abs;
}

function decodeCp(buf, hi) {
  let s = '';
  for (const b of buf) s += b < 128 ? String.fromCharCode(b) : hi[b - 128];
  return s;
}
function isUtf8(buf) {
  try { return Buffer.from(buf.toString('utf8'), 'utf8').equals(buf); } catch { return false; }
}
function unicodePath(extraFields) {
  const f = (extraFields || []).find((x) => x.id === 0x7075);
  if (!f || !f.data || f.data.length < 5) return '';
  try { return f.data.slice(5).toString('utf8'); } catch { return ''; }
}
/** Decode a ZIP entry name: UTF-8 (EFS / Info-ZIP extra), else Hebrew CP862, else CP437. */
function decodeZipName(name, flags, extraFields) {
  const uni = unicodePath(extraFields);
  if (uni) return uni;
  const buf = Buffer.isBuffer(name) ? name : Buffer.from(String(name), 'binary');
  if ((flags & 0x800) !== 0) return buf.toString('utf8');
  if (isUtf8(buf) && [...buf].some((b) => b >= 0x80)) return buf.toString('utf8');
  if ([...buf].some((b) => b >= 0x80 && b <= 0x9A)) return decodeCp(buf, CP862_HEB + CP437_HI.slice(CP862_HEB.length));
  return decodeCp(buf, CP437_HI);
}

function safeRel(rel) {
  const raw = String(rel).replace(/\\/g, '/');
  if (!raw || raw.startsWith('/') || raw.startsWith('//') || /^[a-zA-Z]:/.test(raw)) throw new Error('Unsafe path in archive: ' + rel);
  const n = raw.replace(/^\/+/, '');
  const parts = n.split('/').filter((p) => p && p !== '.');
  if (!parts.length || parts.some((p) => p === '..' || p.includes('\0'))) throw new Error('Unsafe path in archive: ' + rel);
  return parts.join(path.sep);
}
const safeJoin = (root, rel) => {
  const base = path.resolve(root);
  const dest = path.resolve(base, safeRel(rel));
  const prefix = base.endsWith(path.sep) ? base : base + path.sep;
  if (dest !== base && !dest.startsWith(prefix)) throw new Error('Unsafe path in archive: ' + rel);
  return dest;
};

function uniquePath(dest) {
  if (!fs.existsSync(dest)) return dest;
  const dir = path.dirname(dest), ext = path.extname(dest), stem = path.basename(dest, ext);
  let i = 2, p;
  do { p = path.join(dir, stem + '_' + i + ext); i++; } while (fs.existsSync(p));
  return p;
}

function zipError(file, e) {
  const m = String((e && e.message) || e);
  const name = path.basename(file);
  if (/encrypted|password/i.test(m)) return new Error('Cannot open ' + name + ': the ZIP is password-protected. Remove the password and try again.');
  if (/Unsafe path/i.test(m) || /too large|too many files/i.test(m)) return e instanceof Error ? e : new Error(m);
  return new Error('Cannot open ' + name + ': the ZIP is damaged or unreadable.');
}

function rarError(file, e) {
  const m = String((e && e.message) || e);
  const name = path.basename(file);
  if (/encrypted|password/i.test(m)) return new Error('Cannot open ' + name + ': the RAR is password-protected. Remove the password and try again.');
  if (/Unsafe path/i.test(m) || /too large|too many files/i.test(m)) return e instanceof Error ? e : new Error(m);
  return new Error('Cannot open ' + name + ': the RAR is damaged or unreadable.');
}

const isZipName = (f) => /\.zip$/i.test(f);
const isRarName = (f) => /\.rar$/i.test(f);
/** ZIP local-file header PK\x03\x04; RAR4/RAR5 marker Rar!. */
function archiveMagic(buf) {
  if (!buf || buf.length < 4) return '';
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return 'zip';
  if (buf[0] === 0x52 && buf[1] === 0x61 && buf[2] === 0x72 && buf[3] === 0x21) return 'rar';
  return '';
}
function peekArchiveKind(file) {
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(8);
      const n = fs.readSync(fd, buf, 0, 8, 0);
      return archiveMagic(n > 0 ? buf.subarray(0, n) : buf);
    } finally { try { fs.closeSync(fd); } catch {} }
  } catch { return ''; }
}
/** ZIP and RAR: in-process, cached, nest depth ZIP_NEST_DEPTH. Name or magic (WinRAR temp names like X.ZIP_1_123). */
const isInProcessArchive = (f) => isZipName(f) || isRarName(f) || peekArchiveKind(f) === 'zip' || peekArchiveKind(f) === 'rar';

function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function unrar(file, outDir, opts = {}) {
  const { createExtractorFromData } = await import('node-unrar-js');
  let extractor;
  try {
    extractor = await createExtractorFromData({ data: toArrayBuffer(fs.readFileSync(file)) });
  } catch (e) { throw rarError(file, e); }
  let list;
  try { list = extractor.getFileList(); } catch (e) { throw rarError(file, e); }
  if (list && list.arcHeader && list.arcHeader.flags && list.arcHeader.flags.headerEncrypted) throw rarError(file, new Error('encrypted'));
  let headers;
  try { headers = [...(list.fileHeaders || [])]; } catch (e) { throw rarError(file, e); }
  if (headers.length > MAX_FILES) throw new Error('Archive has too many files (' + headers.length + ').');
  for (const h of headers) {
    if (h.flags && h.flags.directory) continue;
    if (h.flags && h.flags.encrypted) throw rarError(file, new Error('encrypted'));
    try { safeRel(String(h.name || '')); } catch (x) { throw x; }
  }
  const out = [];
  const names = opts.names;
  let written = 0;
  let files = 0;
  let extracted;
  try { extracted = extractor.extract({}); } catch (e) { throw rarError(file, e); }
  try {
    for (const f of extracted.files) {
      const h = f.fileHeader || {};
      const flags = h.flags || {};
      if (flags.directory) continue;
      if (flags.encrypted) throw rarError(file, new Error('encrypted'));
      files++;
      if (files > MAX_FILES) throw new Error('Archive has too many files.');
      const inner = String(h.name || '').replace(/\\/g, '/');
      const size = Number(h.unpSize) || (f.extraction ? f.extraction.length : 0);
      if (written + size > MAX_UNCOMPRESSED) throw new Error('Archive is too large to unpack (over 2 GB uncompressed).');
      let dest;
      try { dest = uniquePath(winLong(safeJoin(outDir, inner))); } catch (x) { throw x; }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (typeof opts.onProgress === 'function') try { opts.onProgress({ i: files, n: headers.length || files, name: inner }); } catch {}
      const buf = f.extraction ? Buffer.from(f.extraction) : Buffer.alloc(0);
      written += buf.length;
      if (written > MAX_UNCOMPRESSED) throw new Error('Archive is too large to unpack (over 2 GB uncompressed).');
      fs.writeFileSync(dest, buf);
      out.push(dest);
      if (names) names.set(dest, inner.replace(/\//g, path.sep));
    }
  } catch (e) {
    if (e instanceof Error && /Cannot open |Unsafe path|too many|too large/i.test(e.message)) throw e;
    throw rarError(file, e);
  }
  return out;
}

function pruneImportCache(root, keepDir) {
  if (!root || !fs.existsSync(root)) return;
  let entries = [];
  try { entries = fs.readdirSync(root).map((n) => { const p = path.join(root, n); let st; try { st = fs.statSync(p); } catch { return null; } return { p, mtime: st.mtimeMs }; }).filter(Boolean); } catch { return; }
  const now = Date.now();
  const keep = keepDir ? path.resolve(keepDir) : '';
  for (const e of entries) {
    if (keep && path.resolve(e.p) === keep) continue;
    if (now - e.mtime > CACHE_MAX_AGE_MS) try { fs.rmSync(e.p, { recursive: true, force: true }); } catch {}
  }
  try { entries = fs.readdirSync(root).map((n) => { const p = path.join(root, n); let st; try { st = fs.statSync(p); } catch { return null; } return { p, mtime: st.mtimeMs }; }).filter(Boolean).sort((a, b) => a.mtime - b.mtime); } catch { return; }
  while (entries.length > CACHE_MAX_DIRS) {
    const e = entries.shift();
    if (keep && path.resolve(e.p) === keep) continue;
    try { fs.rmSync(e.p, { recursive: true, force: true }); } catch {}
  }
}

function jobCacheBucket(root, jobId) {
  const base = root || defaultImportCache();
  const id = String(jobId || '');
  if (!/^[a-z0-9-]{4,64}$/i.test(id)) return base;
  return path.join(base, id);
}

function cacheDirFor(file, root, jobId) {
  const bucket = jobCacheBucket(root, jobId);
  const dir = path.join(bucket, sha256File(file));
  pruneImportCache(bucket, dir);
  return dir;
}

/** Delete this job's ImportCache folder. History/project.json is not touched. */
function releaseJobCache(root, jobId) {
  const id = String(jobId || '');
  if (!/^[a-z0-9-]{4,64}$/i.test(id)) return false;
  const dir = path.join(root || defaultImportCache(), id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

function walk(d) {
  const out = [];
  if (!fs.existsSync(d)) return out;
  for (const n of fs.readdirSync(d)) {
    if (n === CACHE_MARKER) continue;
    const p = path.join(d, n);
    let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

function unzip(file, outDir, opts = {}) {
  const yauzl = require('yauzl');
  const names = opts.names;
  return new Promise((res, rej) => yauzl.open(file, { lazyEntries: true, decodeStrings: false, strictFileNames: false }, (err, z) => {
    if (err) return rej(zipError(file, err));
    const out = [];
    let written = 0;
    let files = 0;
    const nTotal = z.entryCount || 0;
    if (nTotal > MAX_FILES) { z.close(); return rej(new Error('Archive has too many files (' + nTotal + ').')); }
    let done = false;
    const fail = (e) => {
      if (done) return; done = true;
      try { z.close(); } catch {}
      rej(e instanceof Error && /Cannot open |Unsafe path|too many|too large/i.test(e.message) ? e : zipError(file, e));
    };
    z.readEntry();
    z.on('entry', (e) => {
      const flags = e.generalPurposeBitFlag || 0;
      const inner = decodeZipName(e.fileName, flags, e.extraFields).replace(/\\/g, '/');
      if (/\/$/.test(inner) || (e.uncompressedSize === 0 && /[\\/]$/.test(String(e.fileName)))) return z.readEntry();
      if (flags & 1) return fail(new Error('encrypted'));
      files++;
      if (files > MAX_FILES) return fail(new Error('Archive has too many files.'));
      const size = e.uncompressedSize || 0;
      if (written + size > MAX_UNCOMPRESSED) return fail(new Error('Archive is too large to unpack (over 2 GB uncompressed).'));
      let dest;
      try { dest = uniquePath(winLong(safeJoin(outDir, inner))); } catch (x) { return fail(x); }
      try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch (x) { return fail(x); }
      if (typeof opts.onProgress === 'function') try { opts.onProgress({ i: files, n: nTotal, name: inner }); } catch {}
      z.openReadStream(e, (er, s) => {
        if (er) return fail(er);
        let chunk = 0;
        const ws = fs.createWriteStream(dest);
        s.on('data', (b) => {
          chunk += b.length; written += b.length;
          if (written > MAX_UNCOMPRESSED) { s.destroy(); ws.destroy(); fail(new Error('Archive is too large to unpack (over 2 GB uncompressed).')); }
        });
        s.on('error', fail);
        ws.on('error', fail);
        s.pipe(ws).on('finish', () => {
          out.push(dest);
          if (names) names.set(dest, inner.replace(/\//g, path.sep));
          z.readEntry();
        });
      });
    });
    z.on('end', () => { if (!done) { done = true; res(out); } });
    z.on('error', fail);
  }));
}

/** Default 7z.exe location: packaged resources/7zip, else repo vendor/7zip. */
function defaultSevenZip() {
  const cands = [process.resourcesPath && path.join(process.resourcesPath, '7zip', '7z.exe'), path.join(__dirname, '..', '..', 'vendor', '7zip', '7z.exe')].filter(Boolean);
  return cands.find((c) => fs.existsSync(c)) || cands[cands.length - 1];
}

function sevenZip(file, outDir, exe) {
  return new Promise((res, rej) => execFile(exe || defaultSevenZip(), ['x', '-y', '-bd', '-p-', '-o' + outDir, file], { windowsHide: true, maxBuffer: 32 << 20 }, (err, _o, se) => {
    if (err) return rej(new Error(`Cannot unpack ${path.basename(file)}: ${(se || err.message).trim().split('\n').pop()}`));
    res(walk(outDir));
  }));
}

/** If outDir holds exactly one folder and nothing else, move its contents up one level (e.g. X.rar -> X/X/...). */
function flattenSingleFolder(outDir) {
  const items = fs.readdirSync(outDir).filter((n) => n !== CACHE_MARKER);
  if (items.length !== 1) return false;
  const inner = path.join(outDir, items[0]);
  if (!fs.statSync(inner).isDirectory()) return false;
  for (const n of fs.readdirSync(inner)) fs.renameSync(path.join(inner, n), path.join(outDir, n));
  fs.rmdirSync(inner);
  return true;
}

async function extractInProcess(file, outDir, opts, unpack, wrapError, flatten) {
  const marker = path.join(outDir, CACHE_MARKER);
  if (fs.existsSync(marker)) return walk(outDir);
  try {
    await unpack(file, outDir, opts);
    if (flatten) flattenSingleFolder(outDir);
    fs.writeFileSync(marker, 'ok');
  } catch (e) {
    try { fs.rmSync(outDir, { recursive: true, force: true }); } catch {}
    throw e instanceof Error ? e : wrapError(file, e);
  }
  return walk(outDir);
}

/** Unpack any supported archive into outDir. ZIP and RAR are in-process only. @returns {Promise<string[]>} */
async function extractArchive(file, outDir, opts = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const mag = peekArchiveKind(file);
  if (isZipName(file)) return extractInProcess(file, outDir, opts, unzip, zipError, false);
  if (mag === 'zip') return extractInProcess(file, outDir, opts, unzip, zipError, false);
  if (isRarName(file)) return extractInProcess(file, outDir, opts, unrar, rarError, true);
  if (mag === 'rar') return extractInProcess(file, outDir, opts, unrar, rarError, true);
  await sevenZip(file, outDir, opts.sevenZip);
  flattenSingleFolder(outDir);
  return walk(outDir);
}

module.exports = {
  extractArchive, flattenSingleFolder, defaultSevenZip, walk, unzip, unrar, decodeZipName, safeJoin,
  cacheDirFor, pruneImportCache, releaseJobCache, jobCacheBucket, defaultImportCache, sha256File, zipError, rarError,
  isZipName, isRarName, isInProcessArchive, archiveMagic, peekArchiveKind,
  MAX_UNCOMPRESSED, MAX_FILES, ZIP_NEST_DEPTH, CACHE_MARKER,
};
