import { createContext, useContext } from 'react';

/**
 * True once the preloader has finished leaving. Context passes straight
 * through RouterProvider, so the hero can hold its opening timeline until
 * there is actually somebody watching it.
 */
export const ReadyContext = createContext(true);
export const useReady = () => useContext(ReadyContext);
