// Interface options of Settings > Interface (QR's own copy of the MRT Appearance choices; no MRT code is shared).
// Theme ids are the CSS ids in src/styles/themes.css; tests/themes.test.cjs keeps this list, core/settings.cjs and the CSS in step.
export const PALETTES = ['aris-glass', 'icloud-windows', 'cleanmymac', 'priority-erp', 'industrial-steel', 'graphite', 'warm-neutral', 'soft-salad', 'soft-beige', 'soft-olive-gray', 'high-contrast'] as const;
/** The preset a new install starts with (MRT's DEFAULT_PALETTE_PRESET_ID is Industrial Steel). */
export const DEFAULT_PALETTE = 'industrial-steel';
export const DARK_PALETTES: readonly string[] = ['graphite'];
export const ACCENTS = ['slate', 'blue', 'teal', 'amber'] as const;
export const DENSITIES = ['comfortable', 'normal', 'compact'] as const;
export const ROW_HEIGHTS = ['compact', 'normal', 'relaxed'] as const;
export const isDark = (p?: string) => DARK_PALETTES.includes(p || '');
/** data-* attributes of the app root for a settings object. MRT's own preset blocks are bypassed: light uses palette "light", dark uses MRT's graphite + dark theme. */
export function themeAttrs(s: any) {
  const palette = PALETTES.includes(s?.palette) ? s.palette : DEFAULT_PALETTE; const dark = isDark(palette);
  return {
    'data-mrt-palette': dark ? 'graphite' : 'light', 'data-mrt-theme': dark ? 'dark' : 'light', 'data-qr-palette': palette,
    'data-qr-accent': ACCENTS.includes(s?.accent) ? s.accent : 'slate', 'data-qr-density': DENSITIES.includes(s?.density) ? s.density : 'normal', 'data-qr-rows': ROW_HEIGHTS.includes(s?.rowHeight) ? s.rowHeight : 'normal',
  } as Record<string, string>;
}
