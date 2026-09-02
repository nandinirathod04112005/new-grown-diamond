/**
 * One scroll reading per frame, shared by everything that needs it.
 *
 * The WebGL film cannot read a CSS custom property, so the scroll position has
 * to exist as a number somewhere. Rather than let each consumer attach its own
 * scroll listener and call getBoundingClientRect independently — which is how
 * a page ends up doing six layout reads a frame — this module measures once
 * and hands the value out.
 *
 * The value is written into a mutable ref, never into React state: at sixty
 * readings a second, state would re-render the tree on every pixel of scroll.
 */
const state = { value: 0 };
const listeners = new Set();

let started = false;
let frame = 0;
let dirty = true;

function measure() {
  const doc = document.documentElement;
  const travel = doc.scrollHeight - window.innerHeight;
  const next = travel > 0 ? Math.min(1, Math.max(0, window.scrollY / travel)) : 0;

  if (next !== state.value) {
    state.value = next;
    for (const fn of listeners) fn(next);
  }

  dirty = false;
  frame = 0;
}

function schedule() {
  if (frame || !dirty) return;
  frame = requestAnimationFrame(measure);
}

function onScroll() {
  dirty = true;
  schedule();
}

function start() {
  if (started) return;
  started = true;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  measure();
}

/** Subscribe to page progress. Returns an unsubscribe function. */
export function onPageProgress(fn) {
  start();
  listeners.add(fn);
  fn(state.value);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
      frame = 0;
      started = false;
    }
  };
}

export function getPageProgress() {
  return state.value;
}
