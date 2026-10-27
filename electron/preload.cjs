'use strict';
const { contextBridge, ipcRenderer, webFrame, webUtils } = require('electron');
// Text size is applied by the renderer (root font-size, src/i18n); zoom stays 1.
webFrame.setZoomFactor(1);
contextBridge.exposeInMainWorld('qr', {
  getSettings: () => ipcRenderer.invoke('qr:getSettings'),
  setSettings: (s) => ipcRenderer.invoke('qr:setSettings', s),
  catalogPatterns: (entries) => ipcRenderer.invoke('qr:catalogPatterns', entries),
  questionSample: (lang) => ipcRenderer.invoke('qr:questionSample', lang),
  newCustomer: (from, ids) => ipcRenderer.invoke('qr:newCustomer', from, ids),
  pickFiles: () => ipcRenderer.invoke('qr:pickFiles'),
  pickFolder: () => ipcRenderer.invoke('qr:pickFolder'),
  pathForFile: (f) => { try { return webUtils.getPathForFile(f); } catch { return f.path || ''; } },
  process: (paths) => ipcRenderer.invoke('qr:process', paths),
  onEvent: (cb) => { const h = (_e, ev) => cb(ev); ipcRenderer.on('qr:event', h); return () => ipcRenderer.removeListener('qr:event', h); },
  preview: (file, page, maxPx) => ipcRenderer.invoke('qr:preview', file, page, maxPx),
  questionsPreview: (parts, lang) => ipcRenderer.invoke('qr:questionsPreview', parts, lang),
  exportQuestions: (parts, lang, target) => ipcRenderer.invoke('qr:exportQuestions', parts, lang, target),
  exportSummary: (parts, kind, target) => ipcRenderer.invoke('qr:exportSummary', parts, kind, target),
  exportRequirements: (parts, target) => ipcRenderer.invoke('qr:exportRequirements', parts, target),
  outlookSelection: () => ipcRenderer.invoke('qr:outlookSelection'),
  onImport: (cb) => { const h = (_e, files) => cb(files); ipcRenderer.on('qr:import', h); return () => ipcRenderer.removeListener('qr:import', h); },
  openPath: (p) => ipcRenderer.invoke('qr:openPath', p),
});
