/**
 * Unified MRT command button classes — icon-first, theme-aware, macOS / iOS 2026 family.
 */

const btnBase =
  'mrt-btn mrt-action-btn inline-flex items-center justify-center rounded-[var(--mrt-radius,8px)] border leading-tight antialiased transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--mrt-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45';

/** Secondary — Cancel, Close, Back. */
export const MRT_BTN = `${btnBase} mrt-app-control mrt-btn-secondary mrt-action-btn--dialog-secondary h-10 px-4 gap-2 text-[13px] font-medium`;

/** Primary — Login, Save, Approve. */
export const MRT_BTN_PRIMARY = `${btnBase} mrt-btn-primary mrt-action-btn--dialog-primary h-10 px-4 gap-2 text-[13px] font-semibold`;

/** Full-width important action (Verify PIN, Generate Checklist). */
export const MRT_BTN_EMPHASIS = `${btnBase} mrt-btn-primary mrt-btn-emphasis mrt-action-btn--emphasis w-full gap-1.5 text-[12px] font-semibold`;

/** Cancel / secondary ghost. */
export const MRT_BTN_GHOST = `${btnBase} mrt-btn-secondary mrt-action-btn--dialog-secondary h-10 px-4 gap-2 text-[13px] font-medium`;

/** Destructive / reset with warning tint. */
export const MRT_BTN_CAUTION = `${btnBase} mrt-btn-ghost mrt-btn-caution mrt-action-btn--dialog-secondary gap-2 text-[13px] font-medium`;

/** Disabled is visual only — Arrow, never Stop (RD-CURSOR-SMART-ARROW-358). */
export const MRT_BTN_DISABLED = 'disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:active:scale-100 disabled:shadow-none';

/** @deprecated Use MRT_BTN_PRIMARY — kept for incremental App.tsx migration. */
export const MRT_SOFT_PRIMARY_BTN = MRT_BTN_PRIMARY;

/** Icon-first action button variants (use with MrtActionButton). */
export const MRT_ACTION_BTN = `${btnBase} mrt-btn-secondary mrt-action-btn--row h-8 px-3 gap-2`;

export const MRT_ACTION_BTN_PRIMARY = `${btnBase} mrt-btn-primary mrt-action-btn--row h-8 px-3 gap-2 text-[12px] font-semibold`;

export const MRT_ACTION_BTN_TOPBAR = `${btnBase} mrt-btn-secondary mrt-topbar-cmd mrt-action-btn--topbar shrink-0 flex-col`;

export const MRT_ACTION_BTN_REPORT = `${btnBase} mrt-btn-secondary mrt-action-btn--report h-8 px-3 gap-2 text-[11px] font-medium`;

export const MRT_ACTION_BTN_GHOST = MRT_BTN_GHOST;

export const MRT_ACTION_BTN_PRIMARY_DIALOG = MRT_BTN_PRIMARY;

export const MRT_ACTION_BTN_EMPHASIS = MRT_BTN_EMPHASIS;

export const MRT_ACTION_BTN_CAUTION = MRT_BTN_CAUTION;

export const MRT_ACTION_BTN_DANGER = `${btnBase} mrt-btn-danger mrt-action-btn--row h-8 px-3 gap-2 text-[12px] font-medium`;

/** Rows / combo-style action trigger. */
export const MRT_ACTION_BTN_COMBO = `${btnBase} mrt-btn-secondary mrt-action-btn--combo h-8 shrink-0 px-2.5 gap-1.5 text-[11px] font-medium`;
