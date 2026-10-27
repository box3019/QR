'use strict';
// RFQ/project history: the last 20 opened projects in %APPDATA%\QR\projects\history.json. Dropping out of the list
// never deletes project data; only removeHistory(..., deleteData=true) (the user's confirmed choice) removes the folder.
const fs = require('fs'); const path = require('path');
const MAX = 20; const ID = /^[a-z0-9-]{4,64}$/;
const file = (base) => path.join(base, 'projects', 'history.json');
function readHistory(base) { try { const j = JSON.parse(fs.readFileSync(file(base), 'utf8')); return Array.isArray(j) ? j.filter((e) => e && ID.test(e.id)) : []; } catch { return []; } }
function writeHistory(base, list) { fs.mkdirSync(path.dirname(file(base)), { recursive: true }); fs.writeFileSync(file(base) + '.tmp', JSON.stringify(list)); fs.renameSync(file(base) + '.tmp', file(base)); }
/** Newest first, one entry per project, at most 20. Returns { list, dropped } (dropped ids keep their data). */
function upsert(list, entry, max = MAX) { const l = [entry, ...list.filter((e) => e.id !== entry.id)]; return { list: l.slice(0, max), dropped: l.slice(max).map((e) => e.id) }; }
function touchHistory(base, entry) { if (!entry || !ID.test(entry.id)) throw new Error('bad project id'); const r = upsert(readHistory(base), entry); writeHistory(base, r.list); return r; }
function removeHistory(base, id, deleteData) {
  if (!ID.test(String(id))) throw new Error('bad project id');
  writeHistory(base, readHistory(base).filter((e) => e.id !== id));
  if (deleteData) fs.rmSync(path.join(base, 'projects', id), { recursive: true, force: true });
  return readHistory(base);
}
function loadProject(base, id) { if (!ID.test(String(id))) throw new Error('bad project id'); try { return JSON.parse(fs.readFileSync(path.join(base, 'projects', id, 'project.json'), 'utf8')); } catch { return null; } }
module.exports = { MAX, upsert, readHistory, touchHistory, removeHistory, loadProject };
