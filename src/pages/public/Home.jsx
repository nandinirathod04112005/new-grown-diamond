import { useCallback, useEffect } from 'react';

import HomeSceneDirector from '@/components/scene/HomeSceneDirector.jsx';
import { CHAPTERS, SCENE_END } from '@/lib/journey.js';
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
    const journey = document.getElementById('journey');
    if (!journey) return;
    const c = CHAPTERS[index];
    // Aim at the MIDDLE of the chapter, not its first frame. Landing exactly on
    // a boundary put the reader a chapter short — chapterAt() picks the last
    // chapter whose start is <= progress, so arriving a rounding error below
    // the boundary resolves to the previous one. The middle is also simply
    // where "go to this chapter" should put you.
    const at = c.at + (c.to - c.at) * 0.5;
    // The director's progress runs `top top` -> `bottom bottom`, so it is
    // measured over the journey's height MINUS one viewport, not its full
    // height. Using the full height overshot every chapter, landing past the
    // copy the button names.
    const travel = Math.max(0, journey.offsetHeight - window.innerHeight);
    const top = journey.offsetTop + travel * (at * SCENE_END);
    scrollTo(Math.round(top));
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
