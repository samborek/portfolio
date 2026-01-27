# Typical Issues & Solutions: Unicorn Studio Interactions

This document captures the final implemented solutions for integrating Unicorn Studio (JSON/Lottie-based interactive backgrounds) into the portfolio's nested scroll and carousel architecture.

## 1. Interaction Dead Zones (Nested Scroll)

### The Problem
Unicorn Studio SDK relies on `window` level scroll listeners. In this project, elements are nested inside `.app-view { overflow-y: auto; }`, which prevents the global `window.scrollY` from changing, causing elements to appear "dead" or misaligned when scrolled.

### The Solution: Throttled Scroll Proxying
Implement a bridge to proxy nested scroll events to the `window`. **Note:** Use `requestAnimationFrame` to prevent excessive event firing which can break carousels.

```javascript
// themes/folio/source/js/main.js
document.querySelectorAll('.app-view').forEach(view => {
  let ticking = false;
  view.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('scroll'));
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
});
```

---

## 2. Interaction Overlays

### The Problem
Floating overlays like the tab navigation and theme toggle (`.floating-controls`) can inadvertently capture mouse events even in empty areas, preventing the mouse from reaching interactive backgrounds below.

### The Solution: Pointer-Events Management
Apply `pointer-events: none` to the wrapper container and `pointer-events: auto` only to the interactive children.

```css
/* themes/folio/source/css/style.css */
.floating-controls {
  pointer-events: none; /* Let background events pass through */
}

.content-tabs, .theme-toggle {
  pointer-events: auto; /* Re-enable for controls */
}
```

---

## 3. Canvas Pointer-Events Conflict

### The Problem
If the internal `<canvas>` or overlay text captures the mouse, the parent container might not correctly track the interaction for the SDK loop.

### The Solution: SDK-Standard Interaction
Force `pointer-events: none !important` on internal components to ensure the parent (e.g., `.unicorn-btn`) handles the tracking.

```css
.unicorn-btn canvas,
.unicorn-btn .btn-text {
  pointer-events: none !important;
}
```

---

## 4. Carousel Compatibility (Avoid Snapping)

### The Problem
Dispatching a `window.dispatchEvent(new Event('resize'))` when an element enters the viewport (via `IntersectionObserver`) can cause Embla Carousel to `reInit()`, resulting in immediate snapping back during a drag operation.

### The Solution: Selective Waking
Remove redundant `resize` events and only use `mouseenter` or `mousemove` events to "wake up" the interactive components without re-initializing the layout.

```javascript
// Trigger mouse interaction without forcing a layout re-init
scene.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
```
