import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import RootLayout from './RootLayout.jsx';
import Home from '@/pages/public/Home.jsx';
import NotFound from '@/pages/public/NotFound.jsx';
const page = (name) => lazy(() => import('@/pages/public/StorePages.jsx').then((module) => ({ default: module[name] })));
const DiamondsPage = page('DiamondsPage');
const DiamondDetailPage = page('DiamondDetailPage');
const JewelleryPage = page('JewelleryPage');
const JewelleryDetailPage = page('JewelleryDetailPage');
const StoryPage = page('StoryPage');
const ContactPage = page('ContactPage');
const AuthPage = page('AuthPage');
const DashboardPage = page('DashboardPage');
const PolicyPage = page('PolicyPage');
const load = (node) => <Suspense fallback={<main id="main" aria-busy="true" style={{ minHeight: '100vh' }} />}>{node}</Suspense>;

/**
 * Phase 1 ships the homepage. Every other public route resolves to an honest
 * holding page so the navigation can be walked end to end; each is replaced by
 * a real page in the phase named here.
 */
const stories = {
  education: load(<StoryPage kind="education" title="Know what you are choosing." lead="Plain-language chapters on growth, grading, shape, certification and care." />),
  manufacturing: load(<StoryPage kind="manufacturing" title="From seed to finished stone." lead="A high-level account of the real CVD and HPHT workflow, without turning spectacle into scientific claims." />),
  about: load(<StoryPage kind="about" title="Built around the work." lead="A restrained account of Surat manufacturing and four decades of heritage, with unverified dates and awards deliberately omitted." />),
};

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/diamonds', element: load(<DiamondsPage />) },
      { path: '/diamonds/:publicId', element: load(<DiamondDetailPage />) },
      { path: '/diamond-finder', element: load(<DiamondsPage />) },
      { path: '/compare', element: load(<DiamondsPage />) },
      { path: '/jewellery', element: load(<JewelleryPage />) },
      { path: '/jewellery/:publicId', element: load(<JewelleryDetailPage />) },
      ...Object.entries(stories).map(([path, element]) => ({ path: `/${path}`, element })),
      { path: '/contact', element: load(<ContactPage />) },
      { path: '/privacy', element: load(<PolicyPage title="Privacy policy." />) },
      { path: '/terms', element: load(<PolicyPage title="Terms of use." />) },
      { path: '/login', element: load(<AuthPage mode="login" />) },
      { path: '/register', element: load(<AuthPage mode="register" />) },
      { path: '/forgot-password', element: load(<AuthPage mode="forgot" />) },
      { path: '/reset-password', element: load(<AuthPage mode="forgot" />) },
      { path: '/account/*', element: load(<DashboardPage />) },
      { path: '/admin/*', element: load(<DashboardPage admin />) },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
