'use strict';
// Builds vendor/outlook-addin/QR.OutlookAddin.dll with the csc.exe that ships in .NET Framework 4 (no Visual Studio, no VSTO).
const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const csc = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
const GAC = path.join(process.env.WINDIR || 'C:\\Windows', 'assembly');
const GAC_EXT = path.join(GAC, 'GAC', 'Extensibility', '7.0.3300.0__b03f5f7f11d50a3a', 'extensibility.dll'); // Office's IDTExtensibility2
const GAC_OFFICE = path.join(GAC, 'GAC_MSIL', 'office', '15.0.0.0__71e9bce111e9429c', 'OFFICE.DLL'); // IRibbonExtensibility, embedded (/link)
const out = path.join(__dirname, '..', 'vendor', 'outlook-addin'); fs.mkdirSync(out, { recursive: true });
execFileSync(csc, ['/nologo', '/target:library', '/platform:anycpu', '/out:' + path.join(out, 'QR.OutlookAddin.dll'),
  '/r:Microsoft.CSharp.dll', '/r:System.Windows.Forms.dll', '/r:' + GAC_EXT, '/link:' + GAC_OFFICE, path.join(__dirname, '..', 'outlook-addin', 'QRAddin.cs')], { stdio: 'inherit' });
console.log('built', path.join(out, 'QR.OutlookAddin.dll'));
