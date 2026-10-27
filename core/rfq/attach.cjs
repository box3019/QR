'use strict';
// rfq/attach: attach RFQ quantities to analyzed parts by part number; report table rows / parts that do not match.
const key = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function attachRfqs(parts, rfqs) {
  const matched = new Set();
  for (const p of parts) {
    const k = key(p.partNo);
    for (const r of rfqs) {
      const row = k && r.rows.find((x) => key(x.part_no) === k || (k.length >= 6 && key(x.part_no).startsWith(k)));
      if (row) { p.rfq = { rfq_no: r.rfq_no, qty: row.qty, uom: row.uom, description: row.description }; matched.add(r.rfq_no + '|' + key(row.part_no)); break; }
    }
  }
  return rfqs.map((r) => ({ ...r, match: {
    rows_without_drawing: r.rows.filter((x) => !matched.has(r.rfq_no + '|' + key(x.part_no))).map((x) => x.part_no),
    parts_without_row: parts.filter((p) => !p.rfq).map((p) => p.partNo).filter(Boolean),
  } }));
}
module.exports = { attachRfqs };
