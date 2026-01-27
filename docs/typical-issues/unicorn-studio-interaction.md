# Typical Issues & Solutions: Unicorn Studio Interactions

This document captures common interaction issues encountered when integrating Unicorn Studio (JSON/Lottie-based interactive backgrounds) into complex layouts, specifically when using nested scroll containers and tabbed views.

## 1. Interaction Dead Zones (Nested Scroll)

### The Problem
Unicorn Studio SDK often relies on `window` level scroll listeners to determine element visibility and sync mouse coordinate mapping. When the website uses a nested scrollable container (e.g., `.app-view { overflow-y: auto; }`), the `window` scroll position remains constant (0, 0), causing the SDK's internal interaction loop to "miss" elements or fail to update their state as they scroll into view.

### The Solution: Scroll Proxying
Implement a bridge to proxy the nested scroll events to the `window`.

```javascript
// main.js
document.querySelectorAll('.app-view').forEach(view => {
  view.addEventListener('scroll', () => {
    // Manually trigger window scroll to notify global SDK listeners
    window.dispatchEvent(new Event('scroll'));
  });
});
```

---

## 2. Unresponsive Elements on View Switch

### The Problem
When switching between views (e.g., Home to Playground) via `translateX` or similar CSS transitions, elements that were hidden or off-screen might lose their interaction state. The SDK may pause its loop for performance when it thinks the element is not visible or at correct coordinates.

### The Solution: Manual Wake-Up
Trigger a global re-sync once the transition finishes.

```javascript
// Tab switching logic
setTimeout(() => {
    // Force many SDKs to recalculate layouts/buffers
    window.dispatchEvent(new Event('resize'));
    
    // Dispatch a dummy mousemove to wake the interaction loop
    window.dispatchEvent(new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2,
        bubbles: true
    }));
}, 1050); // Delay slightly longer than CSS transition time
```

---

## 3. Interaction Overlays

### The Problem
Floating controls or background decorative elements (like `gradient-blobs`) can inadvertently "capture" mouse events even if they have `opacity: 0` or are semi-transparent. This prevents the mouse movement from reaching the interactive JSON container below.

### The Solution: Pointer-Events Management
Use `pointer-events: none` on wrapper containers while explicitly enabling it on their interactive children.

```css
/* style.css */
.floating-controls {
  pointer-events: none; /* Mouse events pass through the container */
}

.floating-controls button {
  pointer-events: auto; /* Buttons remain interactive */
}
```

---

## 4. Canvas Pointer-Events Conflict

### The Problem
Manually setting `pointer-events: auto` on the `<canvas>` element inside a `.unicorn-btn` can sometimes steal events from the parent `<a>` tag where the SDK is actually listening for interaction tracking.

### The Solution: SDK-Standard Interaction
Revert the canvas to `pointer-events: none` and let the SDK handle the interaction on the parent container (e.g., the `.unicorn-btn` / `<a>` tag). Ensure the button text also has `pointer-events: none` if it sits above the interactive area.

```css
.unicorn-btn canvas {
  pointer-events: none !important;
}

.unicorn-btn .btn-text {
  pointer-events: none; /* Let clicks pass to the button container */
}
```

---

## 5. Interaction Restart in Sliders

### The Problem
Elements inside carousels (Embla/Slick) might not resume their animation or interaction loop when the slide becomes active after being hidden.

### The Solution: Carousel Select "Wake-up"
Explicitly wake up scenes when they become the active slide.

```javascript
embla.on('select', () => {
  const selectedIndex = embla.selectedScrollSnap();
  const activeSlide = embla.slideNodes()[selectedIndex];
  const scenes = activeSlide.querySelectorAll('.unicorn-scene');
  
  scenes.forEach(scene => {
    // Dispatch mouseenter/mousemove on the scene element to re-sync SDK loop
    scene.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    window.dispatchEvent(new Event('resize'));
  });
});
```
