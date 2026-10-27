'use strict';
// requirements/adapt: friend's extraction results -> QR route card steps, material candidate and plain problems.
const { problem } = require('../i18n/messages.cjs');

/** results: analyzeFile() pages. stepType: QR step classifier (text -> type). */
function routeFrom(results, stepType) {
  const steps = [];
  for (const p of results) for (const r of p.rows) {
    if (p.source === 'ROUTING TABLE') {
      const m = String(r.section).match(/^(\d+)\s*(.*)$/); const seq = m ? m[1] : r.section;
      let s = steps.find((x) => x.seq === seq && x.page === p.page);
      if (!s) steps.push((s = { seq, type: stepType(m ? m[2] + ' ' + r.text : r.text), title: m ? m[2] : '', items: [], source: 'Routing chart', page: p.page }));
      s.items.push({ seq: r.no, text: r.text.replace(/\s+/g, ' ').trim(), cat: r.cat, extra: r.extra });
    } else {
      const top = r.section === 'NOTES' ? r.no : String(r.section).split(' ')[0];
      let s = steps.find((x) => x.seq === top && x.page === p.page);
      if (!s) steps.push((s = { seq: top, type: stepType(r.text), title: '', items: [], source: 'Note ' + top, page: p.page }));
      s.items.push({ seq: r.no, text: r.text.replace(/\s+/g, ' ').trim(), cat: r.cat, extra: r.extra });
    }
  }
  return steps;
}
/** First material found -> QR material candidate (fed to the materials catalog check). */
function materialFrom(results) {
  for (const p of results) if (p.material) {
    const m = p.material; const row = p.rows.find((r) => r.text === m.src || m.src.includes(r.text));
    return { raw: m.src.replace(/^MATERIAL\s*:\s*/i, '').replace(/\s+/g, ' ').trim(), source: (p.source === 'ROUTING TABLE' ? 'Routing chart ' : 'Note ') + (row ? row.no : ''), catalogNo: m.catno || undefined, conf: 1, friend: m };
  }
  return null;
}
const FLAG = [[/MULTIPLE COATINGS/, 'fx.multi'], [/NO STANDARD/, 'fx.noStd'], [/LOCATION IN DRAWING/, 'fx.location'], [/ASSEMBLY CONTEXT/, 'fx.assembly'], [/NO COATING FOUND/, 'fx.noCoating']];
/** Flags on processes and masking -> one plain problem per (row, flag). */
function problemsFrom(results) {
  const out = []; const seen = new Set();
  for (const p of results) for (const x of [...p.procs.map((q) => ({ ...q, kind: 'proc' })), ...p.masks.map((q) => ({ ...q, process: q.method, kind: 'mask' }))]) {
    for (const [re, key] of FLAG) {
      if (!re.test(x.flags || '')) continue;
      const id = key + '|' + x.no + '|' + (key === 'fx.multi' ? '' : x.process); if (seen.has(id)) continue; seen.add(id);
      out.push({ ...problem(key === 'fx.noStd' || key === 'fx.multi' ? 'Warning' : 'Info', 'Requirements', key, { no: x.no || '-', name: x.process, page: p.page }), evidence: [{ source: 'page ' + p.page, text: String(x.src || '').slice(0, 300) }], status: 'open' });
    }
  }
  return out;
}
module.exports = { routeFrom, materialFrom, problemsFrom };
