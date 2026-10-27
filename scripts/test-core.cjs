const { runPipeline } = require('../core/pipeline.cjs');
(async () => {
  const ocr = process.env.OCR !== '0';
  for (const set of process.argv.slice(2).map((s) => s.split('+'))) {
    const r = await runPipeline(set, { ocr, ocrDpi: 400 }, (e) => e.type === 'error' && console.error(e));
    for (const p of r.parts) {
      console.log('=====', p.drawing.name, p.customer, p.partNo, 'rev', p.rev, '|', p.title, '|', p.textMode, p.status, p.rejectReason, '| readiness', p.readiness);
      console.log('material:', JSON.stringify(p.material));
      console.log('pages:', p.drawing.pages.map((x) => `${x.n}:${x.quality.mode}${x.ocr ? ' ocr ' + x.ocr.words.length + 'w ' + x.ocr.seconds + 's' : ''}`).join(' '));
      console.log('threads:', p.threads.map((t) => t.thread + (t.insert ? '[ins]' : '')).join(', '));
      console.log('inserts:', JSON.stringify(p.threadMatches));
      console.log('route:'); for (const s of p.route) console.log('  ', s.seq, s.type, s.title, s.blocked ? 'BLOCKED' : '', s.outsourced ? 'OUT' : '', s.moved || '', '|', s.items.map((i) => i.seq + ' ' + i.text).join(' / ').slice(0, 200));
      console.log('refs:', p.refs.map((r) => r.number + ':' + r.kind).join(', '));
      console.log('zones:', JSON.stringify(p.zones));
      console.log('PROBLEMS:'); for (const x of p.problems) console.log('  ', x.severity, x.category, '-', x.message, '=>', x.suggestion);
      console.log('TASKS:', p.tasks.filter((t) => t.type === 'uploadDocument').map((t) => t.title + ' [' + t.blocks + ']').join('\n   '), '| verify tasks', p.tasks.filter((t) => t.type === 'verify').length);
    }
  }
})();
