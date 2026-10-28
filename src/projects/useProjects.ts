// Open projects: tab list and order, active tab, each tab's meta, its run/save functions; saved to disk and reopened on restart. Also Save, Save as (.qrproj), Open project.
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { newId, reorder, closeNeedsConfirm, routeOutlook } from './store.mjs';

const qr = () => (window as any).qr;
export type Proj = { id: string; initial: any; pending?: string[] };
type Api = { save: () => Promise<string | null>; snapshot: () => any };
export function useProjects(notify?: (n: any) => void) {
  const [list, setList] = useState([] as Proj[]); const [active, setActive] = useState(''); const [metas, setMetas] = useState({} as Record<string, any>);
  const runners = useRef({} as Record<string, (p: string[]) => any>); const apis = useRef({} as Record<string, Api>); const loaded = useRef(false); const S = useRef({ list, active, metas }); S.current = { list, active, metas };
  useEffect(() => { qr().listProjects().then((r: any) => { const ps = r.projects.length ? r.projects.map((p: any) => ({ id: p.id, initial: p.data })) : [{ id: newId(), initial: null }];
    setList(ps); setActive(ps.some((p: Proj) => p.id === r.active) ? r.active : ps[0].id); loaded.current = true; }); }, []);
  useEffect(() => { if (loaded.current) qr().saveProjectsIndex({ order: list.map((p) => p.id), active }); }, [list, active]);
  const add = (pending?: string[]) => { const id = newId(); setList((l) => [...l, { id, initial: null, pending }]); setActive(id); return id; };
  /** Close = remove the tab only: the project is saved first and stays in History and on disk. Only a running job asks first. */
  const close = async (id: string) => {
    const busy = closeNeedsConfirm(S.current.metas[id]);
    if (busy && !confirm(t('tab.closeBusy'))) return;
    if (!busy) { try { await apis.current[id]?.save(); } catch {} }
    const l = S.current.list; const i = l.findIndex((p) => p.id === id); if (i < 0) return; const n = l.filter((p) => p.id !== id); const out = n.length ? n : [{ id: newId(), initial: null }];
    setList(out); if (S.current.active === id) setActive((out[Math.max(0, i - 1)] || out[0]).id); delete runners.current[id]; delete apis.current[id];
  };
  const save = async (id: string = S.current.active) => { const m = S.current.metas[id]; const a = apis.current[id]; if (!a || !m || !m.nParts || m.status === 'busy') return false;
    try { return !!(await a.save()); } catch (e: any) { notify && notify({ code: 'saveFailed', vars: { text: e?.message || e } }); return false; } };
  const saveAs = async () => { const id = S.current.active; const m = S.current.metas[id]; const a = apis.current[id]; if (!a || !m || !m.nParts || m.status === 'busy') return false;
    try { const r = await qr().saveProjectAs(id, a.snapshot(), m.label || ''); if (r) notify && notify({ code: 'savedAs', vars: { file: r.file, n: r.files } }); return !!r; }
    catch (e: any) { notify && notify({ code: 'saveFailed', vars: { text: e?.message || e } }); return false; } };
  /** Open a .qrproj (picked or dropped) as a new project tab; an empty current tab is replaced. */
  const openProject = async (file?: string) => {
    try { const f = file || await qr().pickProjectFile(); if (!f) return false; const r = await qr().importProject(f); const { active: a, metas: m } = S.current; const empty = m[a] && m[a].status === 'empty' ? a : '';
      setList((l) => [...l.filter((p) => p.id !== empty), { id: r.id, initial: r.data }]); setActive(r.id); return true; }
    catch (e: any) { notify && notify({ code: 'openFailed', vars: { text: e?.message || e } }); return false; }
  };
  const importOutlook = async (files: string[]) => {
    const pk = await qr().peekMail(files).catch(() => null); const { list: l, active: a, metas: m } = S.current;
    const r = routeOutlook(l.map((p) => ({ id: p.id, ...(m[p.id] || {}) })), pk ? pk.keys : [], a);
    if (r.kind === 'focus') { setActive(r.id!); notify && notify({ code: 'sameMail' }); } else if (r.kind === 'active') runners.current[a]?.(files); else add(files);
  };
  /** History: focus the tab when open, else load it from disk into a new tab (same step and state). */
  const reopen = async (id: string) => { if (S.current.list.some((p) => p.id === id)) { setActive(id); return true; }
    const data = await qr().loadProject(id).catch(() => null); if (!data) return false; setList((l) => [...l, { id, initial: data }]); setActive(id); return true; };
  return { list, active, metas, setActive, add, close, save, saveAs, openProject, importOutlook, reopen, move: (a: number, b: number) => setList((l) => reorder(l, a, b)),
    setMeta: (id: string, m: any) => setMetas((o) => ({ ...o, [id]: m })), register: (id: string, fn: any, api?: Api) => { runners.current[id] = fn; if (api) apis.current[id] = api; },
    runActive: (paths: string[]) => runners.current[S.current.active]?.(paths) };
}
