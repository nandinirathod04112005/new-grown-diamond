# Drop your eight process images here

The "How a diamond is made" film on /diamonds looks for these exact filenames.
Any that exist are used; any that are missing fall back to the WebGL scene, so
you can add them one at a time.

| # | Filename            | Your panel                                   |
|---|---------------------|----------------------------------------------|
| 1 | `01-seed.jpg`       | seed plate with diamond crystals             |
| 2 | `02-reactor.jpg`    | CVD chamber, purple plasma, methane molecules|
| 3 | `03-growth.jpg`     | crystals growing on the seed plate           |
| 4 | `04-press.jpg`      | HPHT press, glowing core                     |
| 5 | `05-rough.jpg`      | two rough crystals, clear and yellow         |
| 6 | `06-scan.jpg`       | laser scan with wireframe map                |
| 7 | `07-cutting.jpg`    | cutting and polishing wheels                 |
| 8 | `08-polished.jpg`   | finished brilliant on the pedestal           |

## Format

- **1600 x 1200** or larger, landscape. They are shown full-frame and cropped
  to 4:3, so keep the subject away from the extreme edges.
- **JPEG or WebP**, quality ~80. Aim for under 400 KB each — eight images at
  2 MB apiece is 16 MB of hero payload and will feel broken on mobile.
- `.jpg` extension exactly as listed (lowercase).

Optimise before dropping them in:

    # one image
    ffmpeg -i panel.png -vf scale=1600:-2 -q:v 4 01-seed.jpg

    # or convert a folder to WebP at ~80 quality
    for f in *.png; do ffmpeg -i "$f" -vf scale=1600:-2 -quality 80 "${f%.png}.webp"; done

## Before you use them

These need to be images you have the right to publish. If you generated them
yourself, you are fine. If they came from Google Images or Pinterest, they are
someone else's work and this is a commercial site — see the note in
`src/sections/diamonds/processMedia.js`.
