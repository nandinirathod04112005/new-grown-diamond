# Drop real process footage or photography here

The "How a diamond is made" section on /diamonds uses the best source available,
in this order — no code change is needed to move up the ladder:

1. `diamond-process.mp4`  ← real footage, scrubbed by scroll (best)
2. the WebGL scene         ← what runs today
3. the drawn reactor       ← phones and no-WebGL devices

## The video

| Setting | Value |
|---|---|
| Filename | `diamond-process.mp4` (exact) |
| Length | 8–20 seconds |
| Content | seed plate -> reactor -> plasma -> growth -> rough -> polished |
| Resolution | 1280x1280 or 1600x1600 (square framing suits the layout) |
| Audio | none — strip it, it is never played |
| Encoding | H.264, faststart, **keyframe every 5–10 frames** |

That keyframe interval matters more than anything else here. Scrubbing seeks
constantly, and a video with keyframes two seconds apart has to decode a long
run of frames for every seek, which is what makes scroll-video feel broken on
phones.
    ffmpeg -i source.mov -an -vf scale=1280:1280 -c:v libx264 -crf 20 \
      -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart diamond-process.mp4

Add `diamond-process.jpg` beside it as the poster frame.

## Where the images should come from

**Not Google Images or Pinterest.** Those are other people's copyrighted
photographs, and this is a commercial site — using them invites takedowns and
claims. Use one of these instead:

1. **Your own factory.** You manufacture in Surat: the reactor, a seed plate,
   rough crystals and the polishing wheel are all in the building. This is the
   most credible option as well as the free one — buyers can tell the
   difference between stock imagery and a real production floor.
2. **Licensed stock** — Unsplash and Pexels both permit commercial use.
3. **Your equipment supplier.** CVD reactor manufacturers will often supply
   press imagery on request.
