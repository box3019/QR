// Guided part-check: one task at a time from the part blocks. Pure logic (no UI).
import { locate } from './breakdown.mjs';

export const TASK_SKIP = { none: 1 };
export const MARK_DONE = 'done';
export const MARK_PROBLEM = 'problem';

/** Blocks the operator walks through (grey "not on drawing" is listed on the summary only). */
export function guideTasks(blocks) {
  return (blocks || []).filter((b) => b && !TASK_SKIP[b.kind]);
}

/** Seed marks: already-ok blocks start checked so the first open item is the next real task. */
export function initialMarks(blocks, saved) {
  const out = { ...(saved || {}) };
  for (const b of blocks || []) {
    if (out[b.id]) continue;
    if (b.status === 'ok' || b.status === 'none') out[b.id] = MARK_DONE;
  }
  return out;
}

export function taskState(block, marks) {
  const m = marks && marks[block.id];
  if (m === MARK_DONE || m === MARK_PROBLEM) return m;
  if (block.status === 'ok') return MARK_DONE;
  if (block.status === 'bad') return MARK_PROBLEM;
  return 'todo';
}

export function applyMark(marks, id, mark) {
  return { ...(marks || {}), [id]: mark };
}

export function nextTaskIndex(tasks, marks, from) {
  const start = (from == null ? -1 : from) + 1;
  for (let i = start; i < tasks.length; i++) if (taskState(tasks[i], marks) === 'todo') return i;
  for (let i = 0; i < start && i < tasks.length; i++) if (taskState(tasks[i], marks) === 'todo') return i;
  return tasks.length;
}

export function firstTaskIndex(tasks, marks) {
  const i = tasks.findIndex((b) => taskState(b, marks) === 'todo');
  return i < 0 ? tasks.length : i;
}

export function locateBlock(part, b) {
  if (!part || !b) return null;
  const needle = (b.kind === 'standard' && b.title) || (b.details && b.details.raw) || b.value || '';
  const pgN = (b.pg && b.pg.page) || b.page || 1;
  const pages = (part.drawing && part.drawing.pages) || [];
  const pageToks = ((pages.find((p) => p.n === pgN) || {}).tokens) || [];
  const bbox = needle ? locate(String(needle), pageToks) : null;
  if (!bbox) return null;
  const st = b.status;
  return { page: pgN, bbox, boxes: [bbox], id: 'bd-' + b.id, tone: st === 'ok' ? 'checked' : st === 'bad' ? 'critical' : 'accent' };
}

export function missingDocs(part) {
  return ((part && part.tasks) || []).filter((x) => x.type === 'uploadDocument' && x.stage !== 'routecard' && x.status !== 'done');
}

export function openQuestions(part) {
  return ((part && part.problems) || []).filter((p) => p.severity !== 'Info' && p.status !== 'resolved');
}
