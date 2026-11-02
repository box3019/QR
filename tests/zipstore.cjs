'use strict';
// Minimal stored-only ZIP writer for synthetic tests (no compression, no customer data).
function crc32(buf) {
  let c = ~0 >>> 0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function encodeCp862(str) {
  const HEB = 'אבגדהוזחטיךכלםמןנסעףפץצקרשת';
  const out = [];
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (code < 128) out.push(code);
    else {
      const i = HEB.indexOf(ch);
      if (i < 0) out.push(0x3f);
      else out.push(0x80 + i);
    }
  }
  return Buffer.from(out);
}

/** @param {{ name: string, data?: Buffer|string, utf8?: boolean, cp862?: boolean, encrypted?: boolean }[]} entries */
function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const payload = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data == null ? '' : e.data);
    const data = e.encrypted ? Buffer.concat([Buffer.alloc(12, 0x11), payload]) : payload;
    let nameBuf, flags = 0;
    if (e.cp862) nameBuf = encodeCp862(e.name);
    else { nameBuf = Buffer.from(e.name, 'utf8'); flags |= 0x800; }
    if (e.encrypted) flags |= 0x1;
    const crc = crc32(payload);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(payload.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    const localFull = Buffer.concat([local, nameBuf, data]);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(payload.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBuf]));
    locals.push(localFull);
    offset += localFull.length;
  }
  const center = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(center.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, center, end]);
}

module.exports = { buildZip, crc32, encodeCp862 };
