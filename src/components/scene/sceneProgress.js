import { createContext, useContext } from 'react';

/**
 * The journey's live position, shared without re-rendering.
 *
 * `progress` is a REF, deliberately. Sixty scroll frames a second through
 * React state would re-render the whole homepage sixty times a second; the
 * scene reads the ref inside useFrame instead. Only `chapter` is state,
 * because captions genuinely change at six discrete points.
 *
 * `subscribe` lets a non-canvas consumer (a rail fill, a counter) run a
 * callback on each scrub frame without becoming a React update either.
 */
export const SceneProgressContext = createContext(null);

export function useSceneProgress() {
  const ctx = useContext(SceneProgressContext);
  if (!ctx) {
    throw new Error('useSceneProgress must be used inside HomeSceneDirector');
  }
  return ctx;
}

/** Safe variant for components that may render outside the homepage. */
export function useSceneProgressOptional() {
  return useContext(SceneProgressContext);
}
