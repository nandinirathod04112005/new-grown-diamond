import { useEffect, useMemo, useState } from 'react';
import { CartContext } from './useCart.js';

const STORAGE_KEY = 'ngd-cart-v1';

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item?.publicId) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* storage may be blocked */ }
  }, [items]);

  const value = useMemo(() => ({
    items,
    count: items.length,
    has: (id) => items.some((item) => item.publicId === id),
    add: (stone) => setItems((current) => current.some((item) => item.publicId === stone.publicId)
      ? current
      : [...current, {
        publicId: stone.publicId,
        stockNumber: stone.stockNumber,
        shape: stone.shape,
        carat: stone.carat,
        colour: stone.colour,
        clarity: stone.clarity,
        cut: stone.cut,
        lab: stone.lab,
        price: stone.price,
        currency: stone.currency,
        imageUrl: stone.imageUrl,
      }]),
    remove: (id) => setItems((current) => current.filter((item) => item.publicId !== id)),
    clear: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
