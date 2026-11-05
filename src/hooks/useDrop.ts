// Window drop handling: only external files (Explorer or Outlook) import; drags that start inside the app (panning) never do, and dragover only shows the overlay.
import { useEffect, useRef } from 'react';
import { isExternalDrop } from '../wizard/dropGuard.mjs';
import { captureDroppedFiles } from '../wizard/dropCapture.mjs';

const qr = () => (window as any).qr;

function dropApi() {
  const q = qr();
  return {
    pathForFile: (f: any) => { try { return q.pathForFile(f) || ''; } catch { return ''; } },
    startSession: () => q.dropStart(),
    stagePath: (dir: string, src: string, name: string) => q.stageDropPath(dir, src, name),
    stageBytes: (dir: string, name: string, bytes: ArrayBuffer) => q.stageDropBytes(dir, name, bytes),
    arrayBuffer: (f: any) => f.arrayBuffer(),
    sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
    log: (msg: string) => { try { q.logDrop?.(msg); } catch {} },
  };
}

export function useDrop(run: (p: string[]) => any, settings: any, setOver: (b: boolean) => void, notify?: (n: any) => void) {
  const internal = useRef(false);
  useEffect(() => { const on = () => { internal.current = true; }; const off = () => { internal.current = false; };
    document.addEventListener('dragstart', on, true); document.addEventListener('dragend', off, true); document.addEventListener('drop', off);
    return () => { document.removeEventListener('dragstart', on, true); document.removeEventListener('dragend', off, true); document.removeEventListener('drop', off); }; }, []);
  const onDragOver = (e: any) => { e.preventDefault(); setOver(isExternalDrop(e.dataTransfer.types, internal.current)); };
  const onDrop = (e: any) => {
    e.preventDefault(); setOver(false);
    const ext = isExternalDrop(e.dataTransfer.types, internal.current); internal.current = false;
    if (!ext) return; // internal drag (panning, text, images inside the app): never an import
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) {
      if (settings && settings.outlookDrag === false) return; // dragged from Outlook: take the selected e-mail(s)
      qr().outlookSelection().then(run).catch((x: any) => alert(String(x?.message || x)));
      return;
    }
    captureDroppedFiles(files, dropApi()).then((r) => {
      if (r.failed.length) notify && notify({ code: r.paths.length ? 'dropPartial' : 'dropFailed', vars: { list: r.failed.map((x: any) => x.name).join(', ') } });
      if (r.paths.length) run(r.paths);
    }).catch((x: any) => notify && notify({ code: 'dropFailed', vars: { list: String((x && x.message) || x) } }));
  };
  return { onDragOver, onDragLeave: () => setOver(false), onDrop };
}
