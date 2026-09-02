# Drop the Our Story panorama here

Filename: **`panorama.jpg`** (exactly that, lowercase)

This is the wide "Four Decades of Diamond Excellence" mural. The Our Story
chapter does not show it as a static picture — it runs a camera across it, so
each chapter focuses the region of the artwork that depicts it:

| Chapter | Focuses on |
|---|---|
| 1980s cutting house | the workshop, far left |
| 2012, the turn | the light ring |
| CVD & HPHT | the reactor and press, centre |
| The range | the row of cut shapes, along the bottom |
| The reach | the globe, far right |
| The standard | type IIa / ethical / conflict-free |

If the file is absent the chapter falls back to the drawn lattice, so nothing
breaks while you prepare it.

## Format

- **2400 x 1250** or larger — it is scaled up to 2.3x when the camera pushes in,
  so a small file will visibly soften at the closest framings.
- **JPEG quality ~82**, or WebP. Keep it under about 900 KB.
- The focus points in `StoryPanorama.jsx` are fractions of the image. If you
  crop or re-lay-out the artwork, adjust the `FOCUS` table to match.

      ffmpeg -i mural.png -vf scale=2400:-2 -q:v 4 panorama.jpg
