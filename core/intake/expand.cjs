'use strict';
// intake/expand: turn dropped paths (files, folders, archives, emails) into a flat file list plus RFQ records.
const fs = require('fs');
const path = require('path');
const { fileKind } = require('./classify.cjs');
const { extractArchive, cacheDirFor, defaultImportCache, ZIP_NEST_DEPTH } = require('./archive.cjs');

let n = 0;
const sub = (tmp, name) => path.join(tmp, `${path.basename(name).replace(/[^\w.\- ]/g, '_')}_${Date.now()}_${n++}`);
const isZip = (p) => /\.zip$/i.test(p);
const sourceLabel = (archives, inner) => [...archives, String(inner || '').replace(/\//g, path.sep)].filter(Boolean).join(' > ');

/**
 * @param {string[]} paths
 * @param {string} tmp working folder
 * @param {{ sevenZip?: string, readEmail?: Function, onStatus?: Function, onError?: Function, importCache?: string, names?: Map, sources?: Map, chain?: string[] }} opts
 * @returns {Promise<{ files: string[], rfqs: object[], sources: Map }>}
 */
async function expand(paths, tmp, opts = {}, depth = 0) {
  const files = []; const rfqs = [];
  const sources = opts.sources || new Map();
  const names = opts.names || new Map();
  const chain = opts.chain || [];
  const status = opts.onStatus || (() => {}); const fail = opts.onError || ((f, e) => { throw e; });
  const tell = (text, extra) => { try { extra ? status(text, extra) : status(text); } catch { status(text); } };
  for (const p of paths) {
    let st; try { st = fs.statSync(p); } catch (e) { fail(p, e); continue; }
    if (st.isDirectory()) { const r = await expand(fs.readdirSync(p).map((x) => path.join(p, x)), tmp, { ...opts, sources, names, chain }, depth); files.push(...r.files); rfqs.push(...r.rfqs); continue; }
    const kind = fileKind(p);
    const zip = isZip(p);
    const max = zip ? ZIP_NEST_DEPTH : 5;
    if (kind === 'archive' && depth < max) {
      try {
        tell(`Unpacking ${path.basename(p)}`, { stage: 'unpack', i: depth + 1, n: Math.max(1, max) });
        const dest = zip ? cacheDirFor(p, opts.importCache || defaultImportCache()) : sub(tmp, p);
        const extracted = await extractArchive(p, dest, {
          ...opts,
          names,
          onProgress: (pr) => tell(`Unpacking ${path.basename(p)}`, { stage: 'unpack', i: pr.i, n: pr.n }),
        });
        const nextChain = [...chain, path.basename(p)];
        for (const f of extracted) {
          const inner = names.get(f) || path.relative(dest, f);
          const label = sourceLabel(nextChain, inner);
          sources.set(f, { archives: nextChain, inner, label, title: label + '\n' + f });
        }
        const r = await expand(extracted, tmp, { ...opts, sources, names, chain: nextChain }, depth + 1);
        files.push(...r.files); rfqs.push(...r.rfqs);
      } catch (e) { fail(p, e); }
    } else if (kind === 'email' && opts.readEmail && depth < 5) {
      try {
        tell(`Reading email ${path.basename(p)}`);
        const { rfq, attachmentFiles } = await opts.readEmail(p, sub(tmp, p));
        rfqs.push(rfq);
        const r = await expand(attachmentFiles, tmp, { ...opts, sources, names, chain }, depth + 1); files.push(...r.files); rfqs.push(...r.rfqs);
      } catch (e) { fail(p, e); }
    } else {
      files.push(p);
      if (chain.length && !sources.has(p)) {
        const inner = names.get(p) || path.basename(p);
        const label = sourceLabel(chain, inner);
        sources.set(p, { archives: chain, inner, label, title: label + '\n' + p });
      }
    }
  }
  return { files, rfqs, sources };
}
module.exports = { expand, sourceLabel };
