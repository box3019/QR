'use strict';
// Custom folder-feed update (no auto-updater package): read qr-release.json, copy the NSIS installer
// to %LOCALAPPDATA%\\QR\\UpdateCache, verify size + SHA-256, run it interactively, then quit QR.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const CHUNK = 1024 * 1024;
const MANIFEST_NAME = 'qr-release.json';
const QUIT_AFTER_MS = 1500;

function parseSemver(v) {
  const m = String(v == null ? '' : v).trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function compareSemver(a, b) {
  const A = parseSemver(a), B = parseSemver(b);
  if (!A || !B) return null;
  for (let i = 0; i < 3; i++) { if (A[i] !== B[i]) return A[i] < B[i] ? -1 : 1; }
  return 0;
}
function isSha256(s) { return /^[0-9a-f]{64}$/i.test(String(s || '').trim()); }
function localQrRoot(env) {
  const e = env || process.env;
  const local = e.LOCALAPPDATA || (process.platform === 'win32' ? path.join(os.homedir(), 'AppData', 'Local') : path.join(os.homedir(), '.local', 'share'));
  return path.join(local, 'QR');
}
function cacheDir(env) { return path.join(localQrRoot(env), 'UpdateCache'); }
function logFile(env) { return path.join(localQrRoot(env), 'Logs', 'update.log'); }

function appendLog(file, msg, io) {
  const fsio = io || fs;
  try {
    fsio.mkdirSync(path.dirname(file), { recursive: true });
    fsio.appendFileSync(file, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

function validateManifest(raw) {
  const m = raw && typeof raw === 'object' ? raw : null;
  if (!m) return { ok: false, code: 'updNoList', error: 'The update list is missing or is not valid.' };
  const latestVersion = String(m.latestVersion || '').trim();
  const installerFile = String(m.installerFile || '').trim();
  const installerSizeBytes = Number(m.installerSizeBytes);
  const installerSha256 = String(m.installerSha256 || '').trim().toLowerCase();
  if (!parseSemver(latestVersion)) return { ok: false, code: 'updBadVersion', error: 'The update list has no valid version.' };
  if (!installerFile || installerFile !== path.basename(installerFile) || installerFile.includes('..')) {
    return { ok: false, code: 'updBadInstaller', error: 'The update list has no valid installer file name.' };
  }
  if (!Number.isFinite(installerSizeBytes) || installerSizeBytes <= 0) {
    return { ok: false, code: 'updNeedChecksum', error: 'The installer file is missing a size or checksum.' };
  }
  if (!isSha256(installerSha256)) return { ok: false, code: 'updNeedChecksum', error: 'The installer file is missing a size or checksum.' };
  const notes = Array.isArray(m.releaseNotes) ? m.releaseNotes.map((x) => String(x || '')).filter(Boolean) : [];
  return {
    ok: true,
    manifest: {
      latestVersion,
      installerFile,
      installerSizeBytes: Math.round(installerSizeBytes),
      installerSha256,
      releaseNotes: notes,
      mandatory: m.mandatory === true,
      minimumSupportedVersion: String(m.minimumSupportedVersion || '').trim(),
      releaseDate: String(m.releaseDate || '').trim(),
    },
  };
}

function readManifest(feedFolder, io) {
  const fsio = io || fs;
  const folder = String(feedFolder || '').trim();
  if (!folder) return { ok: false, code: 'updNoFeed', error: 'No update folder is set.' };
  const file = path.join(folder, MANIFEST_NAME);
  let raw;
  try { raw = JSON.parse(fsio.readFileSync(file, 'utf8')); }
  catch { return { ok: false, code: 'updNoList', error: 'Could not read the update list in the update folder.' }; }
  return validateManifest(raw);
}

function decideUpdate(currentVersion, manifest) {
  const cmp = compareSemver(manifest.latestVersion, currentVersion);
  if (cmp == null) return { ok: false, code: 'updBadVersion', error: 'The version numbers could not be compared.' };
  if (cmp === 0) return { ok: true, update: null, reason: 'same' };
  if (cmp < 0) return { ok: true, update: null, reason: 'downgrade' };
  let mandatory = !!manifest.mandatory;
  if (manifest.minimumSupportedVersion && compareSemver(currentVersion, manifest.minimumSupportedVersion) === -1) mandatory = true;
  return { ok: true, update: { ...manifest, mandatory }, reason: 'available' };
}

function sha256File(file, io) {
  const fsio = io || fs;
  const hash = crypto.createHash('sha256');
  const fd = fsio.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(CHUNK);
    let n;
    while ((n = fsio.readSync(fd, buf, 0, CHUNK, null)) > 0) hash.update(buf.subarray(0, n));
  } finally { try { fsio.closeSync(fd); } catch {} }
  return hash.digest('hex');
}

function verifyInstaller(file, sizeBytes, sha, io) {
  const fsio = io || fs;
  let st;
  try { st = fsio.statSync(file); } catch { return { ok: false, code: 'updCopy', error: 'The installer file was not found after copying.' }; }
  if (st.size !== sizeBytes) return { ok: false, code: 'updSize', error: 'The installer file size does not match.' };
  const got = sha256File(file, fsio);
  if (got.toLowerCase() !== String(sha).toLowerCase()) return { ok: false, code: 'updChecksum', error: 'The installer file checksum does not match.' };
  return { ok: true, sha: got };
}

function cleanCache(dir, keepName, io) {
  const fsio = io || fs;
  let names = [];
  try { names = fsio.readdirSync(dir); } catch { return; }
  for (const n of names) {
    if (n === keepName) continue;
    try { fsio.rmSync(path.join(dir, n), { recursive: true, force: true }); } catch {}
  }
}

function copyChunked(src, dest, { onProgress, isCancelled, io } = {}) {
  const fsio = io || fs;
  fsio.mkdirSync(path.dirname(dest), { recursive: true });
  const st = fsio.statSync(src);
  const total = st.size;
  const rfd = fsio.openSync(src, 'r');
  const wfd = fsio.openSync(dest, 'w');
  let copied = 0;
  try {
    const buf = Buffer.alloc(CHUNK);
    let n;
    while ((n = fsio.readSync(rfd, buf, 0, CHUNK, null)) > 0) {
      if (isCancelled && isCancelled()) {
        try { fsio.closeSync(wfd); } catch {}
        try { fsio.unlinkSync(dest); } catch {}
        throw Object.assign(new Error('Update cancelled.'), { cancelled: true });
      }
      fsio.writeSync(wfd, buf, 0, n);
      copied += n;
      if (onProgress) onProgress({ copied, total, phase: 'copy' });
    }
  } finally {
    try { fsio.closeSync(rfd); } catch {}
    try { fsio.closeSync(wfd); } catch {}
  }
  return { copied, total };
}

function spawnInstaller(file, spawnFn) {
  const child = (spawnFn || spawn)(file, [], { detached: true, stdio: 'ignore', windowsHide: false });
  if (child && typeof child.unref === 'function') child.unref();
  return child;
}

function createUpdateHost({ app, shell, getSettings, getWin, env, io, spawnFn, quitAfterMs }) {
  const fsio = io || fs;
  const e = env || process.env;
  let cancelled = false;
  const log = (msg) => appendLog(logFile(e), msg, fsio);

  function emit(payload) {
    try { const w = getWin && getWin(); if (w && !w.isDestroyed()) w.webContents.send('qr:release-update', payload); } catch {}
  }

  async function handle(action, payload) {
    const s = (getSettings && getSettings()) || {};
    if (action === 'get-app-info') {
      return { version: app.getVersion(), feedFolder: s.updateFeedFolder || '', checkOnStartup: s.updateCheckOnStartup !== false, interval: s.updateCheckInterval === 'hourly' ? 'hourly' : 'daily' };
    }
    if (action === 'open-folder') {
      const folder = String((payload && payload.feedFolder) || s.updateFeedFolder || '').trim();
      if (!folder) return { ok: false, code: 'updNoFeed', error: 'No update folder is set.' };
      const err = await shell.openPath(folder);
      return err ? { ok: false, error: err } : { ok: true };
    }
    if (action === 'cancel') { cancelled = true; log('cancel'); return { ok: true }; }
    if (action === 'check') {
      cancelled = false;
      const folder = String((payload && payload.feedFolder) || s.updateFeedFolder || '').trim();
      log('check folder=' + folder);
      const read = readManifest(folder, fsio);
      if (!read.ok) { log('check fail ' + read.error); return read; }
      const d = decideUpdate(app.getVersion(), read.manifest);
      if (!d.ok) return d;
      if (!d.update) { log('check no-update reason=' + d.reason); return { ok: true, update: null, reason: d.reason }; }
      log('check available ' + d.update.latestVersion);
      return { ok: true, update: d.update, reason: d.reason };
    }
    if (action === 'install-update') {
      cancelled = false;
      const folder = String((payload && payload.feedFolder) || s.updateFeedFolder || '').trim();
      const read = readManifest(folder, fsio);
      if (!read.ok) return read;
      const d = decideUpdate(app.getVersion(), read.manifest);
      if (!d.ok) return d;
      if (!d.update) return { ok: false, code: d.reason === 'downgrade' ? 'updOlder' : 'updSame', error: d.reason === 'downgrade' ? 'A newer version is already installed.' : 'This version is already installed.' };
      const src = path.join(folder, d.update.installerFile);
      const destDir = cacheDir(e);
      fsio.mkdirSync(destDir, { recursive: true });
      cleanCache(destDir, d.update.installerFile, fsio);
      const dest = path.join(destDir, d.update.installerFile);
      log('copy ' + src + ' -> ' + dest);
      try {
        copyChunked(src, dest, {
          io: fsio,
          isCancelled: () => cancelled,
          onProgress: (p) => emit({ type: 'progress', copied: p.copied, total: p.total, phase: 'copy' }),
        });
      } catch (err) {
        if (err && err.cancelled) { log('cancelled'); return { ok: false, cancelled: true, code: 'updCancelled', error: 'Update cancelled.' }; }
        log('copy fail ' + ((err && err.message) || err));
        return { ok: false, code: 'updCopy', error: 'Could not copy the installer file.' };
      }
      emit({ type: 'progress', phase: 'verify', copied: d.update.installerSizeBytes, total: d.update.installerSizeBytes });
      const v = verifyInstaller(dest, d.update.installerSizeBytes, d.update.installerSha256, fsio);
      if (!v.ok) { log('verify fail ' + v.error); return v; }
      log('spawn installer (interactive, not silent)');
      try { spawnInstaller(dest, spawnFn); } catch (err) { log('spawn fail ' + ((err && err.message) || err)); return { ok: false, code: 'updStartFail', error: 'Could not start the installer.' }; }
      const wait = quitAfterMs == null ? QUIT_AFTER_MS : quitAfterMs;
      setTimeout(() => { try { log('quit after installer'); app.quit(); } catch {} }, wait);
      return { ok: true, started: true };
    }
    return { ok: false, error: 'Unknown update action.' };
  }

  return { handle, compareSemver, validateManifest, decideUpdate, verifyInstaller, copyChunked, sha256File, cacheDir: () => cacheDir(e), logFile: () => logFile(e) };
}

module.exports = {
  CHUNK, MANIFEST_NAME, QUIT_AFTER_MS, parseSemver, compareSemver, validateManifest, readManifest,
  decideUpdate, sha256File, verifyInstaller, cleanCache, copyChunked, spawnInstaller, createUpdateHost,
  localQrRoot, cacheDir, logFile, isSha256,
};
