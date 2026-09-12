/**
 * Dark is the authored NGD experience; light remains an explicit visitor
 * choice. The site no longer inherits a light operating-system preference on
 * first visit, which previously turned most routes into a different visual
 * language than the dark cinematic brief.
 */
export const THEME_KEY = 'ngd-theme';

/** What is actually stored: 'light' | 'dark' | null (meaning NGD dark default). */
export function storedTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    // Private mode and blocked site data both throw on read. The dark default
    // remains available without storage, so this is not worth surfacing.
    return null;
  }
}

/** What the visitor is actually looking at right now. */
export function resolvedTheme() {
  return storedTheme() ?? 'light';
}

/**
 * Writes the choice to the document and to storage.
 *
 * Only explicit light/dark values are stored. Invalid input falls back to the
 * authored dark theme rather than leaving the initial paint ambiguous.
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  const next = theme === 'light' ? 'light' : 'dark';
  root.dataset.theme = next;

  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // The document is already updated; only persistence is lost.
  }
}
