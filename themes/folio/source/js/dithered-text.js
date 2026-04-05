/**
 * Dithered Text Effect
 * Renders text on a canvas with an ordered dithering (Bayer matrix) stipple pattern.
 * Mouse cursor creates a force-field that pushes dots away.
 * Inspired by the Linear /next page dithered logo effect.
 */
(function () {
  'use strict';

  // 8x8 Bayer threshold matrix (normalized 0–1)
  const BAYER_8x8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ].map(row => row.map(v => v / 64));

  const DOT_RADIUS = 0.4;     // smaller dots for sparser look
  const CELL_SIZE = 2;        // tighter grid, but smaller dots = more decimated
  const SCALE = 3;            // canvas resolution multiplier
  const ANIM_DURATION = 1200;
  const ANIM_STAGGER = 600;

  // Force field settings
  const FORCE_RADIUS = 60 * SCALE;   // px radius of influence (in canvas coords)
  const FORCE_STRENGTH = 18 * SCALE; // max displacement in px
  const RETURN_SPEED = 0.12;         // how fast dots drift back (0–1 per frame)

  // Store active instances for cleanup
  const instances = new Map();

  function initDitheredCanvas(canvas) {
    // Clean up previous instance
    const prev = instances.get(canvas);
    if (prev) {
      prev.destroy();
      instances.delete(canvas);
    }

    const text = canvas.dataset.text;
    if (!text) return;

    const wrapper = canvas.parentElement;
    const styles = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Detect font & size from the sr-only h2
    const h2 = wrapper.querySelector('.sidebar-description');
    const h2Style = h2 ? getComputedStyle(h2) : null;
    const fontSize = h2Style ? parseFloat(h2Style.fontSize) : 32;
    const fontFamily = h2Style ? h2Style.fontFamily : "'Gazpacho', Georgia, serif";
    const fontWeight = h2Style ? h2Style.fontWeight : '500';
    const lineHeight = 1.0;

    // Measure text
    const measure = document.createElement('canvas');
    const mctx = measure.getContext('2d');
    mctx.font = `${fontWeight} ${fontSize * SCALE}px ${fontFamily}`;

    const maxWidth = wrapper.clientWidth * SCALE;
    const lines = wrapText(mctx, text, maxWidth);
    const totalHeight = lines.length * fontSize * lineHeight * SCALE + fontSize * 0.3 * SCALE;

    // Add padding so displaced particles aren't clipped by canvas edges
    const PAD = FORCE_STRENGTH + DOT_RADIUS * SCALE + 2;
    canvas.width = maxWidth + PAD * 2;
    canvas.height = totalHeight + PAD * 2;
    canvas.style.width = (canvas.width / SCALE) + 'px';
    canvas.style.height = (canvas.height / SCALE) + 'px';
    canvas.style.marginLeft = -(PAD / SCALE) + 'px';
    canvas.style.marginTop = -(PAD / SCALE) + 'px';

    // Draw text offscreen to sample pixels (no padding — text position is offset in draw loop)
    const off = document.createElement('canvas');
    off.width = maxWidth;
    off.height = totalHeight;
    const octx = off.getContext('2d');
    const isMobile = window.innerWidth <= 900;

    const textX = isMobile ? maxWidth / 2 : 0;

    octx.font = `${fontWeight} ${fontSize * SCALE}px ${fontFamily}`;
    octx.fillStyle = '#000000';
    octx.textBaseline = 'top';
    octx.textAlign = isMobile ? 'center' : 'left';

    lines.forEach((line, i) => {
      octx.fillText(line, textX, i * fontSize * lineHeight * SCALE);
    });

    const imageData = octx.getImageData(0, 0, off.width, off.height);
    const pixels = imageData.data;

    // Collect dots — each has a home position + current displaced position
    const dots = [];
    for (let y = 0; y < off.height; y += CELL_SIZE) {
      for (let x = 0; x < off.width; x += CELL_SIZE) {
        const idx = (y * off.width + x) * 4;
        const alpha = pixels[idx + 3] / 255;
        if (alpha < 0.01) continue;

        const threshold = BAYER_8x8[(y / CELL_SIZE | 0) % 8][(x / CELL_SIZE | 0) % 8];
        if (alpha > threshold) {
          dots.push({
            hx: x + CELL_SIZE / 2 + PAD,  // home x (offset by padding)
            hy: y + CELL_SIZE / 2 + PAD,  // home y (offset by padding)
            cx: x + CELL_SIZE / 2 + PAD,  // current x
            cy: y + CELL_SIZE / 2 + PAD,  // current y
            col: x / off.width             // for stagger animation
          });
        }
      }
    }

    // Mouse tracking (in canvas pixel coords)
    let mouseX = -9999;
    let mouseY = -9999;
    let mouseActive = false;

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * SCALE;
      mouseY = (e.clientY - rect.top) * SCALE;
      mouseActive = true;
    }

    function onMouseLeave() {
      mouseActive = false;
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    // Drawing
    const ctx = canvas.getContext('2d');
    let dotColor = styles.getPropertyValue('--color-text').trim() ||
      (isDark ? '#e6e6e6' : '#000000');

    const startTime = performance.now();
    let animId = null;
    let settled = false;

    function draw(now) {
      const elapsed = now - startTime;
      const introDone = elapsed > ANIM_DURATION + ANIM_STAGGER + 200;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allSettled = true;

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];

        // Intro animation
        let introAlpha = 1;
        if (!introDone) {
          const delay = d.col * ANIM_STAGGER;
          const t = Math.min(1, Math.max(0, (elapsed - delay) / ANIM_DURATION));
          if (t <= 0) continue;
          introAlpha = 1 - Math.pow(1 - t, 3); // ease out cubic
        }

        // Force field displacement
        let targetX = d.hx;
        let targetY = d.hy;

        if (mouseActive) {
          const dx = d.hx - mouseX;
          const dy = d.hy - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < FORCE_RADIUS && dist > 0.1) {
            const force = (1 - dist / FORCE_RADIUS);
            // quadratic falloff for a snappier feel
            const push = force * force * FORCE_STRENGTH;
            targetX = d.hx + (dx / dist) * push;
            targetY = d.hy + (dy / dist) * push;
          }
        }

        // Smooth interpolation toward target
        d.cx += (targetX - d.cx) * RETURN_SPEED;
        d.cy += (targetY - d.cy) * RETURN_SPEED;

        // Check if still moving
        if (Math.abs(d.cx - targetX) > 0.1 || Math.abs(d.cy - targetY) > 0.1) {
          allSettled = false;
        }

        const radius = DOT_RADIUS * SCALE * introAlpha;

        ctx.globalAlpha = introAlpha;
        ctx.beginPath();
        ctx.arc(d.cx, d.cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Keep animating if intro running, mouse active, or dots still returning
      settled = introDone && !mouseActive && allSettled;

      if (!settled) {
        animId = requestAnimationFrame(draw);
      } else {
        animId = null;
      }
    }

    // Wake up the loop when mouse enters after settling
    function onMouseEnter() {
      mouseActive = true;
      if (animId === null) {
        animId = requestAnimationFrame(draw);
      }
    }

    canvas.addEventListener('mouseenter', onMouseEnter);

    animId = requestAnimationFrame(draw);
    canvas.setAttribute('data-ready', '');

    // Store instance for cleanup + color updates
    instances.set(canvas, {
      updateColor(color) {
        dotColor = color;
        if (animId === null) animId = requestAnimationFrame(draw);
      },
      destroy() {
        if (animId) cancelAnimationFrame(animId);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseleave', onMouseLeave);
        canvas.removeEventListener('mouseenter', onMouseEnter);
      }
    });
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // --- Init on load ---
  function initAll() {
    document.querySelectorAll('.dithered-text-canvas').forEach(initDitheredCanvas);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Update dot color on theme change (no re-render/animation reset)
  const themeObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'data-theme') {
        const s = getComputedStyle(document.documentElement);
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const color = s.getPropertyValue('--color-text').trim() || (dark ? '#e6e6e6' : '#000000');
        instances.forEach(instance => instance.updateColor(color));
        break;
      }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true });

  // Re-render on resize (debounced)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initAll, 200);
  });
})();
