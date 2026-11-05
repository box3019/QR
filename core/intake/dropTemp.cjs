'use strict';
// WinRAR 6/7 and 7-Zip delayed extract: files appear under %TEMP%\Rar$DRa* / 7zO* / 7zE* after OLE GetData.
// Chromium HTML5 drop often has no path and 0-byte File; harvest by the dropped name (e.g. BK49998A.rar).
const fs = require('fs');
const os = require('os');
const path = require('path');

const DROP_TEMP_WAIT_MS = 10000;
const DROP_TEMP_DEPTH = 4;

function isDropTempName(n) {
  const s = String(n || '');
  return /^Rar\$DR/i.test(s) || /^Rar\$EX/i.test(s) || /^7z[OES]/i.test(s);
}

function tempRoots(env, tmp) {
  const e = env || process.env;
  const out = [];
  const add = (p) => { if (p && !out.includes(p)) out.push(p); };
  add(e.TEMP);
  add(e.TMP);
  add(tmp);
  add(os.tmpdir());
  if (e.LOCALAPPDATA) add(path.join(e.LOCALAPPDATA, 'Temp'));
  return out.filter(Boolean);
}

function walkFind(dir, want, hits, io, depth, maxDepth, expected) {
  if (depth > maxDepth) return;
  const fsio = io || fs;
  let names = [];
  try { names = fsio.readdirSync(dir); } catch { return; }
  for (const n of names) {
    if (!n || n === '.' || n === '..') continue;
    const p = path.join(dir, n);
    let st; try { st = fsio.statSync(p); } catch { continue; }
    if (st.isDirectory()) walkFind(p, want, hits, fsio, depth + 1, maxDepth, expected);
    else if (st.isFile()) {
      const key = n.toLowerCase();
      if (!want.has(key)) continue;
      const need = expected && expected[key];
      if (st.size <= 0) continue;
      if (need && st.size < need) continue;
      const prev = hits.get(key);
      if (!prev || st.size >= prev.size) hits.set(key, { path: p, size: st.size });
    }
  }
}

function findNamedInTemp(names, opts) {
  const fsio = (opts && opts.io) || fs;
  const want = new Map();
  for (const n of names || []) {
    const b = path.basename(String(n || ''));
    if (b) want.set(b.toLowerCase(), b);
  }
  const expected = {};
  const sizes = (opts && opts.sizes) || {};
  for (const [k, v] of Object.entries(sizes)) expected[path.basename(k).toLowerCase()] = Number(v) || 0;
  const hits = new Map();
  const roots = (opts && opts.roots) || tempRoots(opts && opts.env, opts && opts.tmp);
  for (const root of roots) {
    let ents = [];
    try { ents = fsio.readdirSync(root); } catch { continue; }
    for (const n of ents) {
      if (!isDropTempName(n)) continue;
      walkFind(path.join(root, n), want, hits, fsio, 0, DROP_TEMP_DEPTH, expected);
    }
  }
  return hits;
}

function harvestNamed(destDir, names, opts) {
  const { copyTreeNow } = require('./dropStage.cjs');
  const hits = findNamedInTemp(names, opts);
  const out = [];
  for (const n of names || []) {
    const key = path.basename(String(n || '')).toLowerCase();
    const hit = hits.get(key);
    if (!hit) { out.push({ ok: false, name: n, error: 'not-in-temp', kind: 'temp' }); continue; }
    const r = copyTreeNow(destDir, hit.path, n, opts && opts.io);
    out.push(r && r.ok ? { ...r, name: n, src: hit.path } : { ok: false, name: n, error: (r && r.error) || 'copy', kind: 'temp', src: hit.path });
  }
  return out;
}

function harvestOne(destDir, name, opts) {
  const [r] = harvestNamed(destDir, [name], opts);
  return r || { ok: false, name, error: 'not-in-temp', kind: 'temp' };
}

function parseHdrop(buf) {
  if (!buf || buf.length < 20) return [];
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const pFiles = b.readUInt32LE(0);
  const fWide = b.readInt32LE(16) !== 0;
  const paths = [];
  let i = pFiles;
  if (i < 0 || i >= b.length) return [];
  if (fWide) {
    while (i + 2 <= b.length) {
      if (b.readUInt16LE(i) === 0) break;
      let s = '';
      while (i + 2 <= b.length) {
        const c = b.readUInt16LE(i); i += 2;
        if (c === 0) break;
        s += String.fromCharCode(c);
      }
      if (s) paths.push(s);
    }
  } else {
    while (i < b.length) {
      if (b[i] === 0) break;
      let s = '';
      while (i < b.length) {
        const c = b[i++]; if (c === 0) break;
        s += String.fromCharCode(c);
      }
      if (s) paths.push(s);
    }
  }
  return paths;
}

function clipboardDropPaths() {
  try {
    const { clipboard } = require('electron');
    const buf = clipboard.readBuffer('CF_HDROP');
    if (buf && buf.length) return parseHdrop(buf);
    const name = clipboard.read('FileNameW') || clipboard.read('FileName');
    if (name) return String(name).split(/\0/).map((s) => s.trim()).filter(Boolean);
  } catch {}
  return [];
}

module.exports = {
  DROP_TEMP_WAIT_MS, DROP_TEMP_DEPTH, isDropTempName, tempRoots, findNamedInTemp,
  harvestNamed, harvestOne, parseHdrop, clipboardDropPaths,
};
