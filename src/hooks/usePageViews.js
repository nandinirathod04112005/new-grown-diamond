import { useEffect, useRef } from 'react';

import { trackPageView } from '@/lib/analytics.js';

/**
 * Counts one page view per route change.
 *
 * `fullPath` is the pathname WITH its language prefix (/hi/diamonds), so the
 * console can tell the languages apart. The ref keeps a re-render — or React's
 * development double-run of effects — from counting the same arrival twice;
 * only a different path is a new view. Whether anything is actually sent (host,
 * /admin, Do Not Track) is decided in lib/analytics.js, not here.
 */
export function usePageViews(fullPath) {
  const last = useRef(null);

  useEffect(() => {
    if (!fullPath || last.current === fullPath) return;
    last.current = fullPath;
    trackPageView(fullPath);
  }, [fullPath]);
}

export default usePageViews;
