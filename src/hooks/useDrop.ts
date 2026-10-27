// Window drop handling: only external files (Explorer or Outlook) import; drags that start inside the app (panning) never do, and dragover only shows the overlay.
import { useEffect, useRef } from 'react';
import { isExternalDrop } from '../wizard/dropGuard.mjs';

const qr = () => (window as any).qr;
export function useDrop(run: (p: string[]) => any, settings: any, setOver: (b: boolean) => void) {
  const internal = useRef(false);
  useEffect(() => { const on = () => { internal.current = true; }; const off = () => { internal.current = false; };
    document.addEventListener('dragstart', on, true); document.addEventListener('dragend', off, true); document.addEventListener('drop', off);
    return () => { document.removeEventListener('dragstart', on, true); document.removeEventListener('dragend', off, true); document.removeEventListener('drop', off); }; }, []);
  const onDragOver = (e: any) => { e.preventDefault(); setOver(isExternalDrop(e.dataTransfer.types, internal.current)); };
  const onDrop = (e: any) => {
    e.preventDefault(); setOver(false);
    const ext = isExternalDrop(e.dataTransfer.types, internal.current); internal.current = false;
    if (!ext) return; // internal drag (panning, text, images inside the app): never an import
    const paths = Array.from(e.dataTransfer.files as FileList).map((f) => qr().pathForFile(f)).filter(Boolean);
    if (paths.length) return run(paths);
    if (settings && settings.outlookDrag === false) return; // dragged from Outlook: take the selected e-mail(s)
    qr().outlookSelection().then(run).catch((x: any) => alert(String(x?.message || x)));
  };
  return { onDragOver, onDragLeave: () => setOver(false), onDrop };
}
