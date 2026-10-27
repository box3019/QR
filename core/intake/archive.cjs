'use strict';
// intake/archive: unpack ZIP (yauzl, in-process) and RAR/7z (bundled 7-Zip 7z.exe). Returns extracted file paths.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const safeJoin = (root, rel) => { const d = path.resolve(root, rel.replace(/^[\\/]+/, '')); if (!d.startsWith(path.resolve(root))) throw new Error('Unsafe path in archive: ' + rel); return d; };

function unzip(file, outDir) {
  const yauzl = require('yauzl');
  return new Promise((res, rej) => yauzl.open(file, { lazyEntries: true, decodeStrings: true }, (err, z) => {
    if (err) return rej(err);
    const out = [];
    z.readEntry();
    z.on('entry', (e) => {
      if (/\/$/.test(e.fileName)) return z.readEntry();
      let dest; try { dest = safeJoin(outDir, e.fileName); } catch (x) { return rej(x); }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      z.openReadStream(e, (er, s) => { if (er) return rej(er); s.pipe(fs.createWriteStream(dest)).on('finish', () => { out.push(dest); z.readEntry(); }); });
    });
    z.on('end', () => res(out)); z.on('error', rej);
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

function walk(d) { const out = []; for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) out.push(...walk(p)); else out.push(p); } return out; }

/** If outDir holds exactly one folder and nothing else, move its contents up one level (e.g. X.rar -> X/X/...). */
function flattenSingleFolder(outDir) {
  const items = fs.readdirSync(outDir);
  if (items.length !== 1) return false;
  const inner = path.join(outDir, items[0]);
  if (!fs.statSync(inner).isDirectory()) return false;
  for (const n of fs.readdirSync(inner)) fs.renameSync(path.join(inner, n), path.join(outDir, n));
  fs.rmdirSync(inner);
  return true;
}

/** Unpack any supported archive into outDir. @returns {Promise<string[]>} */
async function extractArchive(file, outDir, opts = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  if (/\.zip$/i.test(file)) { try { await unzip(file, outDir); } catch (e) { if (!fs.existsSync(opts.sevenZip || defaultSevenZip())) throw e; await sevenZip(file, outDir, opts.sevenZip); } }
  else await sevenZip(file, outDir, opts.sevenZip);
  flattenSingleFolder(outDir);
  return walk(outDir);
}
module.exports = { extractArchive, flattenSingleFolder, defaultSevenZip, walk };
