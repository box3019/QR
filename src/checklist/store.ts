// The checklist needs the live Settings thresholds; App publishes them here on every render (screens re-render with App).
let cur: any = {};
export const setCkSettings = (s: any) => { cur = s || {}; };
export const getCkSettings = () => cur;
