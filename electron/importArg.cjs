'use strict';
// Parses QR.exe --import <dir> and lists the .msg/.eml files in that folder (Outlook 'Send to QR').
const fs = require('fs'); const path = require('path');
function importArg(argv) { const i = argv.indexOf('--import'); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : null; }
function msgFiles(dir) { try { return fs.readdirSync(dir).filter((f) => /\.(msg|eml)$/i.test(f)).sort().map((f) => path.join(dir, f)); } catch { return []; } }
module.exports = { importArg, msgFiles };
