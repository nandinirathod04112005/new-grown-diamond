import ScrollScene from '@/components/scroll/ScrollScene.jsx';
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
 * The award photograph, same mechanism. Drop
 * `src/assets/company/award-carats-2025.jpg` in and the plate fills itself;
 * without it the citations still stand on their own, which is the part that
 * carries the information.
 */
const AWARD = Object.values(
  import.meta.glob('@/assets/company/award-*.{webp,png,jpg,jpeg}', {
    eager: true,
    import: 'default',
  }),
)[0];

const AWARDS = [
  {
    id: 'carats-2025',
    event: 'CARATS 2025 Diamond Expo',
    place: 'Surat',
    body:
      'An appreciation award received at CARATS 2025 Diamond Expo (Surat), organised by the ' +
      'Surat Diamond Association, for our participation and contribution to the evolving ' +
      'lab-grown diamond industry.',
  },
  {
    id: 'ugjis-2024',
    event: 'Unique Gems & Jewellery International Show',
    place: 'Pune · 2024',
    body:
      'An appreciation award received at UGJIS 2024, Pune, for our participation and ' +
      'contribution to the lab-grown diamond industry — recognising our work on quality ' +
      'craftsmanship, innovation and trust in modern diamond jewellery.',
  },
];

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
    <section className={styles.marks} aria-labelledby={id}>
      <h3 className={styles.markTitle} id={id}>{label}</h3>
      <ul className={styles.markRow}>
        {items.map((m) => (
          <li key={m.slug} className={styles.mark}>
            {LOGOS[m.slug] ? (
              <img src={LOGOS[m.slug]} alt={m.name} loading="lazy" decoding="async" />
            ) : (
              /* No image yet — the name itself, set in the site's type. */
              <span className={styles.wordmark}>{m.name}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Credentials() {
  return (
    <ScrollScene phases={PHASES} id="recognition" label="Awards and recognition">
      <div className={styles.stage}>
        <div className={styles.inner}>
          <div className={styles.awards}>
            <header className={styles.head}>
              <p className={styles.kicker}>Recognition</p>
              <h2 className={styles.title}>Awards &amp; recognition</h2>
            </header>

            {AWARD ? (
              <figure className={styles.plate}>
                <img
                  src={AWARD}
                  alt="An appreciation award presented to New Grown Diamond, shown in its presentation case."
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ) : null}

            <ol className={styles.list}>
              {AWARDS.map((a) => (
                <li key={a.id} className={styles.award}>
                  <p className={styles.event}>{a.event}</p>
                  <p className={styles.place}>{a.place}</p>
                  <p className={styles.body}>{a.body}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.affiliations}>
            <Marks items={CONNECTED} label="Connected with" id="cred-connected" />
            <Marks items={CERTIFIED} label="Certified by" id="cred-certified" />
          </div>
        </div>
      </div>
    </ScrollScene>
  );
}
