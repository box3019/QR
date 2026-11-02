'use strict';
// Minimal stored-only RAR4 and RAR5 writers for synthetic tests (no compression, no customer data).
const { crc32 } = require('./zipstore.cjs');

function vint(n) {
  n = Number(n);
  if (!Number.isFinite(n) || n < 0) n = 0;
  const out = [];
  n = Math.floor(n);
  while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
  out.push(n);
  return Buffer.from(out);
}

function rar4HeaderCrc(rest) {
  return crc32(rest) & 0xffff;
}

function rar4Block(type, flags, extra) {
  const rest = Buffer.concat([Buffer.from([type, flags & 0xff, (flags >> 8) & 0xff, 0, 0]), extra]);
  rest.writeUInt16LE(rest.length + 2, 3); // HEAD_SIZE includes HEAD_CRC
  const crc = rar4HeaderCrc(rest);
  const head = Buffer.alloc(2);
  head.writeUInt16LE(crc, 0);
  return Buffer.concat([head, rest]);
}

/** @param {{ name: string, data?: Buffer|string }[]} entries */
function buildRar4(entries) {
  const MARK = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
  const archive = rar4Block(0x73, 0, Buffer.from([0, 0, 0, 0, 0, 0]));
  const files = [];
  for (const e of entries) {
    const payload = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data == null ? '' : e.data);
    const nameBuf = Buffer.from(String(e.name).replace(/\\/g, '/'), 'utf8');
    const extra = Buffer.alloc(25 + nameBuf.length);
    extra.writeUInt32LE(payload.length, 0); // PACK_SIZE
    extra.writeUInt32LE(payload.length, 4); // UNP_SIZE
    extra[8] = 3; // Unix
    extra.writeUInt32LE(crc32(payload), 9);
    extra.writeUInt32LE(0, 13); // FTIME
    extra[17] = 20; // UNP_VER
    extra[18] = 0x30; // store
    extra.writeUInt16LE(nameBuf.length, 19);
    extra.writeUInt32LE(0x20, 21); // ATTR
    nameBuf.copy(extra, 25);
    files.push(Buffer.concat([rar4Block(0x74, 0x8000, extra), payload]));
  }
  const end = rar4Block(0x7b, 0, Buffer.alloc(0));
  return Buffer.concat([MARK, archive, ...files, end]);
}

function rar5Header(type, flags, body, dataSize) {
  const typeB = vint(type);
  const flagsB = vint(flags);
  const dataB = (flags & 0x0002) ? vint(dataSize || 0) : Buffer.alloc(0);
  const afterSize = Buffer.concat([typeB, flagsB, dataB, body]);
  const sizeB = vint(afterSize.length);
  const crcSrc = Buffer.concat([sizeB, afterSize]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32LE(crc32(crcSrc), 0);
  return Buffer.concat([crc, crcSrc]);
}

/** @param {{ name: string, data?: Buffer|string }[]} entries */
function buildRar5(entries) {
  const MARK = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
  const main = rar5Header(1, 0, vint(0), 0);
  const files = [];
  for (const e of entries) {
    const payload = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data == null ? '' : e.data);
    const nameBuf = Buffer.from(String(e.name).replace(/\\/g, '/'), 'utf8');
    const fileFlags = 0x0004; // CRC32 present
    const body = Buffer.concat([
      vint(fileFlags),
      vint(payload.length),
      vint(0x20),
      Buffer.alloc(4), // placeholder CRC — filled below as little-endian u32, not vint
      vint(0), // compression store
      vint(0), // Windows host
      vint(nameBuf.length),
      nameBuf,
    ]);
    // rebuild with real CRC32 field (4 bytes after attributes)
    const beforeCrc = Buffer.concat([vint(fileFlags), vint(payload.length), vint(0x20)]);
    const crcF = Buffer.alloc(4); crcF.writeUInt32LE(crc32(payload), 0);
    const afterCrc = Buffer.concat([vint(0), vint(0), vint(nameBuf.length), nameBuf]);
    const fileBody = Buffer.concat([beforeCrc, crcF, afterCrc]);
    files.push(Buffer.concat([rar5Header(2, 0x0002, fileBody, payload.length), payload]));
  }
  const end = rar5Header(5, 0, Buffer.alloc(0), 0);
  return Buffer.concat([MARK, main, ...files, end]);
}

module.exports = { buildRar4, buildRar5, vint };
