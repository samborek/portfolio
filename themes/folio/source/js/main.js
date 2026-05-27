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
    const container = media.closest('.image-container, .tile-image-wrapper');
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
