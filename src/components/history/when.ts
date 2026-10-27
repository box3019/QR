// Last opened date and time, dd/mm/yyyy hh:mm (local time).
export const when = (iso: string) => { const d = new Date(iso); if (isNaN(+d)) return ''; const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
