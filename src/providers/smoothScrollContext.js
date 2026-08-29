import { createContext, useContext } from 'react';

/** Shared scroll API. Kept apart from the provider so that file exports only a component. */
export const SmoothScrollContext = createContext({ scrollTo: () => {} });

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}
