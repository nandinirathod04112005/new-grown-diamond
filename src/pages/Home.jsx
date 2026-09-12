import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Diamond, ShieldCheck, Gem, Globe2, Plus, Minus } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useRef } from 'react';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
/* WebP of the same photograph: 62 kB where the PNG was 1.65 MB, and this is
   the first large thing a phone has to download. */
import stone from '@/assets/diamonds/ngd-hero-campaign-v2.webp';
import jewellery from '@/assets/company/custom-jewellery-optimized.jpg';
import growth from '@/assets/process/seed-to-stone.webp';
import { srcSetFor } from '@/lib/responsiveImages.js';
import { useCopy } from '@/i18n/useCopy.js';
import { useSiteSettings } from '@/hooks/useSiteSettings.js';
import ShapeCarousel from '@/sections/home/ShapeCarousel.jsx';
import DeferredSection from '@/components/performance/DeferredSection.jsx';
import { afterHomeSettles, initialHomeOrder, sameOrder } from '@/lib/homeLayout.js';
import COPY from './Home.copy.js';
import s from './Home.module.css';
/* Keyed by the section keys the Homepage Manager stores (lib/homeLayout.js). */
const LATER = {
 'lab-grown-story': () => import('@/sections/home/LabGrownStory.jsx'),
 reasons: () => import('@/sections/home/Reasons.jsx'),
 transparency: () => import('@/sections/home/Transparency.jsx'),
 credentials: () => import('@/sections/home/Credentials.jsx'),
 'client-feedback': () => import('@/sections/home/ClientFeedback.jsx'),
};
const LabGrownStory = lazy(LATER['lab-grown-story']);
const Reasons = lazy(LATER.reasons);
const Transparency = lazy(LATER.transparency);
const Credentials = lazy(LATER.credentials);
const ClientFeedback = lazy(LATER['client-feedback']);
/* Asks for the code of the later sections in `keys`, in page order. A hidden
   section's code is never asked for. */
const warm = (keys) => keys.forEach((key) => LATER[key]?.().catch(() => {}));
/* The later sections' code, fetched once the page has loaded and gone quiet,
   so each is already here when it is scrolled to. Waiting for the section to
   come near before asking for it left a phone on mobile data looking at empty
   space while the request went out. */
function useWarmLaterSections(order) {
 const latest = useRef(order);
 useEffect(() => { latest.current = order; }, [order]);
 useEffect(() => {
  let idle = 0;
  const later = () => {
   const whenIdle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 1200));
   idle = whenIdle(() => warm(latest.current));
  };
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
  return () => {
   window.removeEventListener('load', later);
   (window.cancelIdleCallback || window.clearTimeout)(idle);
  };
 }, []);
}
/*
 * Whether swapping `current` for `next` would move nothing a visitor can see.
 *
 * The page is only rearranged below the fold: the first slot that differs
 * must start under the bottom of the screen (or the tab must be hidden).
 * Otherwise this visit keeps the order it was drawn with, and the new one is
 * already cached for the next visit — no layout shift, ever, above the fold.
 */
function changeIsUnseen(main, current, next) {
 if (!main) return false;
 if (document.visibilityState === 'hidden') return true;
 /* The hero, then one element per section. Anything else and the slot
    arithmetic below is not trustworthy, so nothing moves. */
 if (main.children.length !== current.length + 1) return false;
 let i = 0;
 while (i < current.length && current[i] === next[i]) i += 1;
 const slot = main.children[i + 1];
 const line = slot ? slot.getBoundingClientRect().top : main.getBoundingClientRect().bottom;
 return line >= window.innerHeight;
}
/*
 * The order of the sections after the hero.
 *
 * The first render uses the last layout this browser was given, or the
 * built-in order — never a network wait. The saved layout is read after the
 * page has loaded and gone quiet (a plain fetch, not the Supabase SDK), and
 * applied at once only where changeIsUnseen allows.
 */
function useHomeOrder(main) {
 const [order, setOrder] = useState(initialHomeOrder);
 const drawn = useRef(order);
 useEffect(() => { drawn.current = order; }, [order]);
 useEffect(() => afterHomeSettles((next) => {
  if (sameOrder(next, drawn.current) || !changeIsUnseen(main.current, drawn.current, next)) return;
  warm(next);
  setOrder(next);
 }), [main]);
 return order;
}
export default function Home() {
 const [expanded, setExpanded] = useState(0);
 const hero = useRef(null);
 const main = useRef(null);
 const c = useCopy(COPY);
 /* The four offices: Settings in the Control Centre, built-in until saved. */
 const { offices } = useSiteSettings();
 usePointerParallax(hero, 1);
 const order = useHomeOrder(main);
 useWarmLaterSections(order);
 /* Every block after the hero, by the key the Homepage Manager stores. Each
    returns exactly one element: changeIsUnseen counts them. */
 const blocks = {
  'trust-strip': () => <div key="trust-strip" className={s.trust}><span><Diamond /> {c.trust.real}</span><span><ShieldCheck /> {c.trust.certified}</span><span><Gem /> {c.trust.precision}</span><span><Globe2 /> {c.trust.locations}</span></div>,
  shapes: () => <section key="shapes" className={s.section} id="diamonds"><div className={s.sectionHead}><div><p className={s.eyebrow}>{c.shapes.eyebrow}</p><h2>{c.shapes.title} <em>{c.shapes.accent}</em></h2></div><a className={s.textLink} href="/shapes">{c.shapes.link} <ArrowUpRight size={18} /></a></div><ShapeCarousel /></section>,
  story: () => <section key="story" className={s.story} id="precision"><div className={s.storyImage}><img src={growth} srcSet={srcSetFor(growth)} sizes="(max-width: 900px) 100vw, 50vw" alt={c.story.imageAlt} loading="lazy" decoding="async" width="1672" height="941" /><span>{c.story.caption}</span></div><div className={s.storyCopy}><p className={s.eyebrow}>{c.story.eyebrow}</p><h2>{c.story.title}<br /><em>{c.story.accent}</em></h2><p>{c.story.p1}</p><p>{c.story.p2}</p><a className={s.primary} href="/why-lab-grown">{c.story.link} <ArrowUpRight size={18} /></a></div></section>,
  'lab-grown-story': () => <DeferredSection key="lab-grown-story" minHeight={620}><Suspense fallback={null}><LabGrownStory /></Suspense></DeferredSection>,
  reasons: () => <DeferredSection key="reasons" minHeight={520}><Suspense fallback={null}><Reasons /></Suspense></DeferredSection>,
  transparency: () => <DeferredSection key="transparency" minHeight={560}><Suspense fallback={null}><Transparency /></Suspense></DeferredSection>,
  jewellery: () => <section key="jewellery" className={s.jewellery} id="jewellery"><div className={s.jewelleryCopy}><p className={s.eyebrow}>{c.jewellery.eyebrow}</p><h2>{c.jewellery.title.line1}<br />{c.jewellery.title.line2} <em>{c.jewellery.title.accent}</em></h2><p>{c.jewellery.body}</p><a className={s.lightButton} href="/jewellery">{c.jewellery.explore} <ArrowUpRight size={18} /></a><a className={s.lightLink} href="/contact">{c.jewellery.talk} <ArrowRight size={17} /></a></div><img src={jewellery} srcSet={srcSetFor(jewellery, 1800)} sizes="(max-width: 900px) 100vw, 50vw" alt={c.jewellery.imageAlt} loading="lazy" decoding="async" width="1800" height="1200" /></section>,
  credentials: () => <DeferredSection key="credentials" minHeight={420}><Suspense fallback={null}><Credentials /></Suspense></DeferredSection>,
  'client-feedback': () => <DeferredSection key="client-feedback" minHeight={360}><Suspense fallback={null}><ClientFeedback /></Suspense></DeferredSection>,
  faq: () => <section key="faq" className={`${s.section} ${s.faq}`}><div><p className={s.eyebrow}>{c.faq.eyebrow}</p><h2>{c.faq.title}<br /><em>{c.faq.accent}</em></h2><a className={s.textLink} href="/faq">{c.faq.link} <ArrowUpRight size={18} /></a></div><div>{c.questions.map(([q,a],i)=><article className={s.question} key={q}><h3><button aria-expanded={expanded===i} aria-controls={`answer-${i}`} onClick={()=>setExpanded(expanded===i?-1:i)}>{q}{expanded===i?<Minus size={18}/>:<Plus size={18}/>}</button></h3><div id={`answer-${i}`} hidden={expanded!==i}><p>{a}</p></div></article>)}</div></section>,
  locations: () => <section key="locations" className={`${s.section} ${s.locations}`} id="contact"><div className={s.sectionHead}><div><p className={s.eyebrow}>{c.locations.eyebrow}</p><h2>{c.locations.title} <em>{c.locations.accent}</em></h2></div><a className={s.textLink} href="/contact">{c.locations.link} <ArrowUpRight size={18}/></a></div><div className={s.officeGrid}>{offices.map((office,i)=><article key={office.city}><span className={s.eyebrow}>0{i+1} / {i<2?c.locations.countries.india:i===2?c.locations.countries.usa:c.locations.countries.hongKong}</span><h3>{office.city}</h3><address>{office.address}</address><a href={`tel:${office.tel}`}>{office.phone} <ArrowUpRight size={14}/></a>{office.email&&<a href={`mailto:${office.email}`}>{office.email}</a>}</article>)}</div></section>,
 };
 return <main ref={main} className={s.home}>
  <section ref={hero} className={s.hero} aria-labelledby="home-title">
   <div className={s.heroCopy}>
    <p className={s.eyebrow}><span /> {c.hero.eyebrow}</p>
    <h1 id="home-title">{c.hero.title.line1}<br />{c.hero.title.line2}<br /><em>{c.hero.title.accent}</em></h1>
    <p className={s.intro}>{c.hero.intro}</p>
    <div className={s.actions}><a className={s.primary} href="/diamonds">{c.hero.explore} <ArrowUpRight size={18} /></a><a className={s.textLink} href="/about">{c.hero.story} <ArrowRight size={17} /></a></div>
    <div className={s.heroNote}><ShieldCheck size={20} /><span>{c.hero.note.line1}<br /><b>{c.hero.note.line2}</b></span></div>
   </div>
   <div className={s.heroArt}><div className={s.orbit} /><div className={s.orbitSmall} /><span className={s.artTop}>{c.hero.artTop}</span><span className={s.sparkle} aria-hidden="true">✧</span><img src={stone} alt={c.hero.imageAlt} fetchPriority="high" width="1672" height="941" /><div className={s.artLabel}><span>{c.hero.artIndex}</span><span>{c.hero.artLine1}<br />{c.hero.artLine2}</span></div><a className={s.artArrow} href="/shapes" aria-label={c.hero.shapesLink}><ArrowUpRight /></a></div>
  </section>
  {/* The sections after the hero, in the order the Homepage Manager saved
      (built-in order until it has saved one). Hidden ones are not drawn. */}
  {order.map((key) => blocks[key]?.())}
 </main>;
}
