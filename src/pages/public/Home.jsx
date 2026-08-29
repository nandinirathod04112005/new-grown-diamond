import { useEffect } from 'react';

import ChapterRail from '@/components/chrome/ChapterRail.jsx';
import Hero from '@/sections/home/Hero.jsx';
import Genesis from '@/sections/home/Genesis.jsx';
import Precision from '@/sections/home/Precision.jsx';
import Inventory from '@/sections/home/Inventory.jsx';
import Manufacture from '@/sections/home/Manufacture.jsx';
import Atelier from '@/sections/home/Atelier.jsx';
import Assurance from '@/sections/home/Assurance.jsx';
import Ascent from '@/sections/home/Ascent.jsx';

/**
 * FROM CARBON TO BRILLIANCE
 *
 * One continuous descent from carbon into light, in seven chapters. The order
 * is the argument: what a diamond is, how it is made, what we hold, how it is
 * cut, what it becomes, who vouches for it, and what to do about it.
 */
export default function Home() {
  useEffect(() => {
    document.title = 'New Grown Diamond — From carbon to brilliance';
  }, []);

  return (
    <>
      <ChapterRail />
      <main id="main">
        <Hero />
        <Genesis />
        <Precision />
        <Inventory />
        <Manufacture />
        <Atelier />
        <Assurance />
        <Ascent />
      </main>
    </>
  );
}
