import { useEffect } from 'react';

import Hero from '@/sections/home/Hero.jsx';
import FeaturedDiamonds from '@/sections/home/FeaturedDiamonds.jsx';
import DiamondFinder from '@/sections/home/DiamondFinder.jsx';
import GrowthMethods from '@/sections/home/GrowthMethods.jsx';
import ManufacturingStory from '@/sections/home/ManufacturingStory.jsx';
import JewelleryPreview from '@/sections/home/JewelleryPreview.jsx';
import Certifications from '@/sections/home/Certifications.jsx';
import EnquiryCTA from '@/sections/home/EnquiryCTA.jsx';

export default function Home() {
  useEffect(() => {
    document.title = 'New Grown Diamond — Lab-grown diamonds & fine jewellery';
  }, []);

  return (
    <main id="main">
      <Hero />
      <FeaturedDiamonds />
      <DiamondFinder />
      <GrowthMethods />
      <ManufacturingStory />
      <JewelleryPreview />
      <Certifications />
      <EnquiryCTA />
    </main>
  );
}
