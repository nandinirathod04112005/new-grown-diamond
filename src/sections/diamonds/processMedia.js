import furnace from '@/assets/process/cvd-furnace.webm';
import rough from '@/assets/process/hpht-rough.jpg';
import cut from '@/assets/process/cut-stone.jpg';

/**
 * Real footage and photography of synthetic diamond production.
 *
 * Every file is Public Domain or CC BY from Wikimedia Commons — NOT taken from
 * Google Images or Pinterest, which are other people's copyrighted work and
 * would expose a commercial site to takedowns. CC BY requires attribution, so
 * the credit is rendered on the page rather than buried in a file.
 *
 * Stage 01 deliberately has NO plate: there is no honest public image of a CVD
 * seed plate in the set, and an unrelated photograph presented as one would be
 * worse than showing nothing. Replace all of these with your own factory
 * photography when you have it — your own reactor is more credible than
 * anyone else's, and the seed plate is sitting in your building.
 */
export const STAGE_MEDIA = {
  s2: {
    type: 'video',
    src: furnace,
    alt: 'A CVD diamond growth furnace running',
    caption: 'CVD growth furnace',
    credit: 'Wikimedia Commons · CC BY 2.0',
  },
  s3: {
    type: 'video',
    src: furnace,
    alt: 'A CVD diamond growth furnace during deposition',
    caption: 'Deposition under way',
    credit: 'Wikimedia Commons · CC BY 2.0',
  },
  s5: {
    type: 'image',
    src: rough,
    alt: 'As-grown synthetic diamond rough crystals',
    caption: 'As-grown rough · HPHT route',
    credit: 'Wikimedia Commons · Public domain',
  },
  s8: {
    type: 'image',
    src: cut,
    alt: 'A cut and polished laboratory-grown diamond',
    caption: 'Cut and polished',
    credit: 'Wikimedia Commons · CC BY 2.0',
  },
};

/*
 * Stages 01, 04, 06 and 07 deliberately carry no documentary plate: there is
 * no honest public image of a CVD seed plate, an HPHT press cycle, a rough
 * being scanned, or a polishing wheel in the licensed set, and an unrelated
 * photograph presented as one is worse than showing nothing. Those four are
 * exactly where your own eight frames — or your own factory — do the work.
 */
