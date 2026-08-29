import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribe to a media query.
 *
 * `useSyncExternalStore` is the right primitive here: a media query IS an
 * external store, so React reads it during render instead of setting state
 * from an effect and forcing a second pass.
 */
export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (!window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => (window.matchMedia ? window.matchMedia(query).matches : false),
    [query]
  );

  // No window during prerender: report "does not match".
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
