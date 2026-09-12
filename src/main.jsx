import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App.jsx'
import '@/styles/global.css'
import { CartProvider } from '@/cart/CartContext.jsx'
import { WishlistProvider } from '@/wishlist/WishlistContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CartProvider><WishlistProvider><App /></WishlistProvider></CartProvider>
  </StrictMode>,
)
