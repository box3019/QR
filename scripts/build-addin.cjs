'use strict';
// Builds vendor/outlook-addin/QR.OutlookAddin.dll with the csc.exe that ships in .NET Framework 4 (no Visual Studio, no VSTO).
const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const csc = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
const out = path.join(__dirname, '..', 'vendor', 'outlook-addin'); fs.mkdirSync(out, { recursive: true });
execFileSync(csc, ['/nologo', '/target:library', '/platform:anycpu', '/out:' + path.join(out, 'QR.OutlookAddin.dll'),
  '/r:Microsoft.CSharp.dll', '/r:System.Windows.Forms.dll', path.join(__dirname, '..', 'outlook-addin', 'QRAddin.cs')], { stdio: 'inherit' });
console.log('built', path.join(out, 'QR.OutlookAddin.dll'));
