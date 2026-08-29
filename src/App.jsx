import { useCallback, useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';

import { router } from '@/app/routes.jsx';
import { ReadyContext } from '@/app/readyContext.js';
import SmoothScrollProvider from '@/providers/SmoothScrollProvider.jsx';
import Preloader from '@/components/preloader/Preloader.jsx';
import Cursor from '@/components/chrome/Cursor.jsx';

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const onDone = useCallback(() => setLoaded(true), []);

  // Nothing scrolls behind the curtain.
  useEffect(() => {
    if (loaded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [loaded]);

  return (
    <SmoothScrollProvider>
      <ReadyContext.Provider value={loaded}>
        {!loaded && <Preloader onDone={onDone} />}
        <Cursor />
        <RouterProvider router={router} />
      </ReadyContext.Provider>
    </SmoothScrollProvider>
  );
}
