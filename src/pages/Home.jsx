import { useRef } from 'react';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import Chapter from '@/sections/home/Chapter.jsx';
/*
 * The atelier sequence replaces the old hero. It is the same four moments the
 * client's reference sheets show — rough, plan, cut, finished — rebuilt as ONE
 * lit stage with a travelling seam rather than four slides, because the point
 * of the reference is that the room never moves while the stone does.
 *
 * Hero.jsx is left in place: swapping this import back restores it.
 */
import Atelier from '@/sections/home/Atelier.jsx';
import Reel from '@/sections/home/Reel.jsx';
import SceneSwitch from '@/sections/home/SceneSwitch.jsx';
import Reasons from '@/sections/home/Reasons.jsx';
import Credentials from '@/sections/home/Credentials.jsx';
import stone from '@/assets/diamonds/ngd-brilliant-macro.webp';
import seedToStone from '@/assets/process/seed-to-stone.webp';
import gradingBench from '@/assets/process/grading-bench.webp';
import latticeCut from '@/assets/process/lattice-cut.webp';
import ringAssembly from '@/assets/process/ring-assembly.webp';
import suratToWorld from '@/assets/process/surat-to-world.webp';
/**
 * Chapters are ordered the way the reference site orders its own: a key
 * visual, then numbered chapters that each hold the frame alone, then a
 * two-state scene, then the close. Seventy-five percent of the run is the
 * stone; jewellery arrives once, late, and does not compete with it.
 */
const CHAPTERS = [
  {
    id: 'diamonds',
    index: 'Chapter 01',
    title: 'One atom, repeated',
    lines: [
      'Our diamonds are grown in controlled laboratories',
      'using CVD and High Pressure High Temperature processes.',
      'They have the same physical, chemical and optical',
      'properties as earth-mined diamonds.',
    ],
    image: seedToStone,
    // A 16:9 illustration: it needs a landscape frame or it loses both ends.
    wide: true,
    alt: 'A seed crystal, a carbon lattice extending from it, and the finished brilliant it becomes.',
    /*
     * Labelled as an illustration, like the schematic it replaces.
     *
     * It is a render, not a photograph of the Surat floor — and it is good
     * enough to be mistaken for one, which is exactly why it needs saying. A
     * trade buyer who reads this as factory footage and later visits has been
     * misled by the site itself.
     */
    mediaLabel: 'Illustration · seed to finished stone',
  },
  {
    id: 'precision',
    index: 'Chapter 02',
    title: 'Graded independently',
    lines: [
      'Our diamonds are graded by independent laboratories',
      'including the International Gemological Institute.',
      'Inventory is presented with certificates, videos',
      'and the information needed for inspection.',
    ],
    flip: true,
    image: gradingBench,
    wide: true,
    alt: 'A polished diamond under a gemmological microscope beside a grading report and a row of cuts.',
    mediaLabel: 'Illustration · independent grading',
  },
  {
    id: 'quality',
    index: 'Chapter 03',
    title: 'Real diamond. Different origin.',
    lines: [
      'New Grown Diamond supplies crystallized-carbon diamonds,',
      'not simulants such as cubic zirconia or moissanite.',
      'Each diamond is created to retain the hardness,',
      'stiffness and durability expected of a diamond.',
    ],
    image: latticeCut,
    wide: true,
    alt: 'A brilliant-cut diamond with its carbon lattice visible inside it, a growth chamber lit behind.',
    mediaLabel: 'Illustration · the carbon lattice, cut',
  },
  {
    id: 'jewellery',
    index: 'Chapter 04',
    title: 'Made for your setting',
    lines: [
      'Our custom jewellery service brings the selected stone',
      'into a setting designed around its shape and proportions.',
      'From loose diamond selection to the finished piece,',
      'our team assists with inspection and customization.',
    ],
    flip: true,
    image: ringAssembly,
    wide: true,
    alt: 'A solitaire shown as separate parts — stone, head and shank — beside the finished ring.',
    mediaLabel: 'Illustration · stone into setting',
  },
  {
    id: 'contact',
    index: 'Chapter 05',
    title: 'Surat to the world',
    lines: [
      'Visit us in Surat or Mumbai, with offices also serving',
      'New York and Hong Kong. For diamond enquiries call',
      '+91 99139 99794 or email newgrowndiamonds@gmail.com.',
    ],
    image: suratToWorld,
    wide: true,
    alt: 'A globe with routes arcing from Surat out to New York and Hong Kong.',
    mediaLabel: 'Illustration · Surat to the world',
  },
];

export default function Home() {
  /*
   * One pointer listener for the whole page, not one per chapter.
   *
   * Custom properties inherit, so writing --mx/--my here means every chapter
   * below reads the same damped value for free. Five copies of the hook would
   * be five window listeners and five rAF loops computing the same number.
   */
  const page = useRef(null);
  usePointerParallax(page, 1);

  return (
    <main ref={page}>
      <Atelier />

      {CHAPTERS.map((c) => (
        <Chapter
          key={c.id}
          id={c.id}
          index={c.index}
          title={c.title}
          lines={c.lines}
          flip={c.flip}
          wide={c.wide}
          image={c.image ?? stone}
          alt={c.alt ?? 'A brilliant-cut laboratory-grown diamond, photographed close.'}
          mediaLabel={c.mediaLabel}
        />
      ))}

      <Reel />

      <SceneSwitch />

      {/* The argument, then the proof. Reasons makes the case for lab-grown at
          all; Credentials answers "and who says so" with named bodies. In that
          order, because the second is only worth reading once the first has
          raised the question. */}
      <Reasons />

      <Credentials />
    </main>
  );
}
