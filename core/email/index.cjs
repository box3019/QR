'use strict';
// email: public entry. readEmail(file, outDir) -> { rfq, attachmentFiles } (attachments saved to outDir).
const fs = require('fs');
const path = require('path');
const { readMail } = require('./readers.cjs');
const { parseRfqTable } = require('./rfqTable.cjs');
const { buildRfq } = require('./rfq.cjs');

const SKIP = /^(~WRD|image\d|email_signature|Outlook-)/i;
const safeName = (n) => path.basename(String(n)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

async function readEmail(file, outDir) {
  const mail = await readMail(file);
  fs.mkdirSync(outDir, { recursive: true });
  const attachmentFiles = [];
  for (const a of mail.attachments) {
    if (!a.name || a.hidden || SKIP.test(a.name)) continue;
    const p = path.join(outDir, safeName(a.name)); fs.writeFileSync(p, a.data); attachmentFiles.push(p);
  }
  const rfq = buildRfq(mail, parseRfqTable(mail), path.basename(file));
  rfq.attachments = attachmentFiles.map((f) => path.basename(f));
  return { rfq, attachmentFiles };
}
module.exports = { readEmail };
