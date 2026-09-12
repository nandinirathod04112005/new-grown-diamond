import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import SplitHeading from '@/components/motion/SplitHeading.jsx';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './Credentials.copy.js';
import styles from './Credentials.module.css';

/**
 * Awards, memberships and grading laboratories.
 *
 * This is the trust block. It is the least decorative section on the page and
 * deliberately so — someone who scrolls this far is checking whether the
 * company is real, and the answer to that is names, bodies and dates, not
 * motion.
 *
 * Logos are DISCOVERED, not listed. Any file dropped into
 * `src/assets/partners/` named after its slug below becomes that partner's
 * mark with no code change; until one exists, the partner shows as a typeset
 * wordmark. That fallback is not a placeholder to be embarrassed about — a
 * name set in the site's own type is honest and legible, whereas a missing
 * image is a broken row. It also means no third-party trademark is invented
 * here: the real marks arrive as real files, from the company.
 */
const LOGOS = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/partners/*.{webp,png,jpg,jpeg,svg}', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, '').toLowerCase(), url]),
);

/*
 * The award photographs, discovered and matched by name.
 *
 * `award-carats-2025.webp` keys itself to the award whose `id` is
 * `carats-2025`, so a photograph belongs to a citation rather than to a
 * position — the section used to take whichever file the glob happened to
 * return first and show it once, above both awards, which made a picture of
 * the Surat plate stand in for the Pune plaque as well. An award with no
 * photograph still reads: the citation is the part that carries the
 * information, and the plate is simply absent.
 */
const PHOTOS = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/company/award-*.{webp,png,jpg,jpeg}', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, url]) => [
    path.split('/').pop().replace(/^award-/, '').replace(/\.\w+$/, '').toLowerCase(),
    url,
  ]),
);

/* The awards themselves — `id`, event, place, photograph description and
   citation — are `awards` in Credentials.copy.js. */

const CONNECTED = [
  { slug: 'gjepc', name: 'GJEPC India' },
  { slug: 'polygon', name: 'Polygon' },
  { slug: 'jbt', name: 'Jewelers Board of Trade' },
  { slug: 'jewelers-of-america', name: 'Jewelers of America' },
  { slug: 'virtual-diamond-boutique', name: 'Virtual Diamond Boutique' },
  { slug: 'ncdia', name: 'NCDIA' },
];

const CERTIFIED = [
  { slug: 'igi', name: 'International Gemological Institute' },
  { slug: 'gia', name: 'GIA' },
  { slug: 'gcal', name: 'GCAL' },
];

const PHASES = [
  { name: 'in', vh: 40 },
  { name: 'view', vh: 150 },
  { name: 'out', vh: 40 },
];

function Marks({ items, label, id }) {
  return (
    <Reveal as="section" className={styles.marks} aria-labelledby={id}>
      <h3 className={styles.markTitle} id={id}>{label}</h3>
      <ul className={styles.markRow}>
        {items.map((m, i) => (
          /* The cell index drives the stagger, so the row fills in reading
             order rather than arriving as one block. */
          <li key={m.slug} className={styles.mark} style={{ '--i': i }}>
            {LOGOS[m.slug] ? (
              <img src={LOGOS[m.slug]} alt={m.name} loading="lazy" decoding="async" />
            ) : (
              /* No image yet — the name itself, set in the site's type. */
              <span className={styles.wordmark}>{m.name}</span>
            )}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export default function Credentials() {
  const c = useCopy(COPY);
  return (
    <ScrollScene
      phases={PHASES}
      id="recognition"
      label={c.label}
      /*
       * Pinned on a desk, ordinary reading flow on a phone.
       *
       * This scene is two award citations and eleven marks — more copy than a
       * 100dvh pin can hold at phone width. Compressed into one, the citations
       * ran past their own box and "Connected with" printed straight through
       * the last paragraph. Reasons and Exhibit stack for the same reason.
       */
      mobileStack
    >
      <div className={styles.stage}>
        <div className={styles.inner}>
          <div className={styles.awards}>
            <Reveal as="header" className={styles.head}>
              <p className={styles.kicker}>{c.kicker}</p>
              <SplitHeading as="h2" className={styles.title} text={c.title} />
            </Reveal>

            <ol className={styles.list}>
              {c.awards.map((a, i) => (
                /* Each award arrives on its own, a beat after the one above —
                   two plaques landing together reads as a banner. */
                <Reveal as="li" key={a.id} className={styles.award} delay={i * 140}>
                  {PHOTOS[a.id] ? (
                    <figure className={styles.plate}>
                      <img
                        src={PHOTOS[a.id]}
                        alt={a.photoAlt}
                        loading="lazy"
                        decoding="async"
                        width="900"
                        height="506"
                      />
                    </figure>
                  ) : null}
                  <div className={styles.citation}>
                    <p className={styles.event}>{a.event}</p>
                    <p className={styles.place}>{a.place}</p>
                    <p className={styles.body}>{a.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>

          <div className={styles.affiliations}>
            <Marks items={CONNECTED} label={c.connected} id="cred-connected" />
            <Marks items={CERTIFIED} label={c.certified} id="cred-certified" />
          </div>
        </div>
      </div>
    </ScrollScene>
  );
}
