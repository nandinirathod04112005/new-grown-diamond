import { lazy, Suspense, useEffect, useState } from 'react';
import Header from '@/components/chrome/Header.jsx';
import DiamondComparison from '@/sections/education/DiamondComparison.jsx';
import SizeGuide from '@/sections/education/SizeGuide.jsx';
import seedToStone from '@/assets/process/seed-to-stone.webp';
import latticeCut from '@/assets/process/lattice-cut.webp';
import gradingBench from '@/assets/process/grading-bench.webp';
import suratToWorld from '@/assets/process/surat-to-world.webp';
import cutStone from '@/assets/process/cut-stone.webp';
import Footer from '@/components/chrome/Footer.jsx';
import Preloader from '@/components/chrome/Preloader.jsx';
import SiteExperience from '@/components/chrome/SiteExperience.jsx';
import SmoothScrollProvider from '@/providers/SmoothScrollProvider.jsx';
import PageTransition from '@/components/chrome/PageTransition.jsx';
import DiamondCursor from '@/components/cursor/DiamondCursor.jsx';
import ContinueNext from '@/components/chrome/ContinueNext.jsx';
import { useRouter } from '@/lib/router.js';
import { useScrollVelocity } from '@/hooks/useScrollVelocity.js';
import usePageAnimations from '@/hooks/usePageAnimations.js';
import { PAGES } from '@/pages/siteContent.js';
import SeoHead from '@/components/seo/SeoHead.jsx';
import Home from '@/pages/Home.jsx';

const EditorialPage = lazy(() => import('@/pages/EditorialPage.jsx'));
const FaqPage = lazy(() => import('@/pages/FaqPage.jsx'));
const ContactPage = lazy(() => import('@/pages/ContactPage.jsx'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage.jsx'));
const JewelleryPage = lazy(() => import('@/pages/JewelleryPage.jsx'));
const BlogsPage = lazy(() => import('@/pages/BlogsPage.jsx'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage.jsx'));
const SignInPage = lazy(() => import('@/pages/auth/SignInPage.jsx'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage.jsx'));
const ProfilePage = lazy(() => import('@/pages/auth/ProfilePage.jsx'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage.jsx'));
const RequireAdmin = lazy(() => import('@/components/auth/RequireAdmin.jsx'));
const AdminDiamonds = lazy(() => import('@/pages/admin/AdminDiamonds.jsx'));
const AdminDiamondForm = lazy(() => import('@/pages/admin/AdminDiamondForm.jsx'));
const Story = lazy(() => import('@/sections/about/Story.jsx'));
const Exhibit = lazy(() => import('@/sections/about/Exhibit.jsx'));
const ShapeWheel = lazy(() => import('@/sections/shapes/ShapeWheel.jsx'));
const EducationIndex = lazy(() => import('@/sections/education/EducationIndex.jsx'));

/**
 * A motif and accent per editorial page. Four pages share one template, so
 * without this they are literally the same hero four times over — which is
 * exactly how the site read before.
 */
const PAGE_MOTIF = {
  '/about': {
    motif: 'lattice', accent: '#b48c47',
    image: suratToWorld,
    imageAlt: 'A globe traced with the supply routes along which New Grown Diamond ships from Surat.',
  },
  '/education': {
    motif: 'facets', accent: '#6d8fc4',
    image: seedToStone,
    imageAlt: 'A carbon lattice resolving into a finished round brilliant diamond.',
  },
  /* The comparison sits under Education and reads as part of it, so it
     carries Education's motif rather than introducing a fifth one. */
  '/cvd-vs-natural': {
    motif: 'facets', accent: '#6d8fc4',
    image: latticeCut,
    imageAlt: 'A diamond crystal held in a laboratory growth chamber.',
  },
  '/price-and-size': {
    /* Shares the shape guide's motif and accent: both pages are about what a
       stone looks like rather than how it was made. */
    motif: 'arcs', accent: '#9c8ab8',
    image: cutStone,
    imageAlt: 'A cut diamond photographed from above beside a scale, showing its face-up size.',
  },
  '/shapes': {
    motif: 'arcs', accent: '#9c8ab8',
    image: cutStone,
    imageAlt: 'A cut diamond photographed from above, showing its facet pattern and outline.',
  },
  '/why-lab-grown': {
    motif: 'rings', accent: '#6fb392',
    image: gradingBench,
    imageAlt: 'A diamond under a grading microscope beside a laboratory report and loose stones.',
  },
};

/**
 * Admin lives outside the storefront chrome and outside the smooth scroller:
 * a console is operated, not read, and a data table fighting inertial
 * scrolling is actively worse to use.
 *
 * Returns the element for an /admin path, or null when the path is not one.
 */
function adminRoute(path) {
  if (path === '/admin' || path === '/admin/diamonds') {
    return <AdminDiamonds />;
  }
  if (path === '/admin/diamonds/new') {
    return <AdminDiamondForm />;
  }
  const edit = path.match(/^\/admin\/diamonds\/([^/]+)\/edit$/);
  if (edit) {
    return <AdminDiamondForm id={edit[1]} />;
  }
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);
  /*
   * The path is STATE now, not a read of window.location at render time. That
   * one change is what turns every link on the site from a full browser reload
   * into a covered handover — the header, the smoother, the theme and the
   * WebGL context all survive it.
   */
  const { path, phase } = useRouter();
  usePageAnimations(path);

  /*
   * One writer of scroll velocity for the whole site. Mounted here rather than
   * per-section so twenty components cannot each differentiate the same scroll
   * position on the same frame.
   */
  useScrollVelocity();
  const content = PAGES[path];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const hash = window.location.hash;
      if (hash) {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (target) {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
          return;
        }
      }
      // No unconditional scrollTo here any more: the router resets the scroll
      // while the cover is down, through Lenis where it is running. Doing it
      // again after the fact fought the smoother and showed as a jump.
    });
    return () => cancelAnimationFrame(frame);
  }, [path, content]);

  /*
   * Every early return is wrapped, or navigating INTO an account page would
   * play the cover and navigating out of one would not — the seam would move
   * rather than disappear.
   */
  const bare = (node) => (
    <>
      <SeoHead path={path} />
      <PageTransition phase={phase} />
      <Suspense fallback={<div className="u-route-hold" aria-hidden="true" />}>{node}</Suspense>
    </>
  );

  const admin = adminRoute(path);
  if (admin) {
    return bare(<RequireAdmin>{admin}</RequireAdmin>);
  }

  if (path === '/login') {
    return bare(<SignInPage />);
  }

  if (path === '/register') {
    return bare(<RegisterPage />);
  }

  if (path === '/account') {
    return bare(<ProfilePage />);
  }

  if (path === '/forgot-password') {
    return bare(<ForgotPasswordPage />);
  }

  if (path === '/reset-password') {
    return bare(<ResetPasswordPage />);
  }

  return (
    <SmoothScrollProvider>
      <SeoHead path={path} />
      <PageTransition phase={phase} />
      {/* Where you ARRIVED, announced once. A screen reader gets the
          destination; the cover itself is decoration and stays hidden. */}
      <p className="u-visually-hidden" aria-live="polite">
        {content?.title || (path === '/' ? 'Home' : path.slice(1).replaceAll('-', ' '))}
      </p>
      <Preloader onDone={() => setReady(true)} />
      <SiteExperience />
      <DiamondCursor />
      <Header />
      {/*
        The fixed diamond backdrop is gone.
        
        It sat at 55% opacity behind every chapter — a single macro photograph
        blown across the whole viewport and blurred, which read as a grey smear
        rather than as atmosphere, and competed with the actual subject of each
        chapter sitting on top of it. The chapters carry their own imagery; the
        ground behind them should be ground.
      */}
      {/* `data-leaving` drives the outgoing page's own scale-and-clip, the
          first half of the reference transition. */}
      <div
        className="u-above-film"
        data-ready={ready ? '' : undefined}
        data-leaving={phase === 'out' ? '' : undefined}
      >
        <Suspense fallback={<div className="u-route-hold" aria-hidden="true" />}>
        {path === '/' && <Home />}
        {content && (
          <EditorialPage
            /* Shapes states every cut beside its turning wheel, so the
               numbered list underneath would repeat it in a weaker form. */
            page={path === '/shapes' ? { ...content, sections: [] } : content}
            motif={PAGE_MOTIF[path]?.motif}
            accent={PAGE_MOTIF[path]?.accent}
            /*
             * A photograph where one genuinely belongs to the page.
             *
             * PageHero has always supported an image and no caller ever passed
             * one, so every editorial page opened on the drawn motif — the
             * fallback for pages with no photography, standing in for pages
             * that had some all along. The motif stays as the fallback for any
             * route not listed above.
             */
            image={PAGE_MOTIF[path]?.image}
            imageAlt={PAGE_MOTIF[path]?.imageAlt}
            after={path === '/education' ? <EducationIndex /> : null}
          >
            {path === '/about' ? <><Exhibit /><Story /></> : null}
            {path === '/shapes' ? <ShapeWheel /> : null}
            {/*
              * Tables before the numbered prose: a reader who came to compare
              * wants the rows first, and the prose underneath adds the nuance a
              * table cannot hold.
              *
              * Imported statically, unlike its neighbours in this file. Behind
              * `lazy` with a null Suspense fallback it rendered nothing on the
              * first paint, and on this page the hero is short enough that the
              * footer is already on screen — so the section mounted a moment
              * later and shoved the footer down the page. Measured CLS 1.0,
              * four times the "poor" threshold, to save 3.5 kB gzipped. This is
              * the page's primary content and it has to be in the first paint.
              */}
            {path === '/cvd-vs-natural' ? <DiamondComparison /> : null}
            {path === '/price-and-size' ? <SizeGuide /> : null}
          </EditorialPage>
        )}
        {path === '/faq' && <FaqPage />}
        {path === '/contact' && <ContactPage />}
        {path === '/diamonds' && <InventoryPage />}
        {path === '/jewellery' && <JewelleryPage />}
        {path === '/blogs' && <BlogsPage />}
        {path !== '/'
          && !content
          && !['/faq', '/contact', '/diamonds', '/jewellery', '/blogs'].includes(path)
          && <NotFoundPage />}
        </Suspense>
        <Footer />
      </div>

      {/*
        Only inside the browsing shell. The account and admin pages are a task
        with one outcome, and offering to carry someone onward while they are
        halfway through typing a password would be absurd.
      */}
      <ContinueNext path={path} />
    </SmoothScrollProvider>
  );
}
