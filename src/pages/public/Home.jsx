import { useCallback, useEffect } from 'react';

import HomeSceneDirector from '@/components/scene/HomeSceneDirector.jsx';
import { useSmoothScroll } from '@/providers/smoothScrollContext.js';
import Hero from '@/sections/home/Hero.jsx';
import Genesis from '@/sections/home/Genesis.jsx';
import Precision from '@/sections/home/Precision.jsx';
import Manufacture from '@/sections/home/Manufacture.jsx';
import Inventory from '@/sections/home/Inventory.jsx';
import Atelier from '@/sections/home/Atelier.jsx';
import Assurance from '@/sections/home/Assurance.jsx';
import Ascent from '@/sections/home/Ascent.jsx';

/**
 * FROM CARBON TO BRILLIANCE
 *
 * One continuous descent from carbon into light, over ONE fixed stage and ONE
 * scroll controller.
 *
 * The journey — Hero, Genesis, Precision, Manufacture, Inventory, Atelier —
 * scrolls over a single sticky scene directed by HomeSceneDirector. Every
 * chapter, the scene, the rail and the crossfades read the same normalized
 * progress, so nothing on the page can hold a different opinion about where
 * the reader is. Assurance and Ascent close the page after the stage releases.
 *
 * The weighting is deliberate: five of the six journey sections are the
 * diamonds themselves — how they are grown, cut, made and held — and one is
 * the jewellery they end up in.
 */
export default function Home() {
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    document.title = 'New Grown Diamond — From carbon to brilliance';
  }, []);

  // The rail addresses chapters, which are positions in the scene rather than
  // elements, so a jump is a scroll to a fraction of the journey's height.
  const jump = useCallback((key, index) => {
    // Scroll to the chapter's own slot.
    //
    // This used to compute a fraction of the journey's height from the
    // chapter's normalized start and a hard-coded SCENE_END. Both halves were
    // approximations of a layout that is measured elsewhere, and they drifted
    // apart at any viewport that was not roughly 1440x900. The panel knows
    // where it is; ask it.
    const slot = document.querySelector(`[data-chapter-slot="${index}"]`);
    if (slot) {
      // Document coordinates: offsetTop would be measured from the chapter's
      // own section, which is position: relative, not from the page.
      const top = slot.getBoundingClientRect().top + window.scrollY;
      // A little into the slot, so the panel is settled rather than arriving.
      scrollTo(Math.round(top + slot.offsetHeight * 0.25));
      return;
    }
    const journey = document.getElementById('journey');
    if (journey) {
      scrollTo(Math.round(journey.getBoundingClientRect().top + window.scrollY));
    }
  }, [scrollTo]);

  return (
    <>
      <main id="main">
        <HomeSceneDirector onJump={jump}>
          <Hero />
          <Genesis />
          <Precision />
          <Manufacture />
          <Inventory />
          <Atelier />
        </HomeSceneDirector>
        <Assurance />
        <Ascent />
      </main>
    </>
  );
}
