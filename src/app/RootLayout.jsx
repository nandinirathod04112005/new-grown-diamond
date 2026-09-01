import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Header from '@/components/layout/Header.jsx';
import Footer from '@/components/layout/Footer.jsx';
import { ScrollTrigger } from '@/lib/motion/gsap.js';
import { useSmoothScroll } from '@/providers/smoothScrollContext.js';
import PageTransition from '@/components/motion/PageTransition.jsx';
import ScrollProgress from '@/components/motion/ScrollProgress.jsx';

/**
 * Shared chrome plus per-navigation scroll handling: jump to the top, then
 * refresh ScrollTrigger so the incoming page's triggers measure against the
 * new layout rather than the outgoing one's.
 */
export default function RootLayout() {
  const { pathname } = useLocation();
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    window.scrollTo(0, 0);
    scrollTo(0, { immediate: true });
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname, scrollTo]);

  return (
    <>
      <Header />
      <ScrollProgress />
      <PageTransition><Outlet /></PageTransition>
      <Footer />
    </>
  );
}
