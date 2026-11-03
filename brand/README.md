# Brand

The mark: an L-shaped house seen from above. A lamp is on in the small wing and its light spills through the doorway
into the big room - the two edges of the beam are true rays from the lamp past the door jambs, the way the card lights
a plan. Walls `#1b2433` (on light) / `#e6ebf2` (on dark), light `#ffc300` → `#ffa63d`, tile `#131a24`.

| File | Use |
|---|---|
| `icon.svg`, `icon-dark.svg` | the mark from 32 px up, on light / dark backgrounds (transparent) |
| `icon-small.svg`, `icon-small-dark.svg` | 24 px and below: heavier walls, a wider door, flat colours |
| `icon-mono.svg` | one colour (`currentColor`): places without colour |
| `app-icon.svg`, `app-icon-192.png`, `app-icon-512.png`, `apple-touch-icon.png` | the mark on its own dark tile |
| `favicon.svg`, `favicon-32.png` | browser tab (the small mark on the tile); inlined in `demo/` and `editor/` |
| `icon.png`, `icon@2x.png`, `dark_icon.png`, `dark_icon@2x.png` | Home Assistant's brand images, 256 / 512 px - copies live in `custom_components/living_floorplan/brand/` |
| `logo.png`, `dark_logo.png` | the mark with the name, for the README and docs |
| `social-preview.png` | 1280 × 640, GitHub's social preview (*Settings → Social preview*) |

The PNGs are rendered from the SVGs (`rsvg-convert`); the name is set in Bricolage Grotesque SemiBold.
