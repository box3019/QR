'use strict';
// Identity of one e-mail: its Message-ID (PidTagInternetMessageId / Message-ID header); without one, a fingerprint of subject, sender, date and attachment names.
// Used so that 'Send to QR' focuses an open tab only for the SAME e-mail, never for another e-mail of the same RFQ number.
const crypto = require('crypto');
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
function mailKey(mail) {
  const m = mail || {}; const id = norm(m.messageId).replace(/^<|>$/g, '');
  if (id) return 'mid:' + id;
  const atts = (m.attachments || []).map((a) => norm(a.name) + ':' + ((a.data && a.data.length) || 0)).sort().join(',');
  const sender = m.sender && typeof m.sender === 'object' ? m.sender.email || m.sender.name : m.sender;
  const raw = [norm(m.subject), norm(sender), norm(m.date), atts].join('|');
  return raw.replace(/\|/g, '') ? 'fp:' + crypto.createHash('sha1').update(raw).digest('hex') : '';
}
module.exports = { mailKey };
