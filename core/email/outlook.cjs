'use strict';
// email/outlook: save the e-mails currently selected in desktop Outlook as .msg files (local COM, no credentials).
// Used when an e-mail is dragged straight from Outlook (Chromium receives no file for that drag).
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function saveOutlookSelection(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const ps = `$ErrorActionPreference='Stop'; $o=[Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application'); $e=$o.ActiveExplorer(); if(-not $e){exit 3}; $i=0; foreach($m in $e.Selection){ if($m.Class -ne 43){continue}; $i++; $n=($m.Subject -replace '[<>:"/\\\\|?*]','_'); if($n.Length -gt 80){$n=$n.Substring(0,80)}; $p=Join-Path '${outDir.replace(/'/g, "''")}' ("$i $n.msg"); $m.SaveAs($p,3); [Console]::Out.WriteLine($p) }`;
  return new Promise((res, rej) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8; ' + ps], { windowsHide: true, timeout: 60000 }, (err, out) => {
    if (err) return rej(new Error('Outlook is not running or no e-mail is selected. Save the e-mail as .msg and drop the file instead.'));
    res(out.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && fs.existsSync(s)).map((s) => path.resolve(s)));
  }));
}
module.exports = { saveOutlookSelection };
