'use strict';
// requirements/xlsx: .xlsx writer, no dependencies. Professional look: colored header, borders, auto widths, frozen header,
// autofilter, status cells colored like the UI, wrapped text, print title in the page header. Cell values = friend's sheets.
const zlib = require('zlib');
const { HEAD, WIDTHS, WRAP } = require('./sheets.cjs');

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(files) {
  const parts = [], cd = []; let off = 0;
  for (const [name, data] of files) {
    const nb = Buffer.from(name), raw = Buffer.from(data), def = zlib.deflateRawSync(raw), crc = crc32(raw);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt32LE(crc, 14); h.writeUInt32LE(def.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(nb.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16); c.writeUInt32LE(def.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    parts.push(h, nb, def); cd.push(c, nb); off += 30 + nb.length + def.length;
  }
  const cdb = Buffer.concat(cd); const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cdb.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cdb, e]);
}
const esc = (s) => String(s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const col = (i) => String.fromCharCode(65 + i);
// Styles (cellXfs): 0 default, 1 header, 2 body, 3 body wrapped, 4 ok, 5 attention, 6 problem.
const XF = { head: 1, body: 2, wrap: 3, ok: 4, warn: 5, bad: 6 };
/** Status cell tone, same colors as the UI chips (ready green, attention amber, danger red). */
function tone(name, i, v) {
  const h = HEAD[name][i];
  if (name === 'Summary' && h === 'Status') return v === 'OK' ? 'ok' : v === 'NEEDS_OCR' ? 'warn' : 'bad';
  if (h === 'Flags') return v ? 'warn' : null;
  if (h === 'Flagged') return Number(v) > 0 ? 'warn' : 'ok';
  return null;
}
/** Auto width from the longest line in the column, capped by the friend's widths. */
function widths(name, rows) {
  return HEAD[name].map((h, i) => { const max = WIDTHS[name][i]; let w = String(h).length + 3;
    for (const r of rows) { const v = r[i]; if (v == null) continue; for (const l of String(v).split('\n')) w = Math.max(w, l.length + 2); }
    return Math.max(6, Math.min(max, w)); });
}
const TITLE = { Requirements: 'Requirements', Summary: 'Summary by page', Material: 'Material', Processes: 'Processes', Masking: 'Masking', 'Process summary': 'Process summary' };
function sheetXml(name, rows) {
  const wrap = WRAP[name];
  const cell = (v, r, i, hdr) => { const ref = col(i) + r; const t = hdr ? null : tone(name, i, v);
    const x = hdr ? XF.head : t ? XF[t] : wrap === i + 1 ? XF.wrap : XF.body; const s = ` s="${x}"`;
    return typeof v === 'number' ? `<c r="${ref}"${s}><v>${v}</v></c>` : v === '' || v == null ? `<c r="${ref}"${s}/>` : `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${esc(v)}</t></is></c>`; };
  const n = HEAD[name].length, last = col(n - 1) + (rows.length + 1);
  const data = [HEAD[name], ...rows].map((row, ri) => `<row r="${ri + 1}"${ri === 0 ? ' ht="22" customHeight="1"' : ''}>${HEAD[name].map((_, i) => cell(row[i], ri + 1, i, ri === 0)).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths(name, rows).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${data}</sheetData><autoFilter ref="A1:${last}"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddHeader>&amp;L&amp;B QR — ${esc(TITLE[name])}&amp;R&amp;D</oddHeader><oddFooter>&amp;C&amp;P / &amp;N</oddFooter></headerFooter></worksheet>`;
}
const STYLES = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF166534"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF92400E"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF991B1B"/><name val="Calibri"/></font></fonts>'
  + '<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  + ['FF1E3A8A', 'FFDCFCE7', 'FFFEF3C7', 'FFFEE2E2'].map((c) => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`).join('') + '</fills>'
  + '<borders count="2"><border/><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom></border></borders>'
  + '<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="7"><xf/>'
  + '<xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
  + '<xf borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>'
  + '<xf borderId="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>'
  + [[2, 3], [3, 4], [4, 5]].map(([f, fi]) => `<xf fontId="${f}" fillId="${fi}" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`).join('')
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
/** sheets: {name: rows[]} in HEAD order -> xlsx Buffer. */
function writeXlsx(sheets) {
  const names = Object.keys(HEAD);
  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', STYLES],
    ...names.map((n, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(n, sheets[n] || [])]),
  ];
  return zip(files);
}
module.exports = { writeXlsx, tone, widths };
