'use strict';
// settings: defaults + normalization of the stored settings object (pure; file IO stays in electron/main.cjs).
const { MATERIALS, PROCESSES, mergeCatalog } = require('./catalog/index.cjs');

const { mergeCustomers } = require('./customers/index.cjs');
const sanitizeFloatPos = (o) => { const out = {}; if (o && typeof o === 'object') for (const k of Object.keys(o)) { const p = o[k]; if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) out[k] = { x: Math.round(p.x), y: Math.round(p.y) }; } return out; };
const DEFAULTS = {
  uiLanguage: 'en',
  firstRunDone: false,
  textSize: 'large',
  questionsLanguage: 'he',
  ocr: true,
  ocrDpi: 400,
  companyFolder: '',
  exportFolder: '',
  searchRoots: ['\\\\fileserver-sr\\erp$\\Inspection'],
  outlookDrag: true,
  outlookSaveFolder: '',
  assistant: true,
  floatPos: {}, // remembered positions of draggable windows: { key: { x, y } }
};
/** Pure: stored object -> full settings with the capability catalog merged over the defaults. */
function normalizeSettings(stored) {
  const s = { ...DEFAULTS, ...(stored || {}) };
  if (stored && !('uiLanguage' in stored)) s.textSize = 'large'; // pre-0.1.3: old default was small
  if (!['normal', 'large', 'xlarge', 'huge'].includes(s.textSize)) s.textSize = 'large';
  if (!['en', 'he', 'ru'].includes(s.uiLanguage)) s.uiLanguage = 'en';
  s.floatPos = sanitizeFloatPos(s.floatPos);
  delete s.materials; // pre-0.1.3 regex allow-list, replaced by the catalog
  s.materialsCatalog = mergeCatalog(MATERIALS, s.materialsCatalog);
  s.processesCatalog = mergeCatalog(PROCESSES, s.processesCatalog);
  s.customers = mergeCustomers(stored && stored.customers);
  return s;
}
/** Pure: settings -> the catalog object the checks use. */
const catalogOf = (s) => ({ materials: s.materialsCatalog, processes: s.processesCatalog });
module.exports = { DEFAULTS, normalizeSettings, catalogOf };
