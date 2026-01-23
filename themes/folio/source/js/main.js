// Main JavaScript for Folio theme

document.addEventListener('DOMContentLoaded', () => {
  // Drag-to-scroll for horizontal project carousels (desktop) with momentum
  const isFinePointer = window.matchMedia?.('(pointer: fine)')?.matches;
  const carousels = document.querySelectorAll('.project-carousel');

  if (isFinePointer && carousels.length > 0) {
    const DRAG_THRESHOLD_PX = 6;
    const MOMENTUM_FRICTION = 0.92; // 0-1, higher = longer glide
    const MOMENTUM_MIN_VELOCITY = 0.5; // Stop when velocity drops below this

    carousels.forEach((carousel) => {
      const wrapper = carousel.closest('.project-carousel-wrapper');
      const progressIndicator = wrapper?.querySelector('.project-carousel-progress span');

      const updateProgress = () => {
        if (!progressIndicator) return;
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        const ratio = maxScroll > 0 ? carousel.scrollLeft / maxScroll : 0;
        progressIndicator.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
      };
      carousel.addEventListener('scroll', updateProgress);
      updateProgress();

      // Keep touch behavior native; only adjust on fine pointers
      carousel.style.touchAction = 'pan-y';

      // Prevent ghost-dragging images
      carousel.querySelectorAll('img').forEach((img) => {
        img.draggable = false;
      });

      let isPointerDown = false;
      let didDrag = false;
      let startX = 0;
      let startY = 0;
      let startScrollLeft = 0;
      let activePointerId = null;

      // Velocity tracking for momentum
      let lastX = 0;
      let lastTime = 0;
      let velocity = 0;
      let momentumId = null;

      const stopMomentum = () => {
        if (momentumId) {
          cancelAnimationFrame(momentumId);
          momentumId = null;
        }
      };

      const applyMomentum = () => {
        if (Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) {
          // Re-enable scroll-snap after momentum ends
          carousel.style.scrollSnapType = '';
          return;
        }

        carousel.scrollLeft += velocity;
        velocity *= MOMENTUM_FRICTION;
        momentumId = requestAnimationFrame(applyMomentum);
      };

      const endDrag = (e) => {
        if (!isPointerDown) return;

        isPointerDown = false;
        activePointerId = null;
        carousel.classList.remove('is-dragging');

        if (didDrag) {
          // Start momentum scrolling
          if (Math.abs(velocity) > MOMENTUM_MIN_VELOCITY) {
            stopMomentum();
            momentumId = requestAnimationFrame(applyMomentum);
          } else {
            // Re-enable scroll-snap immediately if no momentum
            carousel.style.scrollSnapType = '';
          }

          if (wrapper) {
            wrapper.dataset.preventClick = '1';
            // Clear after the click event fires
            window.setTimeout(() => {
              delete wrapper.dataset.preventClick;
            }, 0);
          }
        }
      };

      carousel.addEventListener('pointerdown', (e) => {
        // Left click / primary pointer only
        if (e.button !== 0) return;

        // Stop any ongoing momentum
        stopMomentum();

        isPointerDown = true;
        didDrag = false;
        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        startScrollLeft = carousel.scrollLeft;

        // Reset velocity tracking
        lastX = e.clientX;
        lastTime = performance.now();
        velocity = 0;

        carousel.classList.add('is-dragging');
        carousel.setPointerCapture(activePointerId);
      });

      carousel.addEventListener('pointermove', (e) => {
        if (!isPointerDown || e.pointerId !== activePointerId) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Don't hijack vertical scrolling intent
        if (!didDrag && Math.abs(dy) > Math.abs(dx)) return;

        if (!didDrag && Math.abs(dx) < DRAG_THRESHOLD_PX) return;

        if (!didDrag) {
          didDrag = true;
          // Disable scroll-snap during drag for smoother feel
          carousel.style.scrollSnapType = 'none';
        }

        // Track velocity (smoothed)
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
          const instantVelocity = (lastX - e.clientX) / dt * 16; // Normalize to ~60fps
          velocity = velocity * 0.7 + instantVelocity * 0.3; // Smooth it
        }
        lastX = e.clientX;
        lastTime = now;

        carousel.scrollLeft = startScrollLeft - dx;
      });

      carousel.addEventListener('pointerup', endDrag);
      carousel.addEventListener('pointercancel', endDrag);
      carousel.addEventListener('lostpointercapture', endDrag);

      if (wrapper) {
        wrapper.addEventListener(
          'click',
          (e) => {
            if (wrapper.dataset.preventClick === '1') {
              e.preventDefault();
              e.stopPropagation();
            }
          },
          true
        );
      }
    });
  }

  // Smooth reveal animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealElements = document.querySelectorAll('.project-card, .gallery-item, .project-testimonial');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    revealObserver.observe(el);
  });

  // Image lazy loading with fade
  const images = document.querySelectorAll('img[data-src]');

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.addEventListener('load', () => {
          img.style.opacity = '1';
        });
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach(img => {
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.5s ease';
    imageObserver.observe(img);
  });

  // Parallax scroll effect
  const parallaxElements = document.querySelectorAll('[data-parallax]');

  if (parallaxElements.length > 0) {
    const handleParallax = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      parallaxElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallax) || 0.1;

        // Only apply parallax when element is in view
        if (rect.top < windowHeight && rect.bottom > 0) {
          const yPos = (rect.top - windowHeight / 2) * speed;
          el.style.transform = `translateY(${yPos}px)`;
        }
      });
    };

    window.addEventListener('scroll', handleParallax, { passive: true });
    handleParallax(); // Initial position
  }

  // Unicorn Studio scene load detection
  const unicornScenes = document.querySelectorAll('.embla__slide .unicorn-scene');

  unicornScenes.forEach(scene => {
    const startTime = performance.now();
    const MIN_SKELETON_TIME = 800; // Minimum time to show skeleton (ms)

    // Check if canvas has actual content rendered
    const checkLoaded = () => {
      const canvas = scene.querySelector('canvas');
      if (!canvas) return false;

      // Check if canvas has been drawn to (has content)
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      try {
        // Try to get image data - will fail if canvas is empty
        const imageData = ctx.getImageData(0, 0, 1, 1);
        const hasContent = imageData.data.some(value => value !== 0);

        if (hasContent) {
          // Ensure minimum skeleton display time
          const elapsed = performance.now() - startTime;
          const remainingTime = Math.max(0, MIN_SKELETON_TIME - elapsed);

          setTimeout(() => {
            scene.classList.add('loaded');
          }, remainingTime);

          return true;
        }
      } catch (e) {
        // Canvas might not be ready yet
        return false;
      }

      return false;
    };

    // Try immediate check
    if (!checkLoaded()) {
      // Set up observer to watch for canvas changes
      const observer = new MutationObserver(() => {
        if (checkLoaded()) {
          observer.disconnect();
        }
      });

      observer.observe(scene, {
        childList: true,
        subtree: true
      });

      // Also check periodically for canvas content
      const checkInterval = setInterval(() => {
        if (checkLoaded()) {
          clearInterval(checkInterval);
          observer.disconnect();
        }
      }, 100);

      // Fallback timeout - force load after 3 seconds
      setTimeout(() => {
        scene.classList.add('loaded');
        clearInterval(checkInterval);
        observer.disconnect();
      }, 300);
    }
  });
});
