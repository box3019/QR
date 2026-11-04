// Route-card row labels: drop a repeated type/title pair; hide a source column when every step shares it.

export function opLabel(type, title) {
  const a = String(type || '').trim();
  const b = String(title || '').trim();
  if (!b || b === a) return a;
  return a ? a + ' \u00b7 ' + b : b;
}

export function sameRouteSource(srcs) {
  const list = (srcs || []).map((x) => String(x || '').trim());
  return list.length > 0 && list.every((x) => x === list[0]);
}
