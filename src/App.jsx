import { RouterProvider } from 'react-router-dom';

import { router } from '@/app/routes.jsx';
import SmoothScrollProvider from '@/providers/SmoothScrollProvider.jsx';

export default function App() {
  return (
    <SmoothScrollProvider>
      <RouterProvider router={router} />
    </SmoothScrollProvider>
  );
}
