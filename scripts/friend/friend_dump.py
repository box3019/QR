# Runs the ORIGINAL notes_extractor.py logic on PDFs and dumps, per page, the pymupdf lines and every result row (JSON).
# Usage: python friend_dump.py <pdfDir> <out.json>
import json, sys, importlib.util
from pathlib import Path
here = Path(__file__).parent
spec = importlib.util.spec_from_file_location('ne', here / 'notes_extractor.py'); ne = importlib.util.module_from_spec(spec); spec.loader.exec_module(ne)
import pymupdf
out = []
for f in sorted(Path(sys.argv[1]).rglob('*.pdf')):
    doc = pymupdf.open(f)
    for pno, page in enumerate(doc, 1):
        lines = [{'t': l['t'], 'bbox': list(l['r'])} for l in ne.get_lines(page)]
        status, src, rows, box = ne.process_page(page)
        m = ne.extract_material(rows)
        procs, masks = ne.extract_processes(rows)
        summ = list(ne.summarize(procs, masks)) if rows else None
        out.append({'file': str(f.relative_to(sys.argv[1])), 'page': pno, 'width': page.rect.width, 'lines': lines, 'status': status, 'source': src,
                    'rows': [{k: r.get(k, '') for k in ('section', 'no', 'text', 'extra', 'cat')} for r in rows], 'material': m, 'procs': procs, 'masks': masks, 'summary': summ})
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
print(len(out), 'pages')
