import { createBrowserRouter } from 'react-router-dom';

import RootLayout from './RootLayout.jsx';
import Home from '@/pages/public/Home.jsx';
import ComingSoon from '@/pages/public/ComingSoon.jsx';
import NotFound from '@/pages/public/NotFound.jsx';

/**
 * Phase 1 ships the homepage. Every other public route resolves to an honest
 * holding page so the navigation can be walked end to end; each is replaced by
 * a real page in the phase named here.
 */
const PENDING = [
  { path: '/diamonds', title: 'Diamonds', phase: 'Phase 3' },
  { path: '/diamonds/:publicId', title: 'Diamond detail', phase: 'Phase 3' },
  { path: '/diamond-finder', title: 'Diamond finder', phase: 'Phase 4' },
  { path: '/compare', title: 'Compare diamonds', phase: 'Phase 4' },
  { path: '/jewellery', title: 'Jewellery', phase: 'Phase 5' },
  { path: '/jewellery/:publicId', title: 'Jewellery detail', phase: 'Phase 5' },
  { path: '/education', title: 'Diamond education', phase: 'Phase 6' },
  { path: '/manufacturing', title: 'Manufacturing', phase: 'Phase 6' },
  { path: '/about', title: 'About us', phase: 'Phase 6' },
  { path: '/contact', title: 'Contact', phase: 'Phase 6' },
  { path: '/privacy', title: 'Privacy policy', phase: 'Phase 6' },
  { path: '/terms', title: 'Terms', phase: 'Phase 6' },
];

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Home /> },
      ...PENDING.map(({ path, title, phase }) => ({
        path,
        element: <ComingSoon title={title} phase={phase} />,
      })),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
