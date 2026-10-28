'use strict';
// email/readers: .msg (Outlook, @kenjiuno/msgreader) and .eml (mailparser) -> one plain Mail object.
// Mail = { subject, body, html, sender: {name,email}, date: ISO string|null, attachments: [{ name, data: Buffer, hidden }] }
const fs = require('fs');

function readMsg(file) {
  const MsgReader = require('@kenjiuno/msgreader').default;
  const r = new MsgReader(fs.readFileSync(file));
  const d = r.getFileData();
  if (d.error) throw new Error('Not an Outlook .msg file: ' + d.error);
  const dec = (h) => (!h ? '' : typeof h === 'string' ? h : Buffer.from(h).toString('utf8'));
  const date = d.messageDeliveryTime || d.clientSubmitTime || null;
  return {
    subject: d.subject || '', body: d.body || '', html: dec(d.html || d.bodyHtml), messageId: d.messageId || '',
    sender: { name: d.senderName || '', email: d.senderSmtpAddress || d.senderEmail || '' },
    date: date ? new Date(date).toISOString() : null,
    attachments: (d.attachments || []).map((a) => { const x = r.getAttachment(a); return { name: a.fileName || x.fileName || '', data: Buffer.from(x.content), hidden: !!a.attachmentHidden }; }),
  };
}

async function readEml(file) {
  const { simpleParser } = require('mailparser');
  const m = await simpleParser(fs.readFileSync(file));
  const from = (m.from && m.from.value && m.from.value[0]) || {};
  return {
    subject: m.subject || '', body: m.text || '', html: m.html || '', messageId: m.messageId || '',
    sender: { name: from.name || '', email: from.address || '' },
    date: m.date ? m.date.toISOString() : null,
    attachments: (m.attachments || []).map((a) => ({ name: a.filename || '', data: a.content, hidden: a.related || a.contentDisposition === 'inline' })),
  };
}

/** @returns {Promise<object>} Mail */
async function readMail(file) { return /\.eml$/i.test(file) ? readEml(file) : readMsg(file); }
module.exports = { readMail, readMsg, readEml };
