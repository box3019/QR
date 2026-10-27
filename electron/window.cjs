'use strict';
// Main window placement: always inside the work area of the display it opens on (DIPs, so Windows 125/150% scaling
// is handled), maximized by default; saved bounds are clamped so the window can never open cut off.
const { BrowserWindow, screen } = require('electron');
const fs = require('fs');
const path = require('path');

/** Pure: fit bounds {x,y,width,height} into workArea. */
function clampBounds(b, wa) {
  const width = Math.min(Math.max(b && b.width || wa.width, 400), wa.width);
  const height = Math.min(Math.max(b && b.height || wa.height, 300), wa.height);
  const x = Math.min(Math.max(b && Number.isFinite(b.x) ? b.x : wa.x, wa.x), wa.x + wa.width - width);
  const y = Math.min(Math.max(b && Number.isFinite(b.y) ? b.y : wa.y, wa.y), wa.y + wa.height - height);
  return { x, y, width, height };
}

function createMainWindow({ stateFile, webPreferences, icon, maximize = true, log = () => {}, fallbackMs = 3000 }) {
  let saved = null; try { saved = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
  const display = saved ? screen.getDisplayMatching(saved) : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const wa = display.workArea;
  const b = clampBounds(saved || { x: wa.x, y: wa.y, width: wa.width, height: wa.height }, wa);
  const win = new BrowserWindow({ ...b, title: 'QR', minWidth: Math.min(960, wa.width), minHeight: Math.min(560, wa.height), show: false, backgroundColor: '#f1f5f9', icon, webPreferences });
  win.removeMenu();
  win.on('page-title-updated', (e) => e.preventDefault());
  // Always show: ready-to-show is preferred, but a fallback timer guarantees the window appears even if it never fires.
  let shown = false;
  const reveal = (why) => { if (shown || win.isDestroyed()) return; shown = true; log('show via ' + why + ' bounds=' + JSON.stringify(b)); if (maximize && (!saved || saved.maximized !== false)) win.maximize(); win.show(); win.focus(); };
  win.once('ready-to-show', () => reveal('ready-to-show'));
  win.webContents.once('did-finish-load', () => { log('did-finish-load'); setTimeout(() => reveal('did-finish-load'), 500); });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => { log(`did-fail-load ${code} ${desc} ${url}`); reveal('did-fail-load'); });
  win.webContents.on('render-process-gone', (_e, d) => log('render-process-gone ' + JSON.stringify(d)));
  setTimeout(() => reveal('fallback-timer'), fallbackMs);
  const refit = () => { if (win.isMaximized() || win.isDestroyed()) return; const w = screen.getDisplayMatching(win.getBounds()).workArea; win.setBounds(clampBounds(win.getBounds(), w)); };
  screen.on('display-metrics-changed', refit);
  win.on('close', () => { try { fs.mkdirSync(path.dirname(stateFile), { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch {} });
  win.on('closed', () => screen.removeListener('display-metrics-changed', refit));
  return win;
}
module.exports = { createMainWindow, clampBounds };
