import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import styles from './Reasons.module.css';

/**
 * Why lab-grown, answered six ways.
 *
 * The client's existing site states all six as flat cards on white. The claims
 * are the valuable part and they are kept verbatim in substance — certification
 * body, the 40-50% figure, the land and waste numbers — because those are the
 * facts a buyer actually searches for and the ones a crawler can index. What
 * changed is only the delivery: the cards arrive on scroll, in this site's
 * palette, rather than sitting in a static white grid.
 *
 * Each icon is a hairline drawing rather than a downloaded pictogram set. Six
 * icons from a generic pack read as a template; six drawn on the same 1px grid
 * as the rest of the site read as one hand.
 */

/*
 * Icons live here as raw path data, not as separate components.
 *
 * They are decorative and never referenced anywhere else, so a file each would
 * be six imports and six modules to say what six strings say. Each is drawn in
 * the same 24-unit box with the same stroke weight, which is what keeps them
 * looking like a set.
 */
const ICONS = {
  certified: (
    <>
      <circle cx="12" cy="9.5" r="5.5" />
      <path d="M9 14.2 7.5 21l4.5-2.4L16.5 21 15 14.2" />
      <path d="m9.8 9.4 1.6 1.6 2.8-3" />
    </>
  ),
  quality: (
    <>
      <path d="M12 3.2 14 7l4.2.6-3 3 .7 4.2-3.9-2-3.9 2 .7-4.2-3-3L10 7Z" />
      <path d="M8.6 15.4 7 21l5-2.2L17 21l-1.6-5.6" />
    </>
  ),
  /* A balance, not a hand holding a coin. Value is a comparison — like for
     like against a mined stone — and a scale says comparison at 24px where a
     hand says nothing. */
  value: (
    <>
      <circle cx="12" cy="4.4" r="1.1" />
      <path d="M12 5.6v13.6M8 19.2h8M4.5 8.4h15" />
      <path d="M4.5 8.4 2.5 12.7M19.5 8.4l2 4.3" />
      <path d="M.9 12.7h5.2a2.6 2.6 0 0 1-5.2 0ZM17.9 12.7h5.2a2.6 2.6 0 0 1-5.2 0Z" />
    </>
  ),
  /* Cupped hands under a stone. The first attempt was a literal handshake and
     it collapsed into a squiggle — a 24px box has room for one gesture, not
     eight fingers. */
  conflict: (
    <>
      <path d="M4 13.2c0 4.1 3.6 6.6 8 6.6s8-2.5 8-6.6" />
      <path d="M4 13.2 6.6 10.6M20 13.2 17.4 10.6" />
      <path d="m12 3.6 2.4 2.6-2.4 3.2-2.4-3.2Z" />
    </>
  ),
  genuine: (
    <>
      <path d="M12 3 5 5.6v5.8c0 4 2.9 7.6 7 8.6 4.1-1 7-4.6 7-8.6V5.6Z" />
      <path d="m8.8 11.8 2.4 2.4 4-4.6" />
    </>
  ),
  eco: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M8.2 15.8c0-4.2 3.1-6.8 7.3-6.8 0 4.2-3.1 6.8-7.3 6.8Z" />
      <path d="M8.2 15.8 6.6 17.4" />
    </>
  ),
};

/*
 * The claims, as the company makes them.
 *
 * `lead` is what a skim reads; `body` is what a crawler and a serious buyer
 * read. Keeping the specific numbers — IGI, GIA, 40 to 50 percent, 100 sq ft,
 * 6000 lbs — matters twice over: they are the substance of the claim, and they
 * are the long-tail phrases people actually type into a search box.
 */
const REASONS = [
  {
    id: 'certified',
    title: 'Certified',
    lead: 'Graded by an independent laboratory.',
    body:
      'New Grown Diamonds are graded by the independent diamond grading laboratory ' +
      'International Gemological Institute (IGI). If you are looking for real lab grown ' +
      'diamonds that are GIA certified, you can always contact New Grown Diamond.',
  },
  {
    id: 'quality',
    title: 'Quality',
    lead: 'The same hardness, stiffness and thermal conductivity.',
    body:
      'We bring you the best lab manufactured diamonds, with the same exceptional hardness, ' +
      'stiffness and thermal conductivity as their earth-mined counterparts. They are created ' +
      'to last for years, exactly as an earth-mined diamond does.',
  },
  {
    id: 'value',
    title: 'Value',
    lead: 'Around 40 to 50 percent less, like for like.',
    body:
      'Lab created diamonds offer excellent value and are more affordable than natural ' +
      'diamonds of comparable size and quality. Our lab-manufactured diamonds are priced ' +
      'around 40 to 50 percent less, and are free of humanitarian and environmental concerns.',
  },
  {
    id: 'conflict',
    title: 'Conflict-free',
    lead: 'No negative environmental or social impact.',
    body:
      'Our collection of ethical, affordable, conflict-free grown diamonds is more beautiful ' +
      'than anything we will ever take out of the earth, and comes free of any negative ' +
      'environmental or social impact.',
  },
  {
    id: 'genuine',
    title: 'Genuine',
    lead: '100% crystallised carbon, certificate included.',
    body:
      'Our grown diamonds are 100% pure crystallised carbon and identical in every way to ' +
      'earth-mined diamonds. You can trust New Grown Diamond to buy wholesale lab diamonds ' +
      'that are 100 percent real. We supply a certificate with every diamond.',
  },
  {
    id: 'eco',
    title: 'Eco-conscious',
    lead: 'Mining one carat disturbs nearly 100 sq ft of land.',
    body:
      'For every carat of diamond mined, nearly 100 sq ft of land is disturbed and almost ' +
      '6,000 lbs (2.7 tonnes) of mineral waste is created. Every purchase at New Grown Diamond ' +
      'funds the foundation that helps restore diamond communities.',
  },
];

/*
 * Six cards need room to arrive without the section overstaying. `view` is
 * sized so the last card has landed well before the scene releases.
 */
const PHASES = [
  { name: 'in', vh: 40 },
  { name: 'view', vh: 150 },
  { name: 'out', vh: 40 },
];

export default function Reasons() {
  return (
    <ScrollScene
      phases={PHASES}
      id="why-lab-grown"
      label="Why lab-grown diamonds"
      /* Six claims with their figures do not fit one phone viewport: the last
         card's copy was cut mid-sentence by the pinned pane. Stacked, the six
         are read rather than glimpsed. */
      mobileStack
    >
      <div className={styles.stage}>
        <header className={styles.head}>
          <p className={styles.kicker}>The case</p>
          <h2 className={styles.title}>Why lab-grown diamonds</h2>
        </header>

        <ul className={styles.grid}>
          {REASONS.map((r, i) => (
            <li key={r.id} className={styles.cell} style={{ '--i': i }}>
              <article className={styles.card}>
                <span className={styles.icon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[r.id]}
                  </svg>
                </span>
                <h3 className={styles.name}>{r.title}</h3>
                <p className={styles.lead}>{r.lead}</p>
                <p className={styles.body}>{r.body}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </ScrollScene>
  );
}
