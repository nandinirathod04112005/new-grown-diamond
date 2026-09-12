import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hooks for the console's feedback layer.
 *
 * Split out of AdminFeedback.jsx so that file exports components only — a
 * module that mixes the two breaks Fast Refresh, which quietly turns every
 * edit during development into a full reload and loses whatever was on screen.
 */

let seq = 0;

/**
 * Transient confirmation, owned by the page that triggers the work.
 *
 * A hook rather than a global store: every screen that writes owns its own
 * toasts, and there is no module-level array for an unmounted component to go
 * on pushing into.
 */
export function useToasts() {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone, text) => {
    seq += 1;
    const id = seq;
    setItems((list) => [...list, { id, tone, text }]);
    /* Errors stay until dismissed. A failure that vanishes after four seconds
       is a failure nobody acted on. */
    if (tone !== 'error') {
      timers.current.set(id, setTimeout(() => dismiss(id), 4200));
    }
    return id;
  }, [dismiss]);

  /* Every pending timer is cleared on unmount, so navigating away mid-toast
     cannot schedule a state update on a component that is gone. */
  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); map.clear(); };
  }, []);

  return {
    toasts: items,
    dismiss,
    ok: (t) => push('ok', t),
    error: (t) => push('error', t),
    info: (t) => push('info', t),
  };
}

/*
 * A message carried across one in-app navigation — "Created" after a new
 * record moves to its own edit address and the screen remounts. Put before
 * navigating, taken once on arrival.
 */
let pendingFlash = '';

export function putFlash(text) {
  pendingFlash = text;
}

export function takeFlash() {
  const text = pendingFlash;
  pendingFlash = '';
  return text;
}

/**
 * Warns before a tab close or reload while a form is dirty.
 *
 * This covers leaving the PAGE. In-app navigation in this project is plain
 * anchors, which the browser treats as a document load — so the same
 * beforeunload covers those too, and there is no router hook to intercept.
 */
export function useUnsavedGuard(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
