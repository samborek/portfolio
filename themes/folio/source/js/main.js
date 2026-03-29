document.addEventListener('DOMContentLoaded', () => {
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

  // --- Smooth Scrolling ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // --- Embla Carousel ---
  const emblaNodes = document.querySelectorAll('.embla');
  emblaNodes.forEach(emblaNode => {
    const viewportNode = emblaNode.querySelector('.embla__viewport');
    if (!viewportNode) return;

    const isMobileViewport = window.innerWidth <= 900;
    const embla = EmblaCarousel(viewportNode, {
      loop: true,
      align: isMobileViewport ? 'center' : 'start',
      dragFree: false,
      containScroll: isMobileViewport ? 'keepSnaps' : 'trimSnaps'
    });

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
          embla.scrollPrev();
        } else {
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
              embla.scrollNext();
            } else {
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

    window.addEventListener('resize', () => {
      const wasMobile = isMobileViewport;
      const nowMobile = window.innerWidth <= 900;
      if (wasMobile !== nowMobile) {
        embla.reInit({
          align: nowMobile ? 'center' : 'start',
          containScroll: nowMobile ? 'keepSnaps' : 'trimSnaps'
        });
      } else {
        embla.reInit();
      }
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

  // --- Loading States (Images & Unicorn Studio) ---
  const MIN_SKELETON_TIME = 0; // Removed delay for instant show when cached

  // Standard Image Handler
  const handleImageLoad = (img) => {
    const container = img.closest('.image-container');
    if (container) container.classList.add('loaded');
  };

  document.querySelectorAll('img').forEach(img => {
    if (img.complete) handleImageLoad(img);
    else img.addEventListener('load', () => handleImageLoad(img));
  });

  // Unicorn Studio Handler
  if (window.UnicornStudio) {
    UnicornStudio.init().then(() => {
      document.querySelectorAll('.unicorn-scene').forEach(scene => {
        const startTime = performance.now();

        const checkSceneLoaded = () => {
          if (scene.classList.contains('loaded')) return true;
          const canvas = scene.querySelector('canvas');
          if (!canvas) return false;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return false;

          try {
            const hasContent = ctx.getImageData(0, 0, 1, 1).data.some(v => v !== 0);
            if (hasContent) {
              const remaining = Math.max(0, MIN_SKELETON_TIME - (performance.now() - startTime));
              setTimeout(() => {
                scene.classList.add('loaded');
                const container = scene.closest('.image-container');
                if (container) container.classList.add('loaded');
              }, remaining);
              return true;
            }
          } catch (e) { }
          return false;
        };

        scene.addEventListener('us-load', () => {
          scene.classList.add('loaded');
          const container = scene.closest('.image-container');
          if (container) container.classList.add('loaded');
        });

        const itv = setInterval(() => { if (checkSceneLoaded()) clearInterval(itv); }, 200);
        setTimeout(() => { clearInterval(itv); scene.classList.add('loaded'); }, 600); // Quick fallback

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
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !isExpanded);
      const content = toggle.nextElementSibling;
      if (content) {
        content.classList.toggle('expanded', !isExpanded);
      }
    });
  });

  // --- Project-by-Project Sequencer ---
  // Batches loading per project to prevent network congestion while ensuring readiness.
  const initProjectSequencer = () => {
    const projects = Array.from(document.querySelectorAll('.project-section[data-project-index]'))
      .sort((a, b) => parseInt(a.dataset.projectIndex) - parseInt(b.dataset.projectIndex));

    if (projects.length <= 1) return; // Only 1 project (already eager) or none

    // Start from Project 1 (Project 0 is standard eager load)
    let currentProjectIndex = 1;

    const loadNextProject = () => {
      if (currentProjectIndex >= projects.length) return;

      const project = projects[currentProjectIndex];
      const assets = [];

      // Collect assets in this project
      const images = project.querySelectorAll('img[loading="lazy"]');
      const scenes = project.querySelectorAll('.unicorn-scene[data-us-lazyload="true"]');

      images.forEach(img => {
        assets.push(new Promise(resolve => {
          if (img.complete) return resolve();
          img.onload = resolve;
          img.onerror = resolve; // Continue even on error
          img.loading = 'eager'; // Trigger load
        }));
      });

      scenes.forEach(scene => {
        assets.push(new Promise(resolve => {
          // Unicorn doesn't have a standard load event on the DIV wrapper, 
          // but we can flip the attribute to trigger its internal logic
          scene.setAttribute('data-us-lazyload', 'false');
          // Give it a fixed time budget to "start" - we can't easily await full canvas ready here
          // without deeper hooks, but flipping the bit starts the network request.
          setTimeout(resolve, 200);
        }));
      });

      // Wait for all assets in this project (or timeout safety)
      const batchPromise = Promise.all(assets);
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000)); // 3s max per project

      Promise.race([batchPromise, timeoutPromise]).then(() => {
        // Project loaded (or timed out), move to next
        currentProjectIndex++;
        // Small breathing room for main thread
        setTimeout(loadNextProject, 100);
      });
    };

    // Kick off the sequencer
    loadNextProject();
  };

  // Run slightly after load to ensure critical path is clear
  if (document.readyState === 'complete') {
    setTimeout(initProjectSequencer, 800);
  } else {
    window.addEventListener('load', () => setTimeout(initProjectSequencer, 800));
  }

  // --- Subtle Parallax on Carousel Images ---
  const initParallax = () => {
    const carouselWrappers = document.querySelectorAll('.project-carousel-wrapper');
    if (!carouselWrappers.length) return;

    const PARALLAX_STRENGTH = 0;
    const visibleWrappers = new Set();
    const mediaCache = new Map();

    // Use IntersectionObserver to only track carousels in viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visibleWrappers.add(entry.target);
          if (!mediaCache.has(entry.target)) {
            mediaCache.set(entry.target, entry.target.querySelectorAll('.embla__slide img, .embla__slide .unicorn-scene canvas'));
          }
        } else {
          visibleWrappers.delete(entry.target);
        }
      });
    }, { threshold: 0 });

    carouselWrappers.forEach(wrapper => observer.observe(wrapper));

    const updateParallax = () => {
      const viewportHeight = window.innerHeight;
      const viewportCenter = viewportHeight / 2;

      visibleWrappers.forEach(wrapper => {
        if (wrapper.dataset.disableParallax === 'true') return;

        const rect = wrapper.getBoundingClientRect();

        // Element center relative to viewport
        const elementCenter = rect.top + rect.height / 2;
        const progress = (elementCenter - viewportCenter) / viewportHeight;
        const clampedProgress = Math.max(-1, Math.min(1, progress));
        const parallaxY = clampedProgress * PARALLAX_STRENGTH;

        const media = mediaCache.get(wrapper);
        if (media) {
          media.forEach(el => {
            el.style.setProperty('--parallax-y', `${parallaxY}%`);
          });
        }
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateParallax();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateParallax();
  };

  initParallax();

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
