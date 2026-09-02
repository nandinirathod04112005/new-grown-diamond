import { useEffect, useState } from 'react';
import Header from '@/components/chrome/Header.jsx';
import Footer from '@/components/chrome/Footer.jsx';
import Preloader from '@/components/chrome/Preloader.jsx';
import SiteExperience from '@/components/chrome/SiteExperience.jsx';
import SmoothScrollProvider from '@/providers/SmoothScrollProvider.jsx';
import Home from '@/pages/Home.jsx';
import EditorialPage from '@/pages/EditorialPage.jsx';
import FaqPage from '@/pages/FaqPage.jsx';
import ContactPage from '@/pages/ContactPage.jsx';
import InventoryPage from '@/pages/InventoryPage.jsx';
import JewelleryPage from '@/pages/JewelleryPage.jsx';
import SignInPage from '@/pages/auth/SignInPage.jsx';
import RegisterPage from '@/pages/auth/RegisterPage.jsx';
import ProfilePage from '@/pages/auth/ProfilePage.jsx';
import BlogsPage from '@/pages/BlogsPage.jsx';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';
import RequireAdmin from '@/components/auth/RequireAdmin.jsx';
import PageTransition from '@/components/chrome/PageTransition.jsx';
import DiamondCursor from '@/components/cursor/DiamondCursor.jsx';
import ContinueNext from '@/components/chrome/ContinueNext.jsx';
import { useRouter } from '@/lib/router.js';
import { useScrollVelocity } from '@/hooks/useScrollVelocity.js';
import AdminDiamonds from '@/pages/admin/AdminDiamonds.jsx';
import AdminDiamondForm from '@/pages/admin/AdminDiamondForm.jsx';
import Story from '@/sections/about/Story.jsx';
import Exhibit from '@/sections/about/Exhibit.jsx';
import ShapeWheel from '@/sections/shapes/ShapeWheel.jsx';
import { PAGES } from '@/pages/siteContent.js';
/**
 * A motif and accent per editorial page. Four pages share one template, so
 * without this they are literally the same hero four times over — which is
 * exactly how the site read before.
 */
const PAGE_MOTIF = {
  '/about': { motif: 'lattice', accent: '#b48c47' },
  '/education': { motif: 'facets', accent: '#6d8fc4' },
  '/shapes': { motif: 'arcs', accent: '#9c8ab8' },
  '/why-lab-grown': { motif: 'rings', accent: '#6fb392' },
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

  /*
   * One writer of scroll velocity for the whole site. Mounted here rather than
   * per-section so twenty components cannot each differentiate the same scroll
   * position on the same frame.
   */
  useScrollVelocity();
  const content = PAGES[path];

  useEffect(() => {
    const label = path === '/' ? 'Lab-Grown Diamonds' : (content?.title || path.slice(1).replaceAll('-', ' '));
    document.title = `${label} | New Grown Diamond`;
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
      <PageTransition phase={phase} />
      {node}
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
        {path === '/' && <Home />}
        {content && (
          <EditorialPage
            /* Shapes states every cut beside its turning wheel, so the
               numbered list underneath would repeat it in a weaker form. */
            page={path === '/shapes' ? { ...content, sections: [] } : content}
            motif={PAGE_MOTIF[path]?.motif}
            accent={PAGE_MOTIF[path]?.accent}
          >
            {path === '/about' ? <><Exhibit /><Story /></> : null}
            {path === '/shapes' ? <ShapeWheel /> : null}
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
