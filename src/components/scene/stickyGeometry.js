/**
 * Where a `position: sticky; top: 0` panel actually sits, computed rather than
 * measured.
 *
 * The panels' visibility drives both their own opacity and which chapter the
 * rail names, and both used to call getBoundingClientRect() on every scrub
 * frame — seven reads a frame, taken immediately after the director had
 * written ten inline styles, so each one forced a synchronous layout.
 *
 * Caching the panel's rect instead is wrong: a sticky element's rect IS its
 * current position, which moves with the scroll. What is stable is its SLOT —
 * an ordinary block whose document position only changes on reflow. Given the
 * slot, sticky is three cases:
 *
 *   · the slot has not reached the top yet  -> the panel rides with it
 *   · the slot straddles the top            -> the panel is stuck at 0
 *   · the slot is leaving                   -> the panel is pushed up with it
 */
export function stickyTop({ slotTop, slotHeight, panelHeight }, scrollY) {
  const natural = slotTop - scrollY;
  if (natural > 0) return natural;
  // Stuck, but it cannot outlive its slot.
  const floor = slotTop + slotHeight - panelHeight - scrollY;
  return Math.min(0, floor);
}

/** How much of the panel is on screen, as a fraction of the viewport. */
export function viewportOverlap(geom, scrollY, viewportHeight) {
  if (!geom || !geom.panelHeight || !viewportHeight) return 0;
  const top = stickyTop(geom, scrollY);
  const overlap = Math.max(
    0,
    Math.min(top + geom.panelHeight, viewportHeight) - Math.max(top, 0)
  );
  return overlap / viewportHeight;
}
