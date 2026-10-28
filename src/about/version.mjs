// Version text shown next to the app name (the value comes from the main process: app.getVersion()). Keep in step with electron/title.cjs.
export const versionLabel = (v) => { const s = String(v == null ? '' : v).trim().replace(/^v/i, ''); return s ? 'v' + s : ''; };
export const appTitle = (v) => ['QR', versionLabel(v)].filter(Boolean).join(' ');
