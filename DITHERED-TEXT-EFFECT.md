# Dithered Text Effect

Canvas-based stipple/halftone text rendering with interactive cursor force field.
Inspired by the Linear `/next` page dithered logo effect.

## How it works

### 1. Text rasterization

The visible text ("Building digital products & exploring technology") is rendered onto a hidden offscreen `<canvas>` using the same font, size, and weight as the original `<h2>`. This produces a pixel buffer where each pixel's alpha channel represents how "solid" the text is at that point.

### 2. Ordered dithering (Bayer matrix)

Instead of drawing the text as filled shapes, the effect samples the offscreen pixel buffer on a grid (`CELL_SIZE` intervals). At each sample point it compares the pixel's alpha against a threshold from an **8×8 Bayer matrix** — a classic ordered dithering pattern used in print halftoning.

If `alpha > bayerThreshold` at that grid cell, a dot is placed. This creates the stipple pattern: dense dots where the text is solid, sparse dots at edges and thin strokes.

The Bayer matrix (normalized 0–1):

```
 0/64  32/64   8/64  40/64   2/64  34/64  10/64  42/64
48/64  16/64  56/64  24/64  50/64  18/64  58/64  26/64
12/64  44/64   4/64  36/64  14/64  46/64   6/64  38/64
60/64  28/64  52/64  20/64  62/64  30/64  54/64  22/64
 3/64  35/64  11/64  43/64   1/64  33/64   9/64  41/64
51/64  19/64  59/64  27/64  49/64  17/64  57/64  25/64
15/64  47/64   7/64  39/64  13/64  45/64   5/64  37/64
63/64  31/64  55/64  23/64  61/64  29/64  53/64  21/64
```

### 3. Dot rendering

Each qualifying sample becomes a small filled circle on the visible canvas. Key parameters:

| Parameter | Value | Effect |
|-----------|-------|--------|
| `DOT_RADIUS` | `0.8` | Tiny dots — more decimated/sparse look |
| `CELL_SIZE` | `3` | Sampling grid spacing (px in canvas coords) |
| `SCALE` | `2` | Canvas resolution multiplier (retina) |

Smaller `DOT_RADIUS` relative to `CELL_SIZE` = more whitespace between dots = more "decimated" feel.

### 4. Intro animation

On page load, dots animate in with a **left-to-right wave**:

- Each dot's reveal is delayed based on its horizontal position (`col * ANIM_STAGGER`)
- Dots scale up from 0 and fade in using a **cubic ease-out** curve
- Total animation: ~1800ms (`ANIM_DURATION` 1200ms + `ANIM_STAGGER` 600ms)

### 5. Cursor force field

When the mouse hovers over the canvas, dots within a radius are pushed away:

- **`FORCE_RADIUS`**: 60px (scaled) — how far the influence reaches
- **`FORCE_STRENGTH`**: 18px (scaled) — max displacement at cursor center
- **Falloff**: Quadratic (`force²`) — sharp near cursor, gentle at edges
- **Return**: Dots lerp back to home position at `RETURN_SPEED` (0.12 per frame) when cursor moves away

Each dot tracks:
- `hx, hy` — home position (where it belongs)
- `cx, cy` — current rendered position (interpolates toward target)

The displacement direction is always radially outward from cursor, calculated as:

```
dx = dot.homeX - mouseX
dy = dot.homeY - mouseY
dist = sqrt(dx² + dy²)
push = ((1 - dist/radius)²) * strength
targetX = homeX + (dx/dist) * push
targetY = homeY + (dy/dist) * push
```

### 6. Performance

- Animation loop runs only when needed: during intro, while mouse is active, or while dots are returning to home
- Loop sleeps (`cancelAnimationFrame`) once all dots settle, wakes on `mouseenter`
- Theme changes and window resize trigger a full re-init with cleanup of previous listeners and animation frames

## File locations

| File | Purpose |
|------|---------|
| `themes/folio/source/js/dithered-text.js` | Effect engine (dithering + force field + animation) |
| `themes/folio/layout/index.ejs` | Canvas element + sr-only fallback `<h2>` |
| `themes/folio/source/css/style.css` | `.sidebar-description-wrapper`, `.dithered-text-canvas`, sr-only styles |

## HTML structure

```html
<div class="sidebar-description-wrapper">
  <canvas class="dithered-text-canvas"
          data-text="Building digital products & exploring technology">
  </canvas>
  <h2 class="sidebar-description sidebar-description--sr-only">
    Building digital products & exploring technology
  </h2>
</div>
```

The `<h2>` is visually hidden (sr-only) but remains for accessibility / screen readers. The canvas reads the text from its `data-text` attribute and inherits font metrics from the hidden `<h2>`.

## Tuning guide

| Want | Adjust |
|------|--------|
| Denser dots | Increase `DOT_RADIUS` or decrease `CELL_SIZE` |
| Sparser / more decimated | Decrease `DOT_RADIUS` or increase `CELL_SIZE` |
| Bigger force field | Increase `FORCE_RADIUS` |
| Stronger push | Increase `FORCE_STRENGTH` |
| Snappier return | Increase `RETURN_SPEED` (max 1.0 = instant) |
| Softer return | Decrease `RETURN_SPEED` (e.g. 0.05) |
| Faster intro wave | Decrease `ANIM_STAGGER` |
| Slower reveal per dot | Increase `ANIM_DURATION` |

## Theme awareness

Reads `--color-text` from CSS custom properties. Re-renders automatically when `data-theme` attribute changes on `<html>`, so light/dark toggle works without page reload.

## Origin: Linear /next page

The Linear `/next` page uses a `DitheredLogo` React component that renders the Linear logomark onto a 1000×1000 canvas with a similar ordered-dithering stipple pattern. The implementation details are compiled into webpack chunks and not directly readable, but the visual technique is standard Bayer-matrix ordered dithering — the same algorithm used in print halftoning since the 1970s.
