import { useEffect, useState } from 'react';

/**
 * Minimal read-only async data hook — enough for page data without pulling in
 * a caching library the project does not yet need.
 *
 * Deliberately fetches ONCE on mount. Callers pass an inline arrow whose
 * identity changes every render, so keying the effect on it would loop; to
 * refetch, remount the consumer with a different React `key`.
 *
 * The alive flag guards against setting state after unmount, which
 * StrictMode's double-mount would otherwise surface as a warning.
 */
export default function useAsyncData(loader) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  // Capture the first loader. A lazy initialiser keeps this out of render's
  // side-effect path, unlike writing to a ref while rendering.
  const [runLoader] = useState(() => loader);

  useEffect(() => {
    let alive = true;

    runLoader()
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (alive) setState({ data: null, error, loading: false });
      });

    return () => {
      alive = false;
    };
  }, [runLoader]);

  return state;
}
