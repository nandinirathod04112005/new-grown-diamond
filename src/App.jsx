import { lazy, Suspense, useEffect, useState } from 'react';
import Header from '@/components/chrome/Header.jsx';
import AnnouncementBar from '@/components/chrome/AnnouncementBar.jsx';
import seedToStone from '@/assets/process/seed-to-stone.webp';
import latticeCut from '@/assets/process/lattice-cut.webp';
import gradingBench from '@/assets/process/grading-bench.webp';
import suratToWorld from '@/assets/process/surat-to-world.webp';
import cutStone from '@/assets/process/cut-stone.webp';
import Footer from '@/components/chrome/Footer.jsx';
import Preloader from '@/components/chrome/FastPreloader.jsx';
import SiteExperience from '@/components/chrome/SiteExperience.jsx';
import SmoothScrollProvider from '@/providers/SmoothScrollProvider.jsx';
import PageTransition from '@/components/chrome/PageTransition.jsx';
import DiamondCursor from '@/components/cursor/DiamondCursor.jsx';
import ContinueNext from '@/components/chrome/ContinueNext.jsx';
import { useRouter } from '@/lib/router.js';
import { LocaleProvider } from '@/i18n/LocaleProvider.jsx';
import { splitLocale } from '@/i18n/locales.js';
import { useLocale } from '@/i18n/localeContext.js';
import { useScrollVelocity } from '@/hooks/useScrollVelocity.js';
import usePageAnimations from '@/hooks/usePageAnimations.js';
import useCinematicScroll from '@/hooks/useCinematicScroll.js';
import { usePageViews } from '@/hooks/usePageViews.js';
import { PAGES } from '@/pages/siteContent.js';
import SeoHead from '@/components/seo/SeoHead.jsx';
import Home from '@/pages/Home.jsx';

const EditorialPage = lazy(() => import('@/pages/EditorialPage.jsx'));
const DiamondComparison = lazy(() => import('@/sections/education/DiamondComparison.jsx'));
const SizeGuide = lazy(() => import('@/sections/education/SizeGuide.jsx'));
const FaqPage = lazy(() => import('@/pages/FaqPage.jsx'));
const ContactPage = lazy(() => import('@/pages/ContactPage.jsx'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage.jsx'));
const JewelleryPage = lazy(() => import('@/pages/JewelleryPage.jsx'));
const BlogsPage = lazy(() => import('@/pages/BlogsPage.jsx'));
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage.jsx'));
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage.jsx'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage.jsx'));
const SignInPage = lazy(() => import('@/pages/auth/SignInPage.jsx'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage.jsx'));
const ProfilePage = lazy(() => import('@/pages/auth/ProfilePage.jsx'));
const CartPage = lazy(() => import('@/pages/CartPage.jsx'));
const WishlistPage = lazy(() => import('@/pages/WishlistPage.jsx'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage.jsx'));
const TermsPage = lazy(() => import('@/pages/TermsPage.jsx'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage.jsx'));
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage.jsx'));
const RequireAdmin = lazy(() => import('@/components/auth/RequireAdmin.jsx'));
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout.jsx'));
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview.jsx'));
const AdminModulePage = lazy(() => import('@/pages/admin/AdminModulePage.jsx'));
const AdminDiamonds = lazy(() => import('@/pages/admin/AdminDiamonds.jsx'));
const AdminJewellery = lazy(() => import('@/pages/admin/AdminJewellery.jsx'));
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers.jsx'));
const AdminQueue = lazy(() => import('@/pages/admin/AdminQueue.jsx'));
const AdminMedia = lazy(() => import('@/pages/admin/AdminMedia.jsx'));
const AdminMonitoring = lazy(() => import('@/pages/admin/AdminMonitoring.jsx'));
const AdminAudit = lazy(() => import('@/pages/admin/AdminAudit.jsx'));
const AdminDiamondForm = lazy(() => import('@/pages/admin/AdminDiamondForm.jsx'));
const AdminJournal = lazy(() => import('@/pages/admin/AdminJournal.jsx'));
const AdminJournalForm = lazy(() => import('@/pages/admin/AdminJournalForm.jsx'));
const AdminFeedbackQueue = lazy(() => import('@/pages/admin/AdminFeedbackQueue.jsx'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders.jsx'));
const AdminOrderForm = lazy(() => import('@/pages/admin/AdminOrderForm.jsx'));
const AdminNotifications = lazy(() => import('@/pages/admin/AdminNotifications.jsx'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics.jsx'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings.jsx'));
const AdminContent = lazy(() => import('@/pages/admin/AdminContent.jsx'));
const AdminCatalogue = lazy(() => import('@/pages/admin/AdminCatalogue.jsx'));
const AdminHomepage = lazy(() => import('@/pages/admin/AdminHomepage.jsx'));
const AdminSeo = lazy(() => import('@/pages/admin/AdminSeo.jsx'));
const Story = lazy(() => import('@/sections/about/Story.jsx'));
const StoryBanner = lazy(() => import('@/sections/about/StoryBanner.jsx'));
const AboutCompany = lazy(() => import('@/sections/about/AboutCompany.jsx'));
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
    focus: '65% 45%', mobileFocus: '70% 42%',
    imageAlt: 'A carbon lattice resolving into a finished round brilliant diamond.',
  },
  /* The comparison sits under Education and reads as part of it, so it
     carries Education's motif rather than introducing a fifth one. */
  '/cvd-vs-natural': {
    motif: 'facets', accent: '#6d8fc4',
    image: latticeCut,
    focus: '65% 50%', mobileFocus: '60% 45%',
    imageAlt: 'A diamond crystal held in a laboratory growth chamber.',
  },
  '/price-and-size': {
    /* Shares the shape guide's motif and accent: both pages are about what a
       stone looks like rather than how it was made. */
    motif: 'arcs', accent: '#9c8ab8',
    image: cutStone,
    focus: '42% 55%', mobileFocus: '42% 45%',
    imageAlt: 'A cut diamond photographed from above beside a scale, showing its face-up size.',
  },
  '/shapes': {
    motif: 'arcs', accent: '#9c8ab8',
    image: cutStone,
    focus: '72% 40%', mobileFocus: '65% 40%',
    imageAlt: 'A cut diamond photographed from above, showing its facet pattern and outline.',
  },
  '/why-lab-grown': {
    motif: 'rings', accent: '#6fb392',
    image: gradingBench,
    focus: '68% 50%', mobileFocus: '72% 42%',
    imageAlt: 'A diamond under a grading microscope beside a laboratory report and loose stones.',
  },
};

/*
 * The four queue routes. A Set rather than a regex: the names are data, and a
 * regex here would be one more place to escape a slash wrongly for no gain.
 */
const QUEUE_PATHS = new Set(['enquiries', 'quotes', 'holds', 'inspections']);

/**
 * Admin lives outside the storefront chrome and outside the smooth scroller:
 * a console is operated, not read, and a data table fighting inertial
 * scrolling is actively worse to use.
 *
 * Returns the element for an /admin path, or null when the path is not one.
 */
function adminRoute(path) {
  /* A segment boundary, so /administration or /admin-tips fall through to the
     public router rather than landing a typo on the staff gate. */
  if (path !== '/admin' && !path.startsWith('/admin/')) return null;

  /*
   * /admin used to BE the diamond list. It is now the overview, and the list
   * keeps its own address — so anyone who had /admin bookmarked lands on the
   * dashboard, and every existing link to /admin/diamonds still resolves to
   * exactly the page it always did.
   */
  if (path === '/admin') return <AdminOverview />;
  if (path === '/admin/diamonds') return <AdminDiamonds />;
  if (path === '/admin/jewellery') return <AdminJewellery />;
  if (path === '/admin/customers') return <AdminCustomers />;
  if (path === '/admin/media') return <AdminMedia />;
  if (path === '/admin/monitoring') return <AdminMonitoring />;
  if (path === '/admin/audit') return <AdminAudit />;
  if (path === '/admin/journal') return <AdminJournal />;
  if (path === '/admin/feedback') return <AdminFeedbackQueue />;
  if (path === '/admin/orders') return <AdminOrders />;
  if (path === '/admin/orders/new') return <AdminOrderForm key="new" />;
  if (path === '/admin/notifications') return <AdminNotifications />;
  if (path === '/admin/analytics') return <AdminAnalytics />;
  if (path === '/admin/settings') return <AdminSettings />;
  if (path === '/admin/content') return <AdminContent />;
  if (path === '/admin/catalogue') return <AdminCatalogue />;
  if (path === '/admin/homepage') return <AdminHomepage />;
  if (path === '/admin/seo') return <AdminSeo />;
  /* Keyed by post, so moving from /new to the new post's own address — or
     between two posts — starts a fresh form rather than carrying one
     post's fields into another's. */
  if (path === '/admin/journal/new') return <AdminJournalForm key="new" />;
  const journalEdit = path.match(/^\/admin\/journal\/([^/]+)\/edit$/);
  if (journalEdit) return <AdminJournalForm key={journalEdit[1]} id={journalEdit[1]} />;

  /*
   * The four work queues share one screen. They differ only in which date
   * matters and which product they point at, and both of those are declared
   * per queue in adminQueues.js rather than branched on in the component —
   * so a fifth queue would be a data entry, not another page.
   *
   * Keyed by name so React remounts on the way between them: they hold their
   * own filter tab and open drawer, and carrying those across from Holds into
   * Inspections would show one queue's selection over another's rows.
   */
  const queue = path.slice('/admin/'.length);
  if (QUEUE_PATHS.has(queue)) return <AdminQueue key={queue} queue={queue} />;
  if (path === '/admin/diamonds/new') return <AdminDiamondForm />;

  const edit = path.match(/^\/admin\/diamonds\/([^/]+)\/edit$/);
  if (edit) return <AdminDiamondForm id={edit[1]} />;

  /*
   * Every other /admin path is a module the sidebar lists. Rather than 404 on
   * a link the navigation itself offers, the page states what that module
   * needs — which is the honest answer while the table behind it does not
   * exist.
   */
  return <AdminModulePage path={path} />;
}

export default function App() {
  const [ready, setReady] = useState(false);
  /*
   * The path is STATE now, not a read of window.location at render time. That
   * one change is what turns every link on the site from a full browser reload
   * into a covered handover — the header, the smoother, the theme and the
   * WebGL context all survive it.
   */
  /*
   * The URL carries the language; everything below works in terms of the
   * route WITHOUT it. So /gu/diamonds and /diamonds resolve to the same page
   * component, the same SEO entry and the same animation key — the language is
   * a property of the request, not a different site.
   */
  const { path: rawPath, phase } = useRouter();
  const { locale, path } = splitLocale(rawPath);
  useCinematicScroll(path);
  usePageAnimations(path);
  /* Anonymous visit counting (lib/analytics.js): the full address, with its
     /hi or /gu prefix, so languages can be told apart. It sends only from the
     live domain, never from /admin, and never with Do Not Track on. */
  usePageViews(rawPath);

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
  /*
   * Wrapped here as well as around the browsing shell below, because every
   * early return on this component — admin, sign-in, register, account —
   * goes through `bare`. Two wrappers cover all of them; missing one would
   * give a page that renders in English inside an otherwise Gujarati session,
   * and the miss would only show on the one route nobody clicked.
   */
  const bare = (node) => (
    <LocaleProvider locale={locale} path={path}>
      <SeoHead path={path} locale={locale} />
      <PageTransition phase={phase} />
      <Suspense fallback={<div className="u-route-hold" aria-hidden="true" />}>{node}</Suspense>
    </LocaleProvider>
  );

  const admin = adminRoute(path);
  if (admin) {
    /*
     * The guard stays OUTSIDE the shell. Rendering the sidebar around a
     * "no access" notice would show the shape of the console — every module,
     * every count — to someone the database has just refused.
     */
    return bare(
      <RequireAdmin>
        <AdminLayout path={path}>{admin}</AdminLayout>
      </RequireAdmin>,
    );
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

  /*
   * Where every emailed link lands. Deliberately outside the localised routes:
   * Supabase builds the link from one fixed redirect and cannot carry a
   * language prefix, so this single address serves all three languages.
   */
  if (path === '/auth/callback') {
    return bare(<AuthCallbackPage />);
  }

  if (path === '/forgot-password') {
    return bare(<ForgotPasswordPage />);
  }

  if (path === '/reset-password') {
    return bare(<ResetPasswordPage />);
  }

  return (
    <LocaleProvider locale={locale} path={path}>
    <SmoothScrollProvider>
      {/* The locale is not optional here. Without it every Hindi and Gujarati
          page declares the ENGLISH url as its canonical, which tells a search
          engine those pages are duplicates not worth indexing — throwing away
          the whole point of translating them. */}
      <SeoHead path={path} locale={locale} />
      <PageTransition phase={phase} />
      {/* Where you ARRIVED, announced once. A screen reader gets the
          destination; the cover itself is decoration and stays hidden. */}
      <RouteAnnouncer path={path} title={content?.title} />
      <Preloader onDone={() => setReady(true)} />
      {/* The room the whole site sits in: two slow light masses and a turning
          lattice, fixed behind every page. Pure CSS, so it cannot fail, and it
          stops entirely under reduced motion. */}
      <SiteExperience />
      <DiamondCursor />
      <Header />
      {/* Website Content's announcement, when one is published: hung under
          the fixed header, drawn from cache on first paint, so it never
          pushes the page down. */}
      <AnnouncementBar />
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
            /* Which page this is, so the page can find its own words in the
               visitor's language (pages/siteContent.i18n.js). */
            path={path}
            hero={path === '/about' ? <StoryBanner page={content} /> : null}
            /* Shapes states every cut beside its turning wheel, so the
               numbered list underneath would repeat it in a weaker form. */
            page={path === '/shapes' || path === '/about' ? { ...content, sections: [] } : content}
            motif={PAGE_MOTIF[path]?.motif}
            accent={PAGE_MOTIF[path]?.accent}
            /*
             * The page's photograph, set behind the whole banner.
             *
             * It began as the figure beside the type; now it is the room the
             * type stands in, and the drawn motif stays over it as the page's
             * mark. A route with no photograph listed keeps the motif alone.
             */
            backdrop={PAGE_MOTIF[path]?.image}
            backdropFocus={PAGE_MOTIF[path]?.focus}
            backdropMobileFocus={PAGE_MOTIF[path]?.mobileFocus}
            after={path === '/education' ? <EducationIndex /> : null}
          >
            {/* The "Four decades of diamond excellence" exhibit was removed at
                the owner's request; the story follows the banner directly. */}
            {path === '/about' ? <><AboutCompany /><Story /></> : null}
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
        {path === '/cart' && <CartPage />}
        {path === '/wishlist' && <WishlistPage />}
        {/* /Privacy is where the previous site kept it; old links still land here. */}
        {['/privacy-policy', '/privacy', '/Privacy'].includes(path) && <PrivacyPage />}
        {/* /Terms is where the previous site kept it; old links still land here. */}
        {['/terms-and-conditions', '/terms', '/Terms'].includes(path) && <TermsPage />}
        {path === '/diamonds' && <InventoryPage />}
        {path === '/jewellery' && <JewelleryPage />}
        {/* /blog and /Blog were the previous site's address; old links still land here. */}
        {['/blogs', '/blog', '/Blog'].includes(path) && <BlogsPage />}
        {path === '/feedback' && <FeedbackPage />}
        {/* The page the journal cards have always pointed at. */}
        {path.startsWith('/blogs/') && (
          <BlogPostPage slug={decodeURIComponent(path.slice('/blogs/'.length))} />
        )}
        {path !== '/'
          && !content
          && !path.startsWith('/blogs/')
          && !['/faq', '/contact', '/diamonds', '/jewellery', '/blogs', '/blog', '/Blog', '/feedback', '/cart', '/wishlist', '/privacy-policy', '/privacy', '/Privacy', '/terms-and-conditions', '/terms', '/Terms'].includes(path)
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
    </LocaleProvider>
  );
}

/*
 * The page just arrived at, named for a screen reader in the visitor's
 * language. English keeps what it always said (the page's own title, or its
 * address as words); Hindi and Gujarati use the menu's name for the page,
 * which the site dictionaries already carry, rather than reading an English
 * address aloud in a Hindi voice. A page with no menu name falls back as
 * English does.
 */
const ROUTE_NAMES = {
  '/diamonds': 'nav.diamonds',
  '/jewellery': 'nav.jewellery',
  '/about': 'nav.ourStory',
  '/education': 'nav.education',
  '/blogs': 'nav.blogs',
  '/contact': 'nav.contact',
  '/account': 'nav.account',
  '/login': 'nav.login',
  '/register': 'nav.register',
  '/feedback': 'footer.feedback',
  '/faq': 'footer.faq',
  '/why-lab-grown': 'footer.whyNgd',
  '/shapes': 'footer.shapeGuide',
  '/cvd-vs-natural': 'educationTopics.cvd-vs-natural',
  '/price-and-size': 'educationTopics.price-and-size',
  '/cart': 'nav.cart',
  '/wishlist': 'nav.wishlist',
  '/privacy-policy': 'footer.privacy',
  '/terms-and-conditions': 'footer.terms',
};

function RouteAnnouncer({ path, title }) {
  const { locale, t, has } = useLocale();
  /* An article is announced as the journal it belongs to. */
  const key = ROUTE_NAMES[path] ?? (path.startsWith('/blogs/') ? 'nav.blogs' : undefined);
  let name;
  if (path === '/') name = locale === 'en' ? 'Home' : 'New Grown Diamond';
  else if (locale !== 'en' && key && has(key)) name = t(key);
  else name = title || path.slice(1).replaceAll('-', ' ');
  return <p className="u-visually-hidden" aria-live="polite">{name}</p>;
}
