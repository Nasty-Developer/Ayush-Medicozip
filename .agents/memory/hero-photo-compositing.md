---
name: Hero background photo compositing (Ayush Medico)
description: How the realistic hero background photo was built and tuned — generateImage output path quirk, manual ImageMagick compositing for wide layout, and object-position calibration.
---

`generateImage` in this monorepo writes to a path resolved against the **workspace root**, not the calling artifact's directory — passing `outputPath: "src/assets/..."` from context inside `artifacts/ayush-medico` still landed the file at `<workspace root>/src/assets/...`. Always pass an absolute-from-root path or immediately verify with `find`/`ls` and `mv` into the artifact folder.

**Why:** the sandboxed image job doesn't inherit the "current artifact" concept — it just writes to the literal path relative to repo root.

**How to apply:** after any `generateImage` call intended for a specific artifact, verify the file landed inside that artifact's directory before referencing it in code; move it if not.

## Building a wide "text-left, subject-right" hero photo from a square AI photo

`generateImage` does not reliably honor "wide 16:9" aspect-ratio phrasing in the prompt — a request for a pharmacist portrait came back square (1024x1024) despite explicit wide-aspect wording. Don't rely on prompt wording for aspect ratio; instead composite manually with ImageMagick:
1. Make an ambient blurred backdrop: resize/crop the source to the full target canvas size, then `-blur` (large radius) + `-modulate`/`-brightness-contrast` to soften and brighten it — this becomes the "empty" left two-thirds.
2. Resize the sharp source to the canvas height and place it at the right edge (`-gravity East`) on a canvas of the same target size.
3. Build a feather mask: black canvas with a white rectangle covering the right portion, then heavily blurred (`-blur 0x160`) so the edge is a smooth gradient, not a hard line.
4. Composite: `magick backdrop.jpg sharp-right-layer.jpg mask.png -compose over -composite result.jpg` — the mask acts as the alpha for blending the sharp layer over the blurred backdrop.
This reliably produces a "60% clean/blurred, 40% sharp subject on the right" hero photo from any square AI-generated portrait, without needing prompt-engineering luck. `-gaussian-blur` is much slower than `-blur` at large radii and can time out on big canvases — use `-blur 0x<radius>` instead.

## object-position calibration for a wide hero photo behind text+decorative UI

When placing such a photo as a CSS `object-cover` background behind an existing decorative "glass card" element (a translucent mockup panel originally designed for a flat gradient, not a real photo), two adjustments were needed together, not just image cropping:
- `object-position` needed values much closer to the image's right edge (~90-96%) than naive `(scaled-width - container-width)` math suggested, because the actual rendered section height differs from viewport height once padding is accounted for — tune by screenshotting at extremes (`object-right` vs `object-left`) first to find which direction reveals the subject, then narrow in, rather than computing from the DOM box math.
- The decorative glass card overlapping the subject's face/body needs its background changed from a semi-opaque theme token (e.g. `via-card`) to a genuinely translucent white/background wash (e.g. `from-white/15 via-white/10`) plus `backdrop-blur-md`, so the real photo shows through it as an intentional glassmorphism effect instead of blocking the photo.
