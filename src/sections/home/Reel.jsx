import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import ShapeFacets from '@/components/product/ShapeFacets.jsx';
import styles from './Reel.module.css';

/*
 * Photographs of real stones, discovered rather than listed.
 *
 * Any file dropped into `src/assets/diamonds/cuts/` named after its cut —
 * `round.webp`, `pear.webp` — becomes that card's picture with no code change
 * at all. `eager` resolves at build time, so these are hashed, bundled assets
 * like any import; nothing is fetched at runtime and a missing file is simply
 * a key that is not there.
 *
 * A cut WITHOUT a photograph keeps its drawn outline. It never borrows another
 * shape's picture: this strip's whole job is telling nine cuts apart, and a
 * round brilliant captioned "Marquise" would undo the section on the spot.
 */
const SHOTS = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/diamonds/cuts/*.{webp,png,jpg,jpeg}', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, '').toLowerCase(), url]),
);

/**
 * The collection, travelling sideways under a vertical scroll.
 *
 * The one scroll technique this site did not have. Everything else answers to
 * scroll by revealing, turning or dissolving in place; nothing turned the
 * page's vertical travel into movement along another axis. That conversion is
 * what makes a section feel authored rather than merely scrolled past — the
 * visitor is doing one thing and the page is doing another, and the two stay
 * locked together.
 *
 * The whole traverse is ONE CSS expression and no measurement:
 *
 *     translateX(calc(var(--sp) * (100vw - 100%)))
 *
 * A percentage in translateX resolves against the element's OWN width, so
 * `100vw - 100%` is exactly "viewport minus track" — the distance the track
 * must travel to show its last card — whatever that width turns out to be.
 * No ResizeObserver, no measuring pass, nothing to fall out of sync on a
 * resize, and it is correct on the very first frame rather than after a
 * layout read.
 *
 * Cards are scaled and lit by their distance from the centre of the frame, so
 * the strip has a focal point that moves through it rather than being a row of
 * equals sliding past.
 */
const CUTS = [
  ['Round', '57 facets'],
  ['Oval', 'Elongated brilliance'],
  ['Emerald', 'Step cut'],
  ['Pear', 'Brilliant teardrop'],
  ['Princess', 'Square brilliant'],
  ['Cushion', 'Soft corners'],
  ['Radiant', 'Cropped corners'],
  ['Marquise', 'Navette'],
  ['Heart', 'Cleft brilliant'],
];

/*
 * The travel needs room. Too short and the strip snaps past in a flick; too
 * long and the visitor is trapped scrolling a section that has stopped saying
 * anything. Roughly a screen of scroll per two cards reads as deliberate.
 */
const PHASES = [
  { name: 'in', vh: 50 },
  { name: 'travel', vh: 420 },
  { name: 'out', vh: 50 },
];

export default function Reel() {
  return (
    <ScrollScene phases={PHASES} id="the-collection" label="The cuts we grow">
      <div className={styles.stage}>
        <header className={styles.head}>
          <p className={styles.kicker}>The collection</p>
          <h2 className={styles.title}>Every cut we grow</h2>
        </header>

        <div className={styles.viewport}>
          <ol className={styles.track}>
            {CUTS.map(([cut, note], i) => (
              <li key={cut} className={styles.cell} style={{ '--i': i, '--n': CUTS.length }}>
                <article className={styles.card}>
                  <span className={styles.pool} aria-hidden="true" />
                  {SHOTS[cut.toLowerCase()] ? (
                    <>
                      <img
                        className={styles.shot}
                        src={SHOTS[cut.toLowerCase()]}
                        alt={`A ${cut.toLowerCase()}-cut New Grown Diamond.`}
                        loading="lazy"
                        decoding="async"
                      />
                      {/* The same photograph, flipped and crushed — a stone on
                          a polished tray throws a dark, short double. */}
                      <img
                        className={styles.shotEcho}
                        src={SHOTS[cut.toLowerCase()]}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                      />
                    </>
                  ) : (
                    <>
                      <ShapeFacets shape={cut} id={`reel-${cut}`} className={styles.stone} />
                      <ShapeFacets shape={cut} flat className={styles.echo} />
                    </>
                  )}
                  <div className={styles.label}>
                    <b>{cut}</b>
                    <i>{note}</i>
                  </div>
                  <span className={styles.index} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </article>
              </li>
            ))}
          </ol>
        </div>

        {/* Where you are in the traverse. Without it a horizontal section has
            no horizon — there is no way to tell how much is left, and that is
            what makes long ones feel like a trap. */}
        <div className={styles.rail} aria-hidden="true">
          <span className={styles.railFill} />
        </div>

        <a className={styles.more} href="/shapes">See every cut in detail →</a>
      </div>
    </ScrollScene>
  );
}
