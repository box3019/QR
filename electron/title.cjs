'use strict';
// App name + version for the window title. The version always comes from app.getVersion() (package.json), never hardcoded.
const versionLabel = (v) => { const s = String(v == null ? '' : v).trim().replace(/^v/i, ''); return s ? 'v' + s : ''; };
const appTitle = (v) => ['QR', versionLabel(v)].filter(Boolean).join(' ');
module.exports = { versionLabel, appTitle };
