document.addEventListener('DOMContentLoaded', () => {
  // --- Lenis smooth scroll (app views only, respects reduced motion) ---
  const lenisInstances = new Map();

  function initLenis() {
    if (typeof Lenis === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Only on the main portfolio page
    const isIndex = document.body.classList.contains('index-page');
    if (!isIndex) return;

    // The actual scroll containers are .app-view nodes (overflow-y: scroll, height: 100dvh)
    // Body and .index-page are position:fixed + overflow:hidden, so window scroll is disabled.
    const viewConfigs = [
      {
        view: document.getElementById('home-view'),
        contentSelector: '.portfolio-wrapper',
        key: 'home',
      },
      {
        view: document.getElementById('playground-view'),
        contentSelector: '.playground-wrapper',
        key: 'playground',
      },
    ];

    viewConfigs.forEach(({ view, contentSelector, key }) => {
      if (!view) return;

      const lenis = new Lenis({
        wrapper: view,
        content: view.querySelector(contentSelector) || view,
        lerp: 0.1,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
      });

      lenisInstances.set(view, lenis);
      lenisInstances[key] = lenis;
    });

    function raf(time) {
      lenisInstances.forEach(lenis => lenis.raf(time));
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Expose for debugging / future use. Keep window.lenis as home for old calls.
    window.folioLenis = lenisInstances;
    window.lenis = lenisInstances.home || null;
  }

  initLenis();

  // --- Subtle Page Transitions ---
  const pageCover = document.getElementById('page-cover');
  if (pageCover) {
    // Entrance: Fade out on load
    pageCover.style.transition = 'opacity 0.15s ease-out';
    pageCover.style.opacity = '0';
    setTimeout(() => {
      if (pageCover.parentNode) pageCover.style.display = 'none';
    }, 200);
  }

  // BFCache restore (iOS/Android swipe-back): DOMContentLoaded doesn't re-fire,
  // so the page-cover from the exit transition remains visible. Fix by fading it out.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && pageCover) {
      pageCover.style.display = 'block';
      pageCover.style.transition = 'opacity 0.15s ease-out';
      pageCover.style.opacity = '0';
      setTimeout(() => {
        if (pageCover.parentNode) pageCover.style.display = 'none';
      }, 200);
    }
  });

  // --- Scroll Restoration Logic ---
  const saveScrollState = () => {
    const homeView = document.getElementById('home-view');
    const playgroundView = document.getElementById('playground-view');
    const activeBtn = document.querySelector('.tab-button.active');

    if (!homeView && !playgroundView) return;

    const state = {
      activeTab: activeBtn ? activeBtn.dataset.tab : 'home',
      homeScroll: homeView ? homeView.scrollTop : 0,
      playgroundScroll: playgroundView ? playgroundView.scrollTop : 0,
      timestamp: Date.now(),
      url: window.location.pathname
    };
    sessionStorage.setItem('folio_scroll_state', JSON.stringify(state));
  };

  const restoreScrollState = () => {
    const saved = sessionStorage.getItem('folio_scroll_state');
    if (!saved) return;

    try {
      const state = JSON.parse(saved);

      // Only restore if we are on the same page (index) 
      // and it was saved recently (within 1 hour)
      if (state.url !== window.location.pathname) return;
      if (Date.now() - state.timestamp > 60 * 60 * 1000) return;

      const homeView = document.getElementById('home-view');
      const playgroundView = document.getElementById('playground-view');

      // Restore Tab first if not already active
      if (state.activeTab && state.activeTab !== 'home') {
        const tabBtn = document.querySelector(`.tab-button[data-tab="${state.activeTab}"]`);
        if (tabBtn) tabBtn.click();
      }

      // Restore Scroll Positions
      // We use a small delay to ensure content has stabilized
      setTimeout(() => {
        if (homeView && state.homeScroll) {
          homeView.scrollTo({ top: state.homeScroll, behavior: 'auto' });
        }
        if (playgroundView && state.playgroundScroll) {
          playgroundView.scrollTo({ top: state.playgroundScroll, behavior: 'auto' });
        }
      }, 100);
    } catch (e) {
      console.error('Failed to restore scroll state', e);
    }
  };

  // Intercept clicks for Exit transition
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const url = link.href;
    const isInternal = url &&
      url.startsWith(window.location.origin) &&
      !link.target &&
      !link.hasAttribute('download') &&
      !url.includes('#') &&
      !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

    if (isInternal && pageCover) {
      // Save scroll position before navigating away
      saveScrollState();

      e.preventDefault();
      pageCover.style.display = 'block';
      // Force reflow
      pageCover.offsetHeight;
      pageCover.style.opacity = '1';

      setTimeout(() => {
        window.location.href = url;
      }, 150); // Fast 150ms exit
    }
  });

  // Also save on beforeunload for browser back/forward buttons and refreshes
  window.addEventListener('beforeunload', saveScrollState);

  // Initialize Restoration
  // Small delay to let index.ejs tab logic initialize
  if (document.getElementById('home-view')) {
    restoreScrollState();
  }

  // --- Performance: Instant Link Prefetching ---
  const prefetchUrls = new Set();
  document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const url = link.href;
    if (url && url.startsWith(window.location.origin) && !prefetchUrls.has(url) && !url.includes('#')) {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = url;
      document.head.appendChild(prefetchLink);
      prefetchUrls.add(url);
    }
  }, { passive: true });

  // --- Theme Toggle ---
  const themeToggle = document.getElementById('theme-toggle');
  const storedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Initialize theme
  if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Toggle handler
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';

      if (targetTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
    });
  }


  // --- Mobile Navigation ---
  const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (mobileNavToggle && sidebar) {
    mobileNavToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // --- Smooth Scrolling (Lenis-aware) ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;

      const targetView = targetElement.closest('.app-view');
      const targetLenis = targetView && window.folioLenis ? window.folioLenis.get(targetView) : window.lenis;

      if (targetLenis) {
        targetLenis.scrollTo(targetElement, {
          offset: -20,
          duration: 1.1,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // --- Embla Carousel ---
  const emblaNodes = document.querySelectorAll('.embla');
  const emblaInstances = [];

  const wakeUnicornScene = (scene) => {
    if (!scene) return;

    if (scene.getAttribute('data-us-lazyload') === 'true') {
      scene.setAttribute('data-us-lazyload', 'false');
    }

    const rect = scene.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    ['mouseenter', 'mousemove', 'mouseover'].forEach(type => {
      scene.dispatchEvent(new MouseEvent(type, {
        clientX: centerX,
        clientY: centerY,
        bubbles: true
      }));
    });
  };

  const getEmblaOptions = () => ({
    loop: true,
    align: 'center',
    duration: 34,
    dragFree: false,
    containScroll: 'keepSnaps',
  });

  const customSliderNodes = document.querySelectorAll('.custom-shader-carousel');

  customSliderNodes.forEach(sliderNode => {
    const track = sliderNode.querySelector('.custom-shader-track');
    const originalSlides = Array.from(sliderNode.querySelectorAll('.custom-shader-slide'));
    const wrapper = sliderNode.closest('.project-carousel-wrapper');
    if (!track || !originalSlides.length || !wrapper) return;

    if (originalSlides.length > 1) {
      const firstClone = originalSlides[0].cloneNode(true);
      const lastClone = originalSlides[originalSlides.length - 1].cloneNode(true);
      firstClone.classList.add('is-clone-slide');
      lastClone.classList.add('is-clone-slide');
      firstClone.setAttribute('aria-hidden', 'true');
      lastClone.setAttribute('aria-hidden', 'true');
      track.insertBefore(lastClone, originalSlides[0]);
      track.appendChild(firstClone);
    }

    const slides = Array.from(sliderNode.querySelectorAll('.custom-shader-slide'));
    const firstRealIndex = originalSlides.length > 1 ? 1 : 0;
    const lastRealIndex = originalSlides.length > 1 ? slides.length - 2 : slides.length - 1;

    let activeIndex = firstRealIndex;
    let resizeFrame = null;
    let settleTimer = null;

    const parseCssTimeMs = (value, fallbackMs) => {
      const time = String(value || '').trim();
      if (!time) return fallbackMs;
      if (time.endsWith('ms')) {
        const parsed = Number.parseFloat(time);
        return Number.isFinite(parsed) ? parsed : fallbackMs;
      }
      if (time.endsWith('s')) {
        const parsed = Number.parseFloat(time);
        return Number.isFinite(parsed) ? parsed * 1000 : fallbackMs;
      }
      const parsed = Number.parseFloat(time);
      return Number.isFinite(parsed) ? parsed : fallbackMs;
    };

    const getSliderSettleMs = () => {
      const duration = window.getComputedStyle(sliderNode).getPropertyValue('--custom-slider-duration');
      return parseCssTimeMs(duration, 1720) + 80;
    };

    const updateSlideFocus = () => {
      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.classList.toggle('is-active-slide', isActive);
        slide.classList.toggle('is-dimmed-slide', !isActive);
      });
      sliderNode.classList.add('is-focus-ready');
    };

    const setTrackTransition = (enabled) => {
      track.style.transition = enabled ? '' : 'none';
    };

    const updatePosition = (animate = true) => {
      setTrackTransition(animate);
      const sliderRect = sliderNode.getBoundingClientRect();
      const activeSlide = slides[activeIndex];
      const slideRect = activeSlide.getBoundingClientRect();
      const computedSlide = window.getComputedStyle(activeSlide);
      const slideSpacing = parseFloat(computedSlide.marginRight) || 0;
      const slideWidth = slideRect.width || sliderRect.width;
      const centeredOffset = (sliderRect.width - slideWidth) / 2;
      const offset = centeredOffset - activeIndex * (slideWidth + slideSpacing);

      track.style.setProperty('--custom-slider-offset', `${offset}px`);
      updateSlideFocus();

      if (!animate) {
        track.offsetHeight;
        requestAnimationFrame(() => setTrackTransition(true));
      }
    };

    const finishLoopIfNeeded = () => {
      let didReset = false;
      if (activeIndex === 0) {
        sliderNode.classList.add('is-loop-resetting');
        activeIndex = lastRealIndex;
        updatePosition(false);
        didReset = true;
      } else if (activeIndex === slides.length - 1) {
        sliderNode.classList.add('is-loop-resetting');
        activeIndex = firstRealIndex;
        updatePosition(false);
        didReset = true;
      }
      return didReset;
    };

    const releaseLoopReset = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sliderNode.classList.remove('is-loop-resetting');
        });
      });
    };

    const goTo = (index, options = {}) => {
      activeIndex = Math.min(Math.max(index, 0), slides.length - 1);
      sliderNode.classList.add('is-sliding');
      if (settleTimer) clearTimeout(settleTimer);
      updatePosition(options.animate !== false);
      window.dispatchEvent(new CustomEvent('folio:scroll'));
      settleTimer = setTimeout(() => {
        const didLoopReset = finishLoopIfNeeded();
        sliderNode.classList.remove('is-sliding');
        if (didLoopReset) releaseLoopReset();
        window.dispatchEvent(new CustomEvent('folio:scroll'));
      }, getSliderSettleMs());
    };

    const goBy = (direction) => {
      const didLoopReset = finishLoopIfNeeded();
      if (didLoopReset) {
        track.offsetHeight;
        sliderNode.classList.remove('is-loop-resetting');
      }
      goTo(activeIndex + direction);
    };

    wrapper.addEventListener('mousemove', (event) => {
      const rect = wrapper.getBoundingClientRect();
      const cursor = (event.clientX - rect.left) < rect.width / 2 ? 'w-resize' : 'e-resize';
      wrapper.style.setProperty('--slider-cursor', cursor);
    });

    wrapper.addEventListener('click', (event) => {
      if (event.target.closest('.project-carousel-progress')) return;

      const rect = wrapper.getBoundingClientRect();
      goBy((event.clientX - rect.left) < rect.width / 2 ? -1 : 1);
    });

    let wheelAccumulator = 0;
    let wheelCooldown = false;
    wrapper.addEventListener('wheel', (event) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
      if (!delta) return;

      event.preventDefault();
      if (wheelCooldown) return;

      wheelAccumulator += delta;
      if (Math.abs(wheelAccumulator) > 100) {
        goBy(wheelAccumulator > 0 ? 1 : -1);
        wheelAccumulator = 0;
        wheelCooldown = true;
        setTimeout(() => { wheelCooldown = false; }, 800);
      }
    }, { passive: false });

    window.addEventListener('resize', () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        updatePosition(false);
        resizeFrame = null;
      });
    });

    const resetObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) goTo(firstRealIndex, { animate: false });
      });
    }, {
      threshold: 0,
      rootMargin: '100px 0px 100px 0px'
    });

    resetObserver.observe(sliderNode);
    updatePosition(false);
    requestAnimationFrame(() => updatePosition(false));
  });

  emblaNodes.forEach(emblaNode => {
    const viewportNode = emblaNode.querySelector('.embla__viewport');
    if (!viewportNode) return;

    const embla = EmblaCarousel(viewportNode, getEmblaOptions());
    emblaInstances.push(embla);

    const getSelectedSlideIndex = () => {
      const slideCount = embla.slideNodes().length;
      if (!slideCount) return 0;

      const selected = embla.selectedScrollSnap();
      if (!Number.isInteger(selected)) return 0;

      return Math.min(Math.max(selected, 0), slideCount - 1);
    };

    const getCenteredSlideIndex = () => {
      const slides = embla.slideNodes();
      if (!slides.length) return 0;

      const viewportRect = viewportNode.getBoundingClientRect();
      if (!viewportRect.width) return getSelectedSlideIndex();

      const viewportCenter = viewportRect.left + viewportRect.width / 2;
      let centeredIndex = getSelectedSlideIndex();
      let closestDistance = Infinity;

      slides.forEach((slide, index) => {
        const rect = slide.getBoundingClientRect();
        if (!rect.width) return;

        const slideCenter = rect.left + rect.width / 2;
        const distance = Math.abs(slideCenter - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          centeredIndex = index;
        }
      });

      return centeredIndex;
    };

    const updateSlideFocus = (selected = getSelectedSlideIndex(), markReady = true) => {
      const slides = embla.slideNodes();
      if (!slides.length) return;

      const activeIndex = Math.min(Math.max(selected, 0), slides.length - 1);
      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.classList.toggle('is-active-slide', isActive);
        slide.classList.toggle('is-dimmed-slide', !isActive);
      });
      if (markReady) emblaNode.classList.add('is-focus-ready');
    };

    const updateCenteredSlideFocus = () => {
      updateSlideFocus(getCenteredSlideIndex());
    };

    const scheduleCenteredSlideFocus = () => {
      requestAnimationFrame(() => {
        updateCenteredSlideFocus();
        requestAnimationFrame(updateCenteredSlideFocus);
      });
    };

    const focusAdjacentSlide = (direction) => {
      const slideCount = embla.slideNodes().length;
      if (!slideCount) return;

      const current = getSelectedSlideIndex();
      updateSlideFocus((current + direction + slideCount) % slideCount);
    };

    const wakeSelectedUnicornScene = () => {
      const selectedSlide = embla.slideNodes()[getCenteredSlideIndex()];
      const unicornScene = selectedSlide && selectedSlide.querySelector('.unicorn-scene');
      if (!unicornScene) return;

      requestAnimationFrame(() => {
        wakeUnicornScene(unicornScene);
        requestAnimationFrame(() => wakeUnicornScene(unicornScene));
      });
    };

    // Integrated Progress Bar Logic
    const section = emblaNode.closest('.project-section');
    const progressBar = section?.querySelector('.project-carousel-progress span') ||
      emblaNode.closest('.project-page')?.querySelector('.embla__progress__bar');

    if (progressBar) {
      let lastProgress = 0;
      let lastDuration = '';

      const updateProgress = () => {
        const totalSlides = embla.slideNodes().length;
        if (totalSlides === 0) return;

        const currentIndex = embla.selectedScrollSnap();
        const scrollProgress = embla.scrollProgress();
        const scrollSnaps = embla.scrollSnapList();

        let progress;
        if (scrollSnaps.length === 0) {
          progress = (currentIndex + 1) / totalSlides;
        } else {
          const segmentStart = scrollSnaps[currentIndex] ?? 0;
          const segmentEnd = scrollSnaps[currentIndex + 1] ?? 1;
          const segmentRange = Math.max(segmentEnd - segmentStart, Number.EPSILON);
          const segmentProgress = Math.min(Math.max((scrollProgress - segmentStart) / segmentRange, 0), 1);
          progress = ((currentIndex + segmentProgress) / totalSlides) + (1 / totalSlides);
        }

        progress = Math.min(Math.max(progress, 1 / totalSlides), 1);

        const duration = (progress > lastProgress ? '0.4s' : '0.15s');
        if (duration !== lastDuration) {
          progressBar.style.transitionDuration = duration;
          lastDuration = duration;
        }

        progressBar.style.transform = `scaleX(${progress})`;
        lastProgress = progress;
      };

      embla.on('scroll', updateProgress);
      embla.on('init', updateProgress);
      updateProgress();
    }

    // Navigation (Click and Mouse Move)
    const wrapper = emblaNode.closest('.project-carousel-wrapper');
    if (wrapper) {
      // Cursor states based on mouse position
      wrapper.addEventListener('mousemove', (e) => {
        const rect = wrapper.getBoundingClientRect();
        const cursor = (e.clientX - rect.left) < rect.width / 2 ? 'w-resize' : 'e-resize';
        wrapper.style.setProperty('--slider-cursor', cursor);
      });

      wrapper.addEventListener('click', (e) => {
        // Only trigger if we're not clicking the progress bar or other interactive elements
        if (e.target.closest('.project-carousel-progress')) return;

        const rect = wrapper.getBoundingClientRect();
        if ((e.clientX - rect.left) < rect.width / 2) {
          focusAdjacentSlide(-1);
          embla.scrollPrev();
        } else {
          focusAdjacentSlide(1);
          embla.scrollNext();
        }
      });

      // Wheel event for touchpad horizontal scroll
      let wheelAccumulator = 0;
      const wheelThreshold = 100;
      let wheelCooldown = false;

      wrapper.addEventListener('wheel', (e) => {
        // Detect horizontal scroll (deltaX) or shift+vertical
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;

        if (delta !== 0) {
          e.preventDefault();

          if (wheelCooldown) return;

          wheelAccumulator += delta;

          if (Math.abs(wheelAccumulator) > wheelThreshold) {
            if (wheelAccumulator > 0) {
              focusAdjacentSlide(1);
              embla.scrollNext();
            } else {
              focusAdjacentSlide(-1);
              embla.scrollPrev();
            }
            wheelAccumulator = 0;

            // Cooldown to scroll only 1 image at a time
            wheelCooldown = true;
            setTimeout(() => { wheelCooldown = false; }, 800);
          }
        }
      }, { passive: false });
    }

    const onEmblaSelect = () => {
      const selected = getSelectedSlideIndex();
      emblaNode.classList.add('is-sliding');
      updateSlideFocus(selected);
      window.dispatchEvent(new CustomEvent('folio:scroll'));
    };

    const onEmblaSettle = () => {
      updateCenteredSlideFocus();
      emblaNode.classList.remove('is-sliding');
      wakeSelectedUnicornScene();
    };

    embla.on('select', onEmblaSelect);
    embla.on('settle', onEmblaSettle);
    embla.on('reInit', scheduleCenteredSlideFocus);
    embla.on('init', scheduleCenteredSlideFocus);
    updateSlideFocus(getSelectedSlideIndex(), false);
    scheduleCenteredSlideFocus();
    requestAnimationFrame(() => emblaNode.classList.remove('is-sliding'));

    let lastViewportWidth = window.innerWidth;
    let lastViewportHeight = window.innerHeight;
    let resizeFrame = null;

    window.addEventListener('resize', () => {
      if (window.innerWidth === lastViewportWidth && window.innerHeight === lastViewportHeight) return;

      lastViewportWidth = window.innerWidth;
      lastViewportHeight = window.innerHeight;

      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        embla.reInit(getEmblaOptions());
        scheduleCenteredSlideFocus();
        resizeFrame = null;
      });
    });

    // --- Auto-reset when out of view ---
    const resetObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // If the project section is completely out of view
        if (!entry.isIntersecting) {
          // Reset to first slide (index 0)
          embla.scrollTo(0);
        }
      });
    }, {
      threshold: 0,
      rootMargin: '100px 0px 100px 0px' // Slight buffer before resetting
    });

    resetObserver.observe(emblaNode);
  });

  document.addEventListener('folio:work-visible', () => {
    requestAnimationFrame(() => {
      emblaInstances.forEach(embla => {
        embla.reInit();
      });

      document.querySelectorAll('.unicorn-scene').forEach(scene => {
        const rect = scene.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
        if (isVisible) wakeUnicornScene(scene);
      });
    });
  });

  // --- Loading States (Images, Videos & Unicorn Studio) ---
  const MIN_SKELETON_TIME = 120;

  const markMediaLoaded = (media) => {
    const container = media.closest('.image-container, .tile-image-wrapper, .raw-shader-image');
    if (container) container.classList.add('loaded');
  };

  const handleImageLoad = (img) => {
    if (img.decode && img.currentSrc) {
      img.decode().catch(() => { }).finally(() => markMediaLoaded(img));
    } else {
      markMediaLoaded(img);
    }
  };

  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    if (img.complete && img.naturalWidth > 0) {
      handleImageLoad(img);
    } else {
      img.addEventListener('load', () => handleImageLoad(img), { once: true });
      img.addEventListener('error', () => markMediaLoaded(img), { once: true });
    }
  });

  document.querySelectorAll('video').forEach(video => {
    if (video.readyState >= 2) {
      markMediaLoaded(video);
    } else {
      video.addEventListener('loadeddata', () => markMediaLoaded(video), { once: true });
      video.addEventListener('loadedmetadata', () => markMediaLoaded(video), { once: true });
      video.addEventListener('error', () => markMediaLoaded(video), { once: true });
    }
  });

  function initImageShaders() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const containers = Array.from(document.querySelectorAll('.raw-shader-image[data-shader-effect="soft-ripple"]'));
    if (!containers.length) return;

    const vertexSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;

      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision highp float;

      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform vec2 u_imageResolution;
      uniform vec4 u_innerRect;
      uniform float u_radius;
      uniform vec2 u_mouse;
      uniform float u_time;
      uniform float u_hover;
      uniform vec4 u_effects;
      uniform vec4 u_rippleSettings;
      uniform vec4 u_areaSettings;
      uniform float u_chromaticAberration;
      uniform vec4 u_ripples[12];

      varying vec2 v_uv;

      vec2 coverUv(vec2 uv) {
        float canvasRatio = u_resolution.x / u_resolution.y;
        float imageRatio = u_imageResolution.x / u_imageResolution.y;
        vec2 scale = vec2(1.0);

        if (imageRatio > canvasRatio) {
          scale.x = canvasRatio / imageRatio;
        } else {
          scale.y = imageRatio / canvasRatio;
        }

        vec2 covered = (uv - 0.5) * scale + 0.5;
        return (covered - 0.5) / vec2(1.124, 1.018) + 0.5;
      }

      float waterHeight(vec2 p, float t) {
        float broad = sin((p.x * 2.2 + p.y * 1.45 + t * 0.18) * 6.28318);
        float cross = sin((p.x * -3.1 + p.y * 3.85 - t * 0.24) * 6.28318);
        float radial = sin((length(p - vec2(0.5)) * 7.25 - t * 0.42) * 6.28318);
        return (broad * 0.45 + cross * 0.35 + radial * 0.2) * 0.68;
      }

      vec2 waterNormal(vec2 p, float t) {
        float stepSize = mix(1.0, 3.0, 0.68) / 1080.0;
        float left = waterHeight(p - vec2(stepSize, 0.0), t);
        float right = waterHeight(p + vec2(stepSize, 0.0), t);
        float top = waterHeight(p - vec2(0.0, stepSize), t);
        float bottom = waterHeight(p + vec2(0.0, stepSize), t);
        return vec2(right - left, bottom - top) * mix(1.0, 7.0, 0.68);
      }

      float rippleTrail(vec2 p, float t) {
        float total = 0.0;
        float rippleSpeed = max(u_rippleSettings.x, 0.05);
        float rippleFade = max(u_rippleSettings.y, 0.1);
        float tail = max(u_rippleSettings.z, 0.1);
        float rippleArea = max(u_areaSettings.z, 0.05);
        float rippleSmoothing = clamp(u_areaSettings.w, 0.0, 1.5);
        float ringFrequency = mix(58.0, 40.0, min(rippleSmoothing, 1.0));
        float wakeFrequency = mix(34.0, 22.0, min(rippleSmoothing, 1.0));
        float ringDecay = mix(15.0, 10.0, min(rippleSmoothing, 1.0)) / rippleArea;
        float wakeDecay = mix(5.4, 3.9, min(rippleSmoothing, 1.0)) / rippleArea;

        for (int i = 0; i < 12; i++) {
          vec4 ripple = u_ripples[i];
          float age = t - ripple.z;
          float isAlive = step(0.0, ripple.w) * step(0.0, age) * (1.0 - smoothstep(2.15 * tail, 2.85 * tail, age));
          vec2 toRipple = p - ripple.xy;
          float dist = length(toRipple);
          float radius = age * 0.22 * rippleSpeed;
          float ring = sin((dist - radius) * ringFrequency) * exp(-abs(dist - radius) * ringDecay);
          float wake = sin((dist * wakeFrequency - age * 10.0 * rippleSpeed)) * exp(-dist * wakeDecay) * exp(-age * 1.05 / rippleFade);
          float onset = smoothstep(0.0, 0.06, age);
          total += (ring * 0.6 + wake * 0.18) * exp(-age * 0.62 / rippleFade) * ripple.w * isAlive * onset;
        }

        return total / (1.0 + abs(total) * mix(0.35, 0.9, min(rippleSmoothing, 1.0)));
      }

      float roundedRectMask(vec2 p, float radius, float aspect) {
        vec2 scale = vec2(aspect, 1.0);
        vec2 position = (p - 0.5) * scale;
        vec2 halfSize = scale * 0.5;
        vec2 q = abs(position) - halfSize + vec2(radius);
        float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        float aa = 0.75 / max(min(u_resolution.x, u_resolution.y), 1.0);
        return 1.0 - smoothstep(-aa, aa, distance);
      }

      void main() {
        float distortion = max(u_effects.x, 0.0);
        float light = max(u_effects.y, 0.0);
        float effectSpeed = max(u_effects.z, 0.05);
        float edgeStrength = max(u_effects.w, 0.0);
        float cursorArea = max(u_areaSettings.x, 0.05);
        float cursorFalloffSteepness = max(u_areaSettings.y, 0.05);
        float t = u_time * effectSpeed;
        vec2 innerSize = max(u_innerRect.zw - u_innerRect.xy, vec2(0.001));
        vec2 p = (v_uv - u_innerRect.xy) / innerSize;
        vec2 mouse = (u_mouse - u_innerRect.xy) / innerSize;
        vec2 toMouse = p - mouse;
        float dist = length(toMouse);
        vec2 dir = normalize(toMouse + 0.0001);
        float edgeDist = min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y));
        float edge = 1.0 - smoothstep(0.0, 0.18, edgeDist);
        float rim = 1.0 - smoothstep(0.0, 0.10, edgeDist);

        vec2 normal = waterNormal(p, t);
        float cursorFalloff = exp(-(dist / cursorArea) * cursorFalloffSteepness) * u_hover;
        float cursorRipple = sin(dist * 30.0 - t * 3.8) * cursorFalloff;
        float trail = rippleTrail(p, u_time);
        float edgeWave = waterHeight(p * 1.08, t + 0.35);
        float interaction = clamp(u_hover * 0.55 + abs(trail) * 1.5, 0.0, 1.0);

        vec2 offset = normal * 0.0022 * interaction * distortion;
        offset += dir * cursorRipple * 0.0048 * distortion;
        offset += normalize(p - mouse + 0.0001) * trail * 0.011 * distortion;

        vec2 shapeWarp = dir * cursorRipple * edge * 0.004 * edgeStrength;
        shapeWarp += normalize(p - mouse + 0.0001) * trail * edge * 0.007 * edgeStrength;
        vec2 shaped = p + shapeWarp;
        float aspect = (innerSize.x * u_resolution.x) / max(innerSize.y * u_resolution.y, 0.001);
        float alpha = roundedRectMask(shaped, u_radius, aspect);

        if (alpha <= 0.001) {
          discard;
        }

        vec2 uv = clamp(coverUv(p + offset), vec2(0.001), vec2(0.999));
        vec2 chromaVector = (offset * 0.65 + dir * cursorFalloff * 0.0025 + normalize(p - mouse + 0.0001) * trail * 0.0035) * u_chromaticAberration;
        vec2 redUv = clamp(coverUv(p + offset + chromaVector), vec2(0.001), vec2(0.999));
        vec2 blueUv = clamp(coverUv(p + offset - chromaVector), vec2(0.001), vec2(0.999));
        vec4 color = texture2D(u_texture, uv);
        color.r = texture2D(u_texture, redUv).r;
        color.b = texture2D(u_texture, blueUv).b;

        float cursorGlow = pow(max(0.0, 1.0 - dist * 1.7), 2.4) * u_hover;
        float diagonalSheen = smoothstep(0.58, 0.0, abs((v_uv.x + v_uv.y) - (1.05 + sin(t * 0.44) * 0.08))) * 0.04;
        color.rgb += vec3(0.035, 0.055, 0.07) * cursorGlow * light;
        color.rgb += vec3(0.05, 0.07, 0.085) * diagonalSheen * light;
        color.rgb += vec3(0.028, 0.045, 0.052) * trail * light;
        color.rgb += vec3(0.025, 0.05, 0.06) * rim * cursorFalloff * 0.22 * light;
        color.rgb -= vec3(0.01, 0.014, 0.014) * edge * cursorFalloff * 0.18;

        gl_FragColor = vec4(color.rgb, alpha);
      }
    `;

    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const createProgram = (gl) => {
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
      if (!vertexShader || !fragmentShader) return null;

      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
      }

      return program;
    };

    const getVisibleImage = (container) => {
      const images = Array.from(container.querySelectorAll('img'));
      return images.find((img) => {
        const style = window.getComputedStyle(img);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }) || images[0];
    };

    const clampSetting = (value, fallback, min, max) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, parsed));
    };

    const getShaderSettings = (container) => {
      let parsed = {};
      if (container.dataset.shaderSettings) {
        try {
          parsed = JSON.parse(container.dataset.shaderSettings);
        } catch {
          parsed = {};
        }
      }

      return {
        distortion: clampSetting(parsed.distortion, 0.72, 0, 24),
        light: clampSetting(parsed.light, 0.72, 0, 4),
        speed: clampSetting(parsed.speed, 0.68, 0.05, 6),
        rippleSpeed: clampSetting(parsed.ripple_speed ?? parsed.rippleSpeed, 0.78, 0.05, 6),
        rippleFade: clampSetting(parsed.ripple_fade ?? parsed.rippleFade, 1.28, 0.1, 12),
        tail: clampSetting(parsed.tail, 1.42, 0.2, 80),
        edge: clampSetting(parsed.edge, 0.36, 0, 8),
        cursorLag: clampSetting(parsed.cursor_lag ?? parsed.cursorLag, 1.12, 0.4, 24),
        cursorArea: clampSetting(parsed.cursor_area ?? parsed.cursorArea, 1, 0.1, 6),
        cursorFalloff: clampSetting(parsed.cursor_falloff ?? parsed.cursorFalloff, 4.6, 0.2, 16),
        rippleArea: clampSetting(parsed.ripple_area ?? parsed.rippleArea, 1, 0.1, 8),
        rippleSmoothing: clampSetting(parsed.ripple_smoothing ?? parsed.rippleSmoothing, 0.7, 0, 1.5),
        chromaticAberration: clampSetting(
          parsed.chromatic_aberration ?? parsed.chromaticAberration ?? parsed.chromatic,
          0.18,
          0,
          4
        ),
      };
    };

    const setupContainer = (container) => {
      if (container.dataset.shaderReady === 'true') return;

      const img = getVisibleImage(container);
      if (!img) return;
      const settings = getShaderSettings(container);

      const start = () => {
        if (!img.naturalWidth || !img.naturalHeight || container.dataset.shaderReady === 'true') return;

        const canvas = document.createElement('canvas');
        canvas.className = 'image-shader-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        container.appendChild(canvas);

        const gl = canvas.getContext('webgl', {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: false,
          premultipliedAlpha: false,
        });

        if (!gl) {
          canvas.remove();
          return;
        }

        const program = createProgram(gl);
        if (!program) {
          canvas.remove();
          return;
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW
        );

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        const locations = {
          position: gl.getAttribLocation(program, 'a_position'),
          texture: gl.getUniformLocation(program, 'u_texture'),
          resolution: gl.getUniformLocation(program, 'u_resolution'),
          imageResolution: gl.getUniformLocation(program, 'u_imageResolution'),
          innerRect: gl.getUniformLocation(program, 'u_innerRect'),
          radius: gl.getUniformLocation(program, 'u_radius'),
          mouse: gl.getUniformLocation(program, 'u_mouse'),
          time: gl.getUniformLocation(program, 'u_time'),
          hover: gl.getUniformLocation(program, 'u_hover'),
          effects: gl.getUniformLocation(program, 'u_effects'),
          rippleSettings: gl.getUniformLocation(program, 'u_rippleSettings'),
          areaSettings: gl.getUniformLocation(program, 'u_areaSettings'),
          chromaticAberration: gl.getUniformLocation(program, 'u_chromaticAberration'),
          ripples: gl.getUniformLocation(program, 'u_ripples[0]'),
        };

        let visible = false;
        let frame = null;
        let hover = 0;
        let targetHover = 0;
        let mouseX = 0.5;
        let mouseY = 0.5;
        let targetMouseX = 0.5;
        let targetMouseY = 0.5;
        let width = 1;
        let height = 1;
        let maskRadius = 0.03;
        const innerRect = new Float32Array([0, 0, 1, 1]);
        let rippleIndex = 0;
        let lastRippleTime = 0;
        let lastRippleX = 0.5;
        let lastRippleY = 0.5;
        const startTime = performance.now();
        const rippleCount = 12;
        const ripples = new Float32Array(rippleCount * 4);

        for (let i = 0; i < ripples.length; i += 4) {
          ripples[i] = 0.5;
          ripples[i + 1] = 0.5;
          ripples[i + 2] = -10;
          ripples[i + 3] = 0;
        }

        const getShaderTime = () => (performance.now() - startTime) / 1000;

        const addRipple = (x, y, strength = 1) => {
          const nowSeconds = getShaderTime();
          const distance = Math.hypot(x - lastRippleX, y - lastRippleY);
          const elapsed = nowSeconds - lastRippleTime;
          if (elapsed < 0.028 && distance < 0.026) return;

          const index = rippleIndex * 4;
          ripples[index] = Math.min(1, Math.max(0, x));
          ripples[index + 1] = Math.min(1, Math.max(0, y));
          ripples[index + 2] = nowSeconds;
          ripples[index + 3] = strength * Math.min(1, 0.42 + distance * 8 + elapsed * 5);

          rippleIndex = (rippleIndex + 1) % rippleCount;
          lastRippleTime = nowSeconds;
          lastRippleX = x;
          lastRippleY = y;
        };

        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
          width = Math.max(1, Math.round(rect.width * dpr));
          height = Math.max(1, Math.round(rect.height * dpr));

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          if (rect.width && rect.height) {
            innerRect[0] = (containerRect.left - rect.left) / rect.width;
            innerRect[1] = 1 - ((containerRect.top + containerRect.height - rect.top) / rect.height);
            innerRect[2] = (containerRect.left + containerRect.width - rect.left) / rect.width;
            innerRect[3] = 1 - ((containerRect.top - rect.top) / rect.height);

            const radiusPx = parseFloat(window.getComputedStyle(container).borderTopLeftRadius) || 0;
            maskRadius = radiusPx / Math.max(containerRect.height, 1);
          }
        };

        const render = (now) => {
          frame = null;
          if (!visible) return;

          resize();
          const hoverEase = 0.08 / settings.cursorLag;
          const mouseEase = 0.12 / settings.cursorLag;
          hover += (targetHover - hover) * hoverEase;
          mouseX += (targetMouseX - mouseX) * mouseEase;
          mouseY += (targetMouseY - mouseY) * mouseEase;

          gl.viewport(0, 0, width, height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.enableVertexAttribArray(locations.position);
          gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(locations.texture, 0);
          gl.uniform2f(locations.resolution, width, height);
          gl.uniform2f(locations.imageResolution, img.naturalWidth, img.naturalHeight);
          gl.uniform4fv(locations.innerRect, innerRect);
          gl.uniform1f(locations.radius, maskRadius);
          gl.uniform2f(locations.mouse, mouseX, mouseY);
          gl.uniform1f(locations.time, (now - startTime) / 1000);
          gl.uniform1f(locations.hover, hover);
          gl.uniform4f(locations.effects, settings.distortion, settings.light, settings.speed, settings.edge);
          gl.uniform4f(locations.rippleSettings, settings.rippleSpeed, settings.rippleFade, settings.tail, settings.cursorLag);
          gl.uniform4f(locations.areaSettings, settings.cursorArea, settings.cursorFalloff, settings.rippleArea, settings.rippleSmoothing);
          gl.uniform1f(locations.chromaticAberration, settings.chromaticAberration);
          gl.uniform4fv(locations.ripples, ripples);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

          if (!container.classList.contains('shader-ready')) {
            container.dataset.shaderReady = 'true';
            container.classList.add('shader-ready');
          }

          frame = requestAnimationFrame(render);
        };

        const requestRender = () => {
          if (frame || !visible) return;
          frame = requestAnimationFrame(render);
        };

        container.addEventListener('pointermove', (event) => {
          const rect = canvas.getBoundingClientRect();
          targetMouseX = (event.clientX - rect.left) / rect.width;
          targetMouseY = 1 - (event.clientY - rect.top) / rect.height;
          targetHover = 1;
          addRipple(targetMouseX, targetMouseY, event.pointerType === 'touch' ? 0.9 : 1);
          requestRender();
        });

        container.addEventListener('pointerenter', (event) => {
          const rect = canvas.getBoundingClientRect();
          targetMouseX = (event.clientX - rect.left) / rect.width;
          targetMouseY = 1 - (event.clientY - rect.top) / rect.height;
          targetHover = 1;
          addRipple(targetMouseX, targetMouseY, 0.65);
          requestRender();
        });

        container.addEventListener('pointerleave', () => {
          targetHover = 0;
          requestRender();
        });

        const resizeObserver = new ResizeObserver(() => requestRender());
        resizeObserver.observe(container);

        const intersectionObserver = new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) requestRender();
        }, { rootMargin: '160px 0px', threshold: 0.01 });

        intersectionObserver.observe(container);
      };

      if (img.complete && img.naturalWidth > 0) {
        start();
      } else {
        img.addEventListener('load', start, { once: true });
      }
    };

    containers.forEach(setupContainer);
  }

  initImageShaders();

  const enableDesktopUnicornScenes = () => {
    if (window.matchMedia('(max-width: 900px)').matches) return;

    document.querySelectorAll('.unicorn-scene[data-us-project-src-desktop]').forEach(scene => {
      if (scene.hasAttribute('data-us-project-src')) return;
      scene.setAttribute('data-us-project-src', scene.getAttribute('data-us-project-src-desktop'));
    });
  };

  // Unicorn Studio Handler
  if (window.UnicornStudio) {
    enableDesktopUnicornScenes();

    UnicornStudio.init().then(() => {
      document.querySelectorAll('.unicorn-scene').forEach(scene => {
        const startTime = performance.now();
        let sceneLoaded = false;

        const markSceneLoaded = () => {
          if (sceneLoaded || scene.classList.contains('loaded')) return;
          sceneLoaded = true;

          const remaining = Math.max(0, MIN_SKELETON_TIME - (performance.now() - startTime));
          setTimeout(() => {
            scene.classList.add('loaded');
            const container = scene.closest('.image-container');
            if (container) container.classList.add('loaded');
          }, remaining);
        };

        const waitForCanvasPaint = () => {
          const canvas = scene.querySelector('canvas');
          if (!canvas) return false;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(markSceneLoaded, 250);
            });
          });
          return true;
        };

        scene.addEventListener('us-load', () => {
          waitForCanvasPaint() || markSceneLoaded();
        });

        const canvasObserver = new MutationObserver(() => {
          if (waitForCanvasPaint()) canvasObserver.disconnect();
        });
        canvasObserver.observe(scene, { childList: true });
        if (waitForCanvasPaint()) canvasObserver.disconnect();
        setTimeout(() => canvasObserver.disconnect(), 8000);

        // Workaround for mouse-tracking scenes that break after scrolling
        // Workaround for mouse-tracking scenes that break after visibility changes
        const canvas = scene.querySelector('canvas');
        if (canvas) {
          const wakeUpScene = () => {
            const rect = scene.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Dispatch multiple events to force-wake the interaction loop
            ['mouseenter', 'mousemove', 'mouseover'].forEach(type => {
              scene.dispatchEvent(new MouseEvent(type, {
                clientX: centerX,
                clientY: centerY,
                bubbles: true
              }));
            });
          };

          const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                // Wait a frame for the CSS transition/visibility to settle
                requestAnimationFrame(wakeUpScene);
              }
            });
          }, { threshold: 0.1 });
          visibilityObserver.observe(scene);
        }
      });
    });

    // --- Interactive Button Wake-up ---
    // Apply the same interaction wake-up logic to .unicorn-btn
    document.querySelectorAll('.unicorn-btn').forEach(btn => {
      const wakeUpButton = () => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        ['mouseenter', 'mousemove', 'mouseover'].forEach(type => {
          btn.dispatchEvent(new MouseEvent(type, {
            clientX: centerX,
            clientY: centerY,
            bubbles: true
          }));
        });
      };

      const btnObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            requestAnimationFrame(wakeUpButton);
          }
        });
      }, { threshold: 0.1 });
      btnObserver.observe(btn);
    });

    // --- Scroll Proxying for Nested Containers ---
    // Proxies nested scroll events to window so global SDK listeners (like Unicorn Studio)
    // can track element visibility and mouse mapping correctly.
    const scrollHandler = () => {
      window.dispatchEvent(new Event('scroll'));
    };

    document.querySelectorAll('.app-view').forEach(view => {
      let ticking = false;
      view.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            scrollHandler();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    });
  }

  // --- Sidebar & ScrollSpy ---
  const homeView = document.getElementById('home-view');
  const sections = document.querySelectorAll('section[id^="project-"], #more-works, #experience, #clients, #connect');
  const navLinks = document.querySelectorAll('.project-link-item, .footer-link-item');

  if (homeView && sections.length && navLinks.length) {
    const observerOptions = {
      root: homeView,
      threshold: [0, 0.1, 0.2, 0.5, 0.8, 1.0],
      rootMargin: '-25% 0px -45% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      // Find the entry with the largest visible height in the detection window
      let bestEntry = null;
      let maxIntersectHeight = 0;

      // We need to check ALL sections currently intersecting
      // IntersectionObserver only gives us ones that CHANGED.
      // So we should maintain a state or just check all visible ones.
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const viewRect = homeView.getBoundingClientRect();
        const winTop = viewRect.top + (viewRect.height * 0.25);
        const winBot = viewRect.top + (viewRect.height * 0.55);
        const intersectHeight = Math.max(0, Math.min(rect.bottom, winBot) - Math.max(rect.top, winTop));

        if (intersectHeight > maxIntersectHeight) {
          maxIntersectHeight = intersectHeight;
          bestEntry = section;
        }
      });

      if (bestEntry) {
        const id = bestEntry.id;
        const matchingLinks = document.querySelectorAll(`a[href="#${id}"]`);

        if (matchingLinks.length > 0) {
          navLinks.forEach(link => link.classList.remove('active'));
          matchingLinks.forEach(link => {
            if (link.classList.contains('project-link-item') || link.classList.contains('footer-link-item')) {
              link.classList.add('active');
            }
          });
        }
      }
    }, observerOptions);
    sections.forEach(section => observer.observe(section));
  }

  // --- Topbar Contact: reveal after hero scroll (desktop only) ---
  const heroSection = document.querySelector('.sidebar-intro');
  const contactNavMq = window.matchMedia('(min-width: 901px)');
  if (homeView && heroSection && document.body.classList.contains('index-page')) {
    const updateContactNavVisibility = (heroVisible) => {
      if (!contactNavMq.matches) {
        document.body.classList.remove('past-hero');
        return;
      }

      const activeTab = document.querySelector('.tab-button.active');
      const onHomeTab = !activeTab || activeTab.dataset.tab === 'home';
      const showContact = !heroVisible && onHomeTab && !document.body.classList.contains('about-mode');
      document.body.classList.toggle('past-hero', showContact);
    };

    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => updateContactNavVisibility(entry.isIntersecting));
    }, {
      root: homeView,
      threshold: 0,
    });

    heroObserver.observe(heroSection);

    const refreshContactNavVisibility = () => {
      const homeViewRect = homeView.getBoundingClientRect();
      const heroRect = heroSection.getBoundingClientRect();
      const heroVisible = heroRect.bottom > homeViewRect.top && heroRect.top < homeViewRect.bottom;
      updateContactNavVisibility(heroVisible);
    };

    document.querySelectorAll('.tab-button').forEach((btn) => {
      btn.addEventListener('click', () => setTimeout(refreshContactNavVisibility, 750));
    });

    ['about-toggle', 'about-close'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => setTimeout(refreshContactNavVisibility, 450));
    });

    const homeLenis = window.folioLenis?.home || window.folioLenis?.get?.(homeView);
    if (homeLenis && typeof homeLenis.on === 'function') {
      homeLenis.on('scroll', refreshContactNavVisibility);
    }

    if (typeof contactNavMq.addEventListener === 'function') {
      contactNavMq.addEventListener('change', refreshContactNavVisibility);
    } else if (typeof contactNavMq.addListener === 'function') {
      contactNavMq.addListener(refreshContactNavVisibility);
    }

    refreshContactNavVisibility();
  }

  // --- Topbar contrast: all nav pills flip together over genuinely dark backdrops ---
  const topbarEl = document.querySelector('.sidebar-topbar');
  const topbarSampleCanvas = document.createElement('canvas');
  topbarSampleCanvas.width = 1;
  topbarSampleCanvas.height = 1;
  const topbarSampleCtx = topbarSampleCanvas.getContext('2d', { willReadFrequently: true });
  const TOPBAR_DARK_LUMINANCE_MAX = 0.28;

  const getRelativeLuminance = ([r, g, b]) => {
    const channel = (value) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const sampleMediaLuminanceAt = (media, x, y) => {
    const rect = media.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;

    try {
      if (media instanceof HTMLCanvasElement) {
        const scaleX = media.width / rect.width;
        const scaleY = media.height / rect.height;
        const sx = Math.min(media.width - 1, Math.max(0, (x - rect.left) * scaleX));
        const sy = Math.min(media.height - 1, Math.max(0, (y - rect.top) * scaleY));
        topbarSampleCtx.clearRect(0, 0, 1, 1);
        topbarSampleCtx.drawImage(media, sx, sy, 1, 1, 0, 0, 1, 1);
        const { data } = topbarSampleCtx.getImageData(0, 0, 1, 1);
        return getRelativeLuminance([data[0], data[1], data[2]]);
      }

      if (media instanceof HTMLImageElement) {
        if (!media.complete || !media.naturalWidth) return null;
        const scaleX = media.naturalWidth / rect.width;
        const scaleY = media.naturalHeight / rect.height;
        const sx = Math.min(media.naturalWidth - 1, Math.max(0, (x - rect.left) * scaleX));
        const sy = Math.min(media.naturalHeight - 1, Math.max(0, (y - rect.top) * scaleY));
        topbarSampleCtx.clearRect(0, 0, 1, 1);
        topbarSampleCtx.drawImage(media, sx, sy, 1, 1, 0, 0, 1, 1);
        const { data } = topbarSampleCtx.getImageData(0, 0, 1, 1);
        return getRelativeLuminance([data[0], data[1], data[2]]);
      }

      if (media instanceof HTMLVideoElement && media.readyState >= 2) {
        const scaleX = media.videoWidth / rect.width;
        const scaleY = media.videoHeight / rect.height;
        const sx = Math.min(media.videoWidth - 1, Math.max(0, (x - rect.left) * scaleX));
        const sy = Math.min(media.videoHeight - 1, Math.max(0, (y - rect.top) * scaleY));
        topbarSampleCtx.clearRect(0, 0, 1, 1);
        topbarSampleCtx.drawImage(media, sx, sy, 1, 1, 0, 0, 1, 1);
        const { data } = topbarSampleCtx.getImageData(0, 0, 1, 1);
        return getRelativeLuminance([data[0], data[1], data[2]]);
      }
    } catch {
      return null;
    }

    return null;
  };

  const isDarkTheme = () => document.documentElement.getAttribute('data-theme') === 'dark';

  const isHeroAtTop = () => {
    if (!heroSection || !homeView) return false;
    const homeViewRect = homeView.getBoundingClientRect();
    const heroRect = heroSection.getBoundingClientRect();
    return heroRect.bottom > homeViewRect.top + 8;
  };

  const isAtPageHero = () => {
    if (document.body.classList.contains('past-hero')) return false;
    return isHeroAtTop();
  };

  const SLIDE_PROFILE_GRID = 5;
  let topbarContrastCache = { key: '', useLightNav: false };

  const invalidateTopbarContrast = () => {
    topbarContrastCache.key = '';
  };

  const getSlideIndex = (slide) => {
    if (!slide?.parentElement) return -1;
    return Array.from(slide.parentElement.children).indexOf(slide);
  };

  const getActiveSectionFromNav = () => {
    const activeLink = document.querySelector('.project-link-item.active[href^="#project-"]');
    if (!activeLink) return null;
    const id = activeLink.getAttribute('href')?.slice(1);
    return id ? document.getElementById(id) : null;
  };

  const sectionNeedsLightTopbar = (section) => {
    if (!section) return false;
    return section.hasAttribute('data-topbar-light')
      || Boolean(section.querySelector('[data-topbar-light]'));
  };

  const slideNeedsLightTopbar = (section, slide) => {
    if (sectionNeedsLightTopbar(section)) return true;

    const slideItem = slide?.querySelector('.project-slide-item');
    if (!slideItem) return false;

    if (slideItem.querySelector('.unicorn-scene-poster, .mobile-static-first-slide img')) {
      return true;
    }

    const slides = slide.parentElement?.children;
    if (slides?.[0] === slide && slideItem.querySelector('.unicorn-scene')) {
      return true;
    }

    return false;
  };

  const getActiveSectionNearTopbar = () => {
    if (!homeView) return getActiveSectionFromNav();

    const viewRect = homeView.getBoundingClientRect();
    const topbarRect = topbarEl.getBoundingClientRect();
    const winTop = topbarRect.bottom;
    const winBot = viewRect.top + viewRect.height * 0.55;

    let bestSection = null;
    let maxIntersect = 0;

    document.querySelectorAll('.project-section, #connect, #clients').forEach((section) => {
      const rect = section.getBoundingClientRect();
      const intersect = Math.max(0, Math.min(rect.bottom, winBot) - Math.max(rect.top, winTop));
      if (intersect > maxIntersect) {
        maxIntersect = intersect;
        bestSection = section;
      }
    });

    return bestSection || getActiveSectionFromNav();
  };

  const getTopbarBackdropContext = () => {
    const section = getActiveSectionNearTopbar();

    if (section?.matches('#connect') || section?.hasAttribute('data-topbar-dark')) {
      return { kind: 'forced-dark', sectionId: section.id };
    }

    if (sectionNeedsLightTopbar(section)) {
      return { kind: 'forced-light', sectionId: section.id };
    }

    if (section?.classList.contains('project-section')) {
      const slide = section.querySelector('.embla__slide.is-active-slide');
      if (slide) {
        if (slideNeedsLightTopbar(section, slide)) {
          return { kind: 'forced-light', sectionId: section.id };
        }

        return {
          kind: 'slide',
          sectionId: section.id,
          slideIndex: getSlideIndex(slide),
          slide,
          section,
        };
      }
    }

    if (section) {
      return { kind: 'section', sectionId: section.id, section };
    }

    if (isAtPageHero()) return { kind: 'hero' };

    return { kind: 'neutral' };
  };

  const buildTopbarContrastKey = (ctx) => {
    const theme = isDarkTheme() ? 'dark' : 'light';
    if (ctx.kind === 'slide') {
      return `${theme}:${ctx.kind}:${ctx.sectionId}:${ctx.slideIndex}`;
    }
    if (ctx.sectionId) {
      return `${theme}:${ctx.kind}:${ctx.sectionId}`;
    }
    return `${theme}:${ctx.kind}`;
  };

  const profileSlideBackdrop = (slide, section) => {
    if (slideNeedsLightTopbar(section, slide)) return 'light';

    const slideItem = slide?.querySelector('.project-slide-item');
    if (!slideItem) return 'light';

    const canvas = slideItem.querySelector('.unicorn-scene canvas');
    const img = slideItem.querySelector('.image-container img, .unicorn-scene-poster, .mobile-static-first-slide img, .preview-slideshow-img');
    const media = [canvas, img].find((node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!media) return 'light';

    const rect = media.getBoundingClientRect();
    const luminances = [];

    for (let row = 0; row < SLIDE_PROFILE_GRID; row += 1) {
      for (let col = 0; col < SLIDE_PROFILE_GRID; col += 1) {
        const x = rect.left + (rect.width * (col + 0.5)) / SLIDE_PROFILE_GRID;
        const y = rect.top + (rect.height * (row + 0.5)) / SLIDE_PROFILE_GRID;
        const lum = sampleMediaLuminanceAt(media, x, y);
        if (lum !== null) luminances.push(lum);
      }
    }

    if (!luminances.length) return 'light';

    const average = luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
    const brightest = Math.max(...luminances);
    const backdropLum = Math.max(average, brightest * 0.72);
    return backdropLum < TOPBAR_DARK_LUMINANCE_MAX ? 'dark' : 'light';
  };

  const resolveTopbarContrast = (ctx) => {
    if (ctx.kind === 'forced-dark') return true;

    if (isDarkTheme()) {
      if (ctx.kind === 'hero' || ctx.kind === 'forced-light' || ctx.kind === 'neutral' || ctx.kind === 'section') {
        return false;
      }

      if (ctx.kind === 'slide') {
        return profileSlideBackdrop(ctx.slide, ctx.section) === 'dark';
      }

      return false;
    }

    if (ctx.kind === 'hero' || ctx.kind === 'neutral' || ctx.kind === 'forced-light' || ctx.kind === 'section') {
      return false;
    }

    if (ctx.kind === 'slide') {
      return profileSlideBackdrop(ctx.slide, ctx.section) === 'dark';
    }

    return false;
  };

  const applyTopbarContrast = (useLightNav) => {
    document.body.classList.toggle('topbar-on-dark', useLightNav);
  };

  const refreshTopbarContrast = () => {
    if (!topbarEl || !document.body.classList.contains('index-page')) {
      applyTopbarContrast(false);
      topbarContrastCache = { key: '', useLightNav: false };
      return;
    }

    if (document.body.classList.contains('about-mode')) {
      applyTopbarContrast(false);
      topbarContrastCache = { key: '', useLightNav: false };
      return;
    }

    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab && activeTab.dataset.tab !== 'home') {
      applyTopbarContrast(false);
      topbarContrastCache = { key: '', useLightNav: false };
      return;
    }

    const ctx = getTopbarBackdropContext();
    const key = buildTopbarContrastKey(ctx);

    if (key === topbarContrastCache.key) {
      applyTopbarContrast(topbarContrastCache.useLightNav);
      return;
    }

    const useLightNav = resolveTopbarContrast(ctx);
    topbarContrastCache = { key, useLightNav };
    applyTopbarContrast(useLightNav);
  };

  const scheduleTopbarContrastRefresh = (delayMs = 0) => {
    invalidateTopbarContrast();
    if (delayMs > 0) {
      window.setTimeout(refreshTopbarContrast, delayMs);
      return;
    }
    requestAnimationFrame(refreshTopbarContrast);
  };

  if (topbarEl && document.body.classList.contains('index-page')) {
    emblaInstances.forEach((embla) => {
      embla.on('select', () => scheduleTopbarContrastRefresh(100));
      embla.on('settle', () => scheduleTopbarContrastRefresh(0));
    });

    document.querySelectorAll('.unicorn-scene').forEach((scene) => {
      if (scene.classList.contains('loaded')) return;

      const sceneObserver = new MutationObserver(() => {
        if (!scene.classList.contains('loaded')) return;
        scheduleTopbarContrastRefresh(120);
        sceneObserver.disconnect();
      });

      sceneObserver.observe(scene, { attributes: true, attributeFilter: ['class'] });
    });

    const themeObserver = new MutationObserver(() => scheduleTopbarContrastRefresh(0));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const homeLenisForTopbar = window.folioLenis?.home || window.folioLenis?.get?.(homeView);
    if (homeLenisForTopbar && typeof homeLenisForTopbar.on === 'function') {
      homeLenisForTopbar.on('scroll', () => {
        const ctx = getTopbarBackdropContext();
        const key = buildTopbarContrastKey(ctx);
        if (key !== topbarContrastCache.key) {
          scheduleTopbarContrastRefresh(0);
        }
      });
    }

    let topbarContrastLoopId = null;
    let lastLoopKey = '';

    const runTopbarContrastLoop = () => {
      const ctx = getTopbarBackdropContext();
      const key = buildTopbarContrastKey(ctx);
      if (key !== lastLoopKey) {
        lastLoopKey = key;
        refreshTopbarContrast();
      }
      topbarContrastLoopId = requestAnimationFrame(runTopbarContrastLoop);
    };

    topbarContrastLoopId = requestAnimationFrame(runTopbarContrastLoop);

    window.addEventListener('pagehide', () => {
      if (topbarContrastLoopId) {
        cancelAnimationFrame(topbarContrastLoopId);
        topbarContrastLoopId = null;
      }
      themeObserver.disconnect();
    });
  }

  // --- Reveal on Scroll ---
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (revealElements.length > 0 && homeView) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          // Once revealed, we don't need to observe it anymore
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      root: homeView,
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // Staggered reveal for the first two projects on load to ensure movement is visible
    setTimeout(() => {
      revealElements.forEach((el, index) => {
        if (index < 2 && !el.classList.contains('revealed')) {
          setTimeout(() => {
            el.classList.add('revealed');
            revealObserver.unobserve(el);
          }, index * 150); // Stagger the first two
        }
      });
    }, 200); // Wait for page to settle
  }

  // Work section toggle
  const workToggle = document.querySelector('.project-links-toggle');
  const workList = document.getElementById('work-list');
  if (workToggle && workList) {
    workToggle.addEventListener('click', () => {
      const isExpanded = workToggle.getAttribute('aria-expanded') === 'true';
      workToggle.setAttribute('aria-expanded', !isExpanded);
      workList.classList.toggle('collapsed', isExpanded);
    });
  }

  // Sidebar Accordion Toggle
  document.querySelectorAll('.sidebar-accordion-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const content = toggle.nextElementSibling;
      if (!content || !content.classList.contains('sidebar-accordion-content')) return;

      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.sidebar-accordion-toggle[aria-expanded="true"]').forEach(openToggle => {
        if (openToggle === toggle) return;
        const openContent = openToggle.nextElementSibling;
        openToggle.setAttribute('aria-expanded', 'false');
        if (openContent && openContent.classList.contains('sidebar-accordion-content')) {
          openContent.classList.remove('expanded');
        }
      });
      toggle.setAttribute('aria-expanded', !isExpanded);
      content.classList.toggle('expanded', !isExpanded);
    });
  });

  // --- Near-Viewport Project Media Preloader ---
  // Warms the next projects shortly before they enter the scroll viewport.
  const initProjectMediaPreloader = () => {
    const projects = Array.from(document.querySelectorAll('.project-section[data-project-index]'))
      .sort((a, b) => parseInt(a.dataset.projectIndex) - parseInt(b.dataset.projectIndex));

    if (projects.length <= 1) return;

    const warmProject = (project) => {
      if (project.dataset.mediaPreloaded === 'true') return;
      project.dataset.mediaPreloaded = 'true';

      project.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.loading = 'eager';
        if (img.decode && img.currentSrc) img.decode().catch(() => { });
      });

      project.querySelectorAll('.unicorn-scene[data-us-lazyload="true"]').forEach(wakeUnicornScene);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        warmProject(entry.target);
        observer.unobserve(entry.target);
      });
    }, {
      root: homeView || null,
      rootMargin: '900px 0px',
      threshold: 0
    });

    projects.slice(1).forEach(project => observer.observe(project));
  };

  // Run after load so the first viewport keeps the network priority.
  if (document.readyState === 'complete') {
    setTimeout(initProjectMediaPreloader, 500);
  } else {
    window.addEventListener('load', () => setTimeout(initProjectMediaPreloader, 500));
  }

  // --- Resume Hover Preview ---
  const initResumeHoverPreview = () => {
    const preview = document.querySelector('.resume-hover-preview');
    const items = document.querySelectorAll('.resume-list-item');
    if (!preview || !items.length) return;

    const img = preview.querySelector('.preview-image');
    const title = preview.querySelector('.preview-title');
    const year = preview.querySelector('.preview-year');
    const desc = preview.querySelector('.preview-description');

    let isMobile = window.matchMedia('(max-width: 768px)').matches;
    window.addEventListener('resize', () => {
      isMobile = window.matchMedia('(max-width: 768px)').matches;
    });

    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        if (isMobile) return;

        const data = item.dataset;
        if (!data.previewImage) return;

        // Update content
        img.classList.remove('loaded');
        img.src = data.previewImage;
        img.onload = () => img.classList.add('loaded');

        title.textContent = data.previewTitle || '';
        year.textContent = data.previewYear || '';
        desc.textContent = data.previewDescription || '';

        preview.classList.add('active');
      });

      item.addEventListener('mouseleave', () => {
        if (isMobile) return;
        preview.classList.remove('active');
      });

      item.addEventListener('mousemove', (e) => {
        if (isMobile || !preview.classList.contains('active')) return;

        const gap = 20;
        // Force a layout read to ensure we have the correct height including text
        const width = preview.offsetWidth;
        const height = preview.offsetHeight;

        let finalX = e.clientX + gap;
        let finalY = e.clientY + gap;

        // Check horizontal boundary
        if (finalX + width > window.innerWidth) {
          finalX = e.clientX - width - gap;
        }

        // Check vertical boundary
        if (finalY + height > window.innerHeight) {
          finalY = e.clientY - height - gap;
        }

        // Final safety check to ensure it doesn't go off top/left
        finalX = Math.max(gap, finalX);
        finalY = Math.max(gap, finalY);

        preview.style.transform = `translate(${finalX}px, ${finalY}px) scale(1)`;
      });

      // Mobile click handler
      item.addEventListener('click', (e) => {
        if (!isMobile) return;
        // Potential implementation for mobile: show as a modal or expanded state
        // For now, if the user requested "click on mobile", we could toggle a class
        // but given the "floating" nature, a modal might be better.
        // Keeping it simple for now as requested.
      });
    });
  };

  initResumeHoverPreview();

  // --- Copy Email Functionality ---
  const copyEmailLinks = document.querySelectorAll('.copy-email-btn');
  copyEmailLinks.forEach(link => {
    // Create inline tooltip span
    const tooltip = document.createElement('span');
    tooltip.className = 'copied-tooltip';
    tooltip.textContent = 'Copied!';
    link.appendChild(tooltip);

    const showCopied = () => {
      link.classList.add('copied');
      setTimeout(() => link.classList.remove('copied'), 2000);
    };

    link.addEventListener('click', (e) => {
      e.preventDefault();
      const email = link.getAttribute('href').replace('mailto:', '');

      navigator.clipboard.writeText(email).then(showCopied).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = email;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); showCopied(); } catch (err) {}
        document.body.removeChild(textArea);
      });
    });
  });

  // --- Drag to scroll for more-work-strip ---
  document.querySelectorAll('.more-work-strip').forEach(strip => {
    let isDown = false;
    let startX;
    let scrollLeft;

    strip.addEventListener('mousedown', e => {
      isDown = true;
      strip.style.cursor = 'grabbing';
      startX = e.pageX - strip.offsetLeft;
      scrollLeft = strip.scrollLeft;
    });

    strip.addEventListener('dragstart', e => e.preventDefault());

    strip.addEventListener('mouseleave', () => {
      isDown = false;
      strip.style.cursor = 'grab';
    });

    strip.addEventListener('mouseup', () => {
      isDown = false;
      strip.style.cursor = 'grab';
    });

    strip.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - strip.offsetLeft;
      const walk = (x - startX) * 1.5;
      strip.scrollLeft = scrollLeft - walk;
    });

    // Prevent click on links after dragging
    strip.addEventListener('click', e => {
      if (Math.abs(strip.scrollLeft - scrollLeft) > 5) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    strip.style.cursor = 'grab';
  });
});
