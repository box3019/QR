'use strict';
// Outlook 'Send to QR' hand-off: QR.exe --import <dir>. A second instance's argv has Chromium's switches moved in FRONT of the folder
// (e.g. ["QR.exe","--import","--allow-file-access-from-files","<dir>"]), so the folder is the last plain argument, not the one after --import.
const fs = require('fs'); const path = require('path');
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
function importArg(argv) {
  const a = (argv || []).map(String);
  const eq = a.find((x) => /^--import=/.test(x)); if (eq) { const v = eq.slice(9).replace(/^"|"$/g, ''); return v ? path.resolve(v) : null; }
  const i = a.indexOf('--import'); if (i < 0) return null;
  const rest = a.slice(i + 1); if (!rest.length) return null;
  if (!rest[0].startsWith('--')) return path.resolve(rest[0]);
  const plain = rest.filter((x) => !x.startsWith('--')); if (!plain.length) return null;
  return path.resolve([...plain].reverse().find(isDir) || plain[plain.length - 1]);
}
function msgFiles(dir) { try { return fs.readdirSync(dir).filter((f) => /\.(msg|eml)$/i.test(f)).sort().map((f) => path.join(dir, f)); } catch { return []; } }
/** Why an import folder gave nothing: 'noFolder' (missing) or 'noMail' (no .msg/.eml in it). */
const importProblem = (dir) => (isDir(dir) ? 'noMail' : 'noFolder');
/** Show the window in front of Outlook (Windows blocks plain focus() from a background app, so it is raised for a moment). */
function bringToFront(win, app) {
  if (!win || (win.isDestroyed && win.isDestroyed())) return false;
  if (win.isMinimized && win.isMinimized()) win.restore();
  win.show(); if (win.setAlwaysOnTop) { win.setAlwaysOnTop(true); win.focus(); win.setAlwaysOnTop(false); } else win.focus();
  try { app && app.focus && app.focus({ steal: true }); } catch {}
  return true;
}
module.exports = { importArg, msgFiles, importProblem, bringToFront };
