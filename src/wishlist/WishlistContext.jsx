import { useCallback, useEffect, useMemo, useState } from 'react';

import { WishlistContext } from './useWishlist.js';

const STORAGE_KEY = 'ngd-wishlist-v1';

/*
 * Kept on this device, the same way the selection (cart) is. Saving a stone
 * for an account needs a table on the database, and that is a schema change
 * this code does not make on its own — so the list lives in localStorage and
 * says so on the page that shows it.
 */
function readList() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item?.publicId) : [];
  } catch {
    // Blocked storage or a corrupted value: start empty rather than crash.
    return [];
  }
}

/* What is remembered about a stone. A snapshot, so the page can draw the list
   instantly; the wishlist page then checks it against live stock. */
function snapshot(stone) {
  return {
    publicId: stone.publicId,
    stockNumber: stone.stockNumber,
    shape: stone.shape,
    carat: stone.carat,
    colour: stone.colour,
    clarity: stone.clarity,
    cut: stone.cut,
    lab: stone.lab,
    price: stone.price ?? null,
    currency: stone.currency || 'USD',
    imageUrl: stone.imageUrl || '',
    savedAt: new Date().toISOString(),
  };
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(readList);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage may be blocked; the list still works for this visit */
    }
  }, [items]);

  /*
   * Two tabs, one list. The `storage` event fires in every OTHER tab when one
   * tab writes, so saving a stone on the inventory page updates the heart
   * count in a wishlist tab that is already open.
   */
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setItems(readList());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const has = useCallback((id) => items.some((item) => item.publicId === id), [items]);

  const add = useCallback(
    (stone) =>
      setItems((current) =>
        current.some((item) => item.publicId === stone.publicId) ? current : [snapshot(stone), ...current],
      ),
    [],
  );

  const remove = useCallback((id) => setItems((current) => current.filter((item) => item.publicId !== id)), []);

  const toggle = useCallback(
    (stone) =>
      setItems((current) =>
        current.some((item) => item.publicId === stone.publicId)
          ? current.filter((item) => item.publicId !== stone.publicId)
          : [snapshot(stone), ...current],
      ),
    [],
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.length, has, add, remove, toggle, clear }),
    [items, has, add, remove, toggle, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
