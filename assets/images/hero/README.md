# Hero diamond assets — drop your real photographs here

The homepage hero runs in **photographic mode** the moment a real
diamond cutout exists in this folder. No code changes are needed:
`assets/js/hero-real.js` probes for the files below on every load.

While this folder holds no main cutout, the hero automatically keeps
the WebGL diamond film instead — the site never shows a broken image
and no placeholder pretends to be a photograph.

## The one file that switches the hero over

| Path | Purpose |
| --- | --- |
| `assets/images/hero/hero-diamond.webp` | **The main hero diamond.** A professionally photographed, colourless/ice-white polished diamond, cut out on a fully transparent background. |

Recommended: ≥ 1400 px on the long edge, sRGB, transparent WebP
(export quality ~80 keeps it well under 300 KB). `hero-diamond.avif`
(preferred if present) and `hero-diamond.png` are also probed, in the
order **avif → webp → png** — ship whichever you have; webp is the
documented default.

Because the photograph itself is used as the CSS mask for the light
sweep / facet flash / spectral edge, a clean alpha edge matters more
than resolution — halos or white fringing around the cutout will glow
during the sweep.

## Optional supporting files (all fall back to the main cutout)

| Path | Used for |
| --- | --- |
| `assets/images/hero/diamond-2.webp` | Supporting stones 1 & 4 (top crossing + large blurred foreground) |
| `assets/images/hero/diamond-3.webp` | Supporting stone 2 (small far-left drifter) |
| `assets/images/hero/diamond-4.webp` | Supporting stone 3 (mid-depth diagonal) |
| `assets/images/hero/rough-diamond.webp` | A rough/uncut crystal wisp in the homepage Growth story stage (only mounts when this file exists) |

Supporting stones render small, blurred and translucent — 600–900 px
files are plenty. Different photographs (other cuts, other angles)
make the background field read richer, but re-using the main cutout
works: each instance gets its own size, rotation, mirror, blur depth,
opacity and travel path.

## What mounts when the main cutout exists

- the hero photograph with camera-like motion (approach, light-strike,
  glide to its seat, ambient float — never a flat spin), masked light
  sweep/flash/spectral edge, mirrored dark-glass reflection and shadow
- four supporting stones on separate depth layers (two on mobile)
- the sapphire eclipse halo, travelling beams and floor caustics
- subtle real-diamond wisps in the Shapes / Featured / Jewellery
  sections (desktop)

Reduced motion shows the finished composition, still. Nothing in this
folder is required for the rest of the site.
