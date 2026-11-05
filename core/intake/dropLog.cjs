'use strict';
// Drop failures go next to the update log (Local) AND the main log (Roaming), written from preload (sync, no IPC).
const fs = require('fs');
const os = require('os');
const path = require('path');

function localQrLogs(env, tmp) {
  const e = env || process.env;
  if (e.LOCALAPPDATA) return path.join(e.LOCALAPPDATA, 'QR', 'Logs');
  if (process.platform === 'win32') return path.join(os.homedir(), 'AppData', 'Local', 'QR', 'Logs');
  return path.join(tmp || os.tmpdir(), 'QR', 'Logs');
}

function roamingQrLogs(env, tmp) {
  const e = env || process.env;
  if (e.APPDATA) return path.join(e.APPDATA, 'QR', 'logs');
  if (process.platform === 'win32') return path.join(os.homedir(), 'AppData', 'Roaming', 'QR', 'logs');
  return path.join(tmp || os.tmpdir(), 'QR', 'logs');
}

/** Primary path (same folder as update.log): %LOCALAPPDATA%\QR\Logs\drop.log */
function dropLogPath(env, tmp) {
  return path.join(localQrLogs(env, tmp), 'drop.log');
}

function dropLogFiles(env, tmp) {
  return [...new Set([dropLogPath(env, tmp), path.join(roamingQrLogs(env, tmp), 'drop.log')])];
}

function writeDropLog(msg, env, tmp, io) {
  const fsio = io || fs;
  const line = `[${new Date().toISOString()}] ${String(msg || '')}\n`;
  const files = dropLogFiles(env, tmp);
  for (const f of files) {
    try {
      fsio.mkdirSync(path.dirname(f), { recursive: true });
      fsio.appendFileSync(f, line);
    } catch {}
  }
  return files[0];
}

module.exports = { localQrLogs, roamingQrLogs, dropLogPath, dropLogFiles, writeDropLog };
