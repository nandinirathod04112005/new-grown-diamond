import { createContext, useContext } from 'react';

export const WishlistContext = createContext(null);

/**
 * The saved-stones list, or null when no WishlistProvider is mounted.
 *
 * Null rather than a throw, unlike useCart: the heart buttons live on shared
 * components (the card, the stone dialog), and a missing provider should make
 * them quietly absent, not take the whole inventory page down with it.
 */
export function useWishlist() {
  return useContext(WishlistContext);
}
