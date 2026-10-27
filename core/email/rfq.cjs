'use strict';
// email/rfq: build the Rfq record from a Mail object (headers, forwarded "From:", customer hints, requirements).
const CUSTOMER_HINTS = { RAFAEL: ['רפאל', 'rafael'], ELTA: ['elta', 'אלתא'], KLA: ['kla'], ELBIT: ['elbit', 'אלביט'] };
const REQUIREMENT_RE = /FAI|\bLT\b|דולר|גימור|\$|lead time|finish/i;
const clean = (s) => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function detectCustomer(text) {
  const t = String(text).toLowerCase();
  return Object.keys(CUSTOMER_HINTS).find((c) => CUSTOMER_HINTS[c].some((k) => t.includes(k.toLowerCase()))) || null;
}

/**
 * @param {object} mail Mail from readers.cjs
 * @param {Array} rows RFQ table rows
 * @returns Rfq
 */
function buildRfq(mail, rows, source) {
  const subject = clean(mail.subject); const body = String(mail.body || '');
  const orig = body.match(/From:\s*(.+?)\s*<\s*([^\s>]+@[^\s>]+)/);
  const sent = body.match(/Sent:\s*(.+)/);
  return {
    source, subject,
    rfq_no: (subject.match(/\b(\d{6})\b/) || [])[1] || null,
    assembly: (subject.match(/\b([A-Z]{1,2}\d{5}[A-Z])\b/) || [])[1] || null,
    sender: mail.sender,
    original_sender: orig ? { name: clean(orig[1]), email: orig[2] } : null,
    original_sent: sent ? clean(sent[1]) : null,
    date: mail.date,
    customer: detectCustomer(subject + '\n' + body),
    intermediary: orig ? orig[2].split('@')[1] : null,
    requirements: body.split(/\r?\n/).map((l) => l.replace(/^[*\s]+/, '').trim()).filter((l) => l && REQUIREMENT_RE.test(l) && !/@|https?:/.test(l)),
    rows,
  };
}
module.exports = { buildRfq, detectCustomer };
