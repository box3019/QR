'use strict';
// .qrproj: one file with a whole project = a zip of manifest.json, project.json (the saved state) and files/<n>/<name> (every file the state points to).
// Save as: paths in the state become 'qrproj:files/<n>/<name>'; Open: the files are unpacked into the new project's folder and the paths point there again.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib'); const crypto = require('crypto');
const MARK = 'qrproj:'; const FORMAT = 'qrproj'; const VERSION = 1; const MAX_ENTRY = 1.9 * 1024 * 1024 * 1024;

// ---- zip (stored/deflate, utf-8 names; no zip64: every entry < 2 GB) ----
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function dosTime(d) { return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
/** entries: [{ name, data: Buffer }] or [{ name, file }] (read when written). Writes to a temp file, then renames. */
function writeZip(out, entries) {
  const tmp = out + '.tmp'; const fd = fs.openSync(tmp, 'w'); const cen = []; let off = 0; const { time, date } = dosTime(new Date());
  const put = (b) => { fs.writeSync(fd, b); off += b.length; };
  try {
    for (const e of entries) {
      const data = e.data || fs.readFileSync(e.file); if (data.length > MAX_ENTRY) throw new Error('File too large for a project file: ' + e.name);
      const name = Buffer.from(e.name, 'utf8'); const crc = crc32(data); const def = zlib.deflateRawSync(data); const store = def.length >= data.length; const body = store ? data : def;
      const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(store ? 0 : 8, 8); lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12);
      lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
      cen.push({ name, crc, method: store ? 0 : 8, csize: body.length, size: data.length, off, time, date }); put(lh); put(name); put(body);
    }
    const start = off;
    for (const c of cen) { const h = Buffer.alloc(46); h.writeUInt32LE(0x02014b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(20, 6); h.writeUInt16LE(0x0800, 8); h.writeUInt16LE(c.method, 10); h.writeUInt16LE(c.time, 12); h.writeUInt16LE(c.date, 14);
      h.writeUInt32LE(c.crc, 16); h.writeUInt32LE(c.csize, 20); h.writeUInt32LE(c.size, 24); h.writeUInt16LE(c.name.length, 28); h.writeUInt32LE(c.off, 42); put(h); put(c.name); }
    const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(cen.length, 8); end.writeUInt16LE(cen.length, 10); end.writeUInt32LE(off - start, 12); end.writeUInt32LE(start, 16); put(end);
  } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, out); return out;
}
/** Reads every entry of a zip into memory: Map name -> Buffer (yauzl checks sizes and CRC). */
function readZip(file) {
  const yauzl = require('yauzl');
  return new Promise((resolve, reject) => yauzl.open(file, { lazyEntries: true, autoClose: true }, (err, z) => {
    if (err) return reject(err); const m = new Map();
    z.on('error', reject); z.on('end', () => resolve(m)); z.readEntry();
    z.on('entry', (e) => { if (/\/$/.test(e.fileName)) return z.readEntry(); if (e.uncompressedSize > MAX_ENTRY) return reject(new Error('entry too large'));
      z.openReadStream(e, (er, s) => { if (er) return reject(er); const ch = []; s.on('data', (d) => ch.push(d)); s.on('error', reject); s.on('end', () => { m.set(e.fileName, Buffer.concat(ch)); z.readEntry(); }); }); });
  }));
}

// ---- state <-> bundle ----
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const looksPath = (s) => typeof s === 'string' && s.length > 2 && s.length < 1024 && !s.startsWith(MARK) && path.isAbsolute(s);
/** Deep copy of a JSON value with every string passed through fn. */
function mapStrings(v, fn) { if (typeof v === 'string') return fn(v); if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn)); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = mapStrings(v[k], fn); return o; } return v; }
const safeName = (n) => path.basename(String(n)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'file';
/** { state, files:[{ rel, from }], missing:[path] }: file paths found in the state, each once, replaced by markers. */
function bundle(state) {
  const seen = new Map(); const missing = new Set();
  const out = mapStrings(state, (s) => { if (!looksPath(s)) return s; if (seen.has(s)) return seen.get(s).mark; if (!isFile(s)) { missing.add(s); return s; }
    const rel = 'files/' + String(seen.size + 1).padStart(4, '0') + '/' + safeName(s); const mark = MARK + rel; seen.set(s, { rel, mark, from: s }); return mark; });
  return { state: out, files: [...seen.values()].map((x) => ({ rel: x.rel, from: x.from })), missing: [...missing] };
}
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
/** Save as: writes the project to one .qrproj file. meta: { id, label, appVersion }. Returns { file, files, bytes, missing }. */
function exportProject(state, outFile, meta = {}) {
  const b = bundle(state); const entries = []; const list = [];
  for (const f of b.files) { const data = fs.readFileSync(f.from); entries.push({ name: f.rel, data }); list.push({ rel: f.rel, name: path.basename(f.from), size: data.length, sha256: sha(data) }); }
  const manifest = { format: FORMAT, version: VERSION, app: 'QR', appVersion: meta.appVersion || '', savedAt: new Date().toISOString(), project: { id: meta.id || '', label: meta.label || '' }, files: list, missing: b.missing.length };
  writeZip(outFile, [{ name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') }, { name: 'project.json', data: Buffer.from(JSON.stringify(b.state), 'utf8') }, ...entries]);
  return { file: outFile, files: list.length, bytes: fs.statSync(outFile).size, missing: b.missing };
}
/** Open: unpacks the files into destDir (zip-slip safe, SHA-256 checked) and returns { state, manifest, files }. */
async function importProject(file, destDir) {
  let z; try { z = await readZip(file); } catch (e) { throw new Error('Not a QR project file: ' + ((e && e.message) || e)); }
  const mf = z.get('manifest.json'); const pj = z.get('project.json'); let manifest; let state;
  try { manifest = JSON.parse(mf.toString('utf8')); state = JSON.parse(pj.toString('utf8')); } catch { throw new Error('Not a QR project file: manifest or project data missing'); }
  if (!manifest || manifest.format !== FORMAT) throw new Error('Not a QR project file: wrong format');
  if (manifest.version > VERSION) throw new Error('This project file was saved by a newer QR (version ' + manifest.version + ')');
  const root = path.resolve(destDir); const map = new Map();
  for (const f of manifest.files || []) {
    if (!/^files\/[^/\\]+\/[^/\\]+$/.test(String(f.rel))) throw new Error('Unsafe path in project file: ' + f.rel);
    const data = z.get(f.rel); if (!data) throw new Error('Project file is incomplete: ' + f.rel);
    if (sha(data) !== f.sha256) throw new Error('Project file is damaged: ' + f.name);
    const dest = path.resolve(root, ...String(f.rel).split('/').slice(1)); if (!dest.startsWith(root + path.sep)) throw new Error('Unsafe path in project file: ' + f.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, data); map.set(MARK + f.rel, dest);
  }
  return { state: mapStrings(state, (s) => (s.startsWith(MARK) && map.has(s) ? map.get(s) : s)), manifest, files: map.size };
}
module.exports = { writeZip, readZip, crc32, bundle, exportProject, importProject, mapStrings, MARK };
