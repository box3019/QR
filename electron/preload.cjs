'use strict';
const { contextBridge, ipcRenderer, webFrame, webUtils } = require('electron');
// Text size: same zoom steps as the MRT app (Normal / Large / X-Large).
const QR_TEXT_ZOOM = { normal: 1.2, large: 1.35, xlarge: 1.5 };
const applyZoom = (size) => webFrame.setZoomFactor(QR_TEXT_ZOOM[size] || QR_TEXT_ZOOM.normal);
ipcRenderer.invoke('qr:getSettings').then((s) => applyZoom(s && s.textSize)).catch(() => applyZoom('normal'));
contextBridge.exposeInMainWorld('qr', {
  textZoom: QR_TEXT_ZOOM,
  applyZoom,
  getSettings: () => ipcRenderer.invoke('qr:getSettings'),
  setSettings: (s) => ipcRenderer.invoke('qr:setSettings', s).then((n) => { applyZoom(n.textSize); return n; }),
  pickFiles: () => ipcRenderer.invoke('qr:pickFiles'),
  pickFolder: () => ipcRenderer.invoke('qr:pickFolder'),
  pathForFile: (f) => { try { return webUtils.getPathForFile(f); } catch { return f.path || ''; } },
  process: (paths) => ipcRenderer.invoke('qr:process', paths),
  onEvent: (cb) => { const h = (_e, ev) => cb(ev); ipcRenderer.on('qr:event', h); return () => ipcRenderer.removeListener('qr:event', h); },
  preview: (file, page, maxPx) => ipcRenderer.invoke('qr:preview', file, page, maxPx),
  questionsPreview: (parts, lang) => ipcRenderer.invoke('qr:questionsPreview', parts, lang),
  exportQuestions: (parts, lang, target) => ipcRenderer.invoke('qr:exportQuestions', parts, lang, target),
  exportSummary: (parts, kind, target) => ipcRenderer.invoke('qr:exportSummary', parts, kind, target),
  outlookSelection: () => ipcRenderer.invoke('qr:outlookSelection'),
  openPath: (p) => ipcRenderer.invoke('qr:openPath', p),
});
