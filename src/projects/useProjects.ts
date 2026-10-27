// Open projects: tab list and order, active tab, each tab's meta, its run function; saved to disk and reopened on restart.
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { newId, reorder, closeNeedsConfirm, routeOutlook } from './store.mjs';

const qr = () => (window as any).qr;
export type Proj = { id: string; initial: any; pending?: string[] };
export function useProjects() {
  const [list, setList] = useState([] as Proj[]); const [active, setActive] = useState(''); const [metas, setMetas] = useState({} as Record<string, any>);
  const runners = useRef({} as Record<string, (p: string[]) => any>); const loaded = useRef(false); const S = useRef({ list, active, metas }); S.current = { list, active, metas };
  useEffect(() => { qr().listProjects().then((r: any) => { const ps = r.projects.length ? r.projects.map((p: any) => ({ id: p.id, initial: p.data })) : [{ id: newId(), initial: null }];
    setList(ps); setActive(ps.some((p: Proj) => p.id === r.active) ? r.active : ps[0].id); loaded.current = true; }); }, []);
  useEffect(() => { if (loaded.current) qr().saveProjectsIndex({ order: list.map((p) => p.id), active }); }, [list, active]);
  const add = (pending?: string[]) => { const id = newId(); setList((l) => [...l, { id, initial: null, pending }]); setActive(id); return id; };
  const close = (id: string) => {
    if (closeNeedsConfirm(S.current.metas[id]) && !confirm(t('tab.closeAsk'))) return;
    const l = S.current.list; const i = l.findIndex((p) => p.id === id); const n = l.filter((p) => p.id !== id); const out = n.length ? n : [{ id: newId(), initial: null }];
    setList(out); if (S.current.active === id) setActive((out[Math.max(0, i - 1)] || out[0]).id); delete runners.current[id];
  };
  const importOutlook = async (files: string[]) => {
    const key = await qr().peekRfq(files).catch(() => null); const { list: l, active: a, metas: m } = S.current;
    const r = routeOutlook(l.map((p) => ({ id: p.id, ...(m[p.id] || {}) })), key, a);
    if (r.kind === 'focus') setActive(r.id!); else if (r.kind === 'active') runners.current[a]?.(files); else add(files);
  };
  /** History: focus the tab when open, else load it from disk into a new tab (same step and state). */
  const reopen = async (id: string) => { if (S.current.list.some((p) => p.id === id)) { setActive(id); return true; }
    const data = await qr().loadProject(id).catch(() => null); if (!data) return false; setList((l) => [...l, { id, initial: data }]); setActive(id); return true; };
  return { list, active, metas, setActive, add, close, importOutlook, reopen, move: (a: number, b: number) => setList((l) => reorder(l, a, b)),
    setMeta: (id: string, m: any) => setMetas((o) => ({ ...o, [id]: m })), register: (id: string, fn: any) => { runners.current[id] = fn; },
    runActive: (paths: string[]) => runners.current[S.current.active]?.(paths) };
}
