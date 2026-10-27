// Rail job table rows: RFQ number, customer, part count, file count. Pure logic.
const EMPTY = '\u2014';
export function railRows({ rfqs = [], parts = [], files = [] } = {}) {
  const r = rfqs[0] || {};
  const cust = r.customer || (parts.find((p) => p.customer) || {}).customer || '';
  return [
    { key: 'rfq', value: rfqs.map((x) => x.rfq_no).filter(Boolean).join(', ') || EMPTY },
    { key: 'customer', value: cust || EMPTY },
    { key: 'parts', value: parts.length ? String(parts.length) : EMPTY },
    { key: 'files', value: files.length ? String(files.length) : EMPTY },
  ];
}
