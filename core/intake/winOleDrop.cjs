'use strict';
// Windows OLE fallback for WinRAR delayed rendering (CFSTR_FILEDESCRIPTOR + FILECONTENTS / CF_HDROP).
// Chromium's HTML5 drop does not complete GetData, so nested archives (BK49998A.rar) arrive as 0-byte Files.
// We harvest %TEMP%\Rar$DRa* by name and, on win32, also read CF_HDROP from the OLE clipboard if present.
const { spawnSync } = require('child_process');
const { harvestNamed, clipboardDropPaths, DROP_TEMP_WAIT_MS } = require('./dropTemp.cjs');
const { writeDropLog } = require('./dropLog.cjs');
const { copyTreeNow } = require('./dropStage.cjs');

const OLE_PS = [
  '$ErrorActionPreference = "SilentlyContinue"',
  'Add-Type -AssemblyName System.Windows.Forms | Out-Null',
  '$d = [System.Windows.Forms.Clipboard]::GetDataObject()',
  'if (-not $d) { return }',
  'if ($d.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) {',
  '  $d.GetData([System.Windows.Forms.DataFormats]::FileDrop) | ForEach-Object { $_.ToString() }',
  '}',
].join('; ');

function oleClipboardPaths() {
  const fromElectron = clipboardDropPaths();
  if (fromElectron.length) return fromElectron;
  if (process.platform !== 'win32') return [];
  try {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-STA', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', OLE_PS], {
      windowsHide: true, timeout: 2500, encoding: 'utf8', maxBuffer: 1024 * 1024,
    });
    const text = String((r && r.stdout) || '');
    return text.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && /^[A-Za-z]:\\|^\\\\/.test(s));
  } catch { return []; }
}

function harvestOleAndTemp(destDir, names, opts) {
  const log = (opts && opts.log) || writeDropLog;
  const sizes = (opts && opts.sizes) || {};
  log('drop harvest names=' + (names || []).join(',') + ' dest=' + destDir);
  const out = harvestNamed(destDir, names, opts);
  const missing = out.map((r, i) => (!r || !r.ok ? { i, name: names[i] } : null)).filter(Boolean);
  if (!missing.length) return out;
  const extra = oleClipboardPaths();
  if (extra.length) log('drop ole clipboard paths=' + extra.join('|'));
  const byBase = new Map();
  for (const p of extra) byBase.set(require('path').basename(p).toLowerCase(), p);
  for (const m of missing) {
    const src = byBase.get(String(m.name || '').toLowerCase());
    if (!src) continue;
    const r = copyTreeNow(destDir, src, m.name);
    if (r && r.ok) out[m.i] = { ...r, name: m.name, src, kind: 'ole' };
  }
  return out;
}

module.exports = { oleClipboardPaths, harvestOleAndTemp, DROP_TEMP_WAIT_MS, OLE_PS };
