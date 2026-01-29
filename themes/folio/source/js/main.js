document.addEventListener('DOMContentLoaded', () => {
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

    const embla = EmblaCarousel(viewportNode, {
      loop: false,
      align: 'start',
      dragFree: false,
      containScroll: 'trimSnaps'
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

    window.addEventListener('resize', () => embla.reInit());

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
  const MIN_SKELETON_TIME = 600; // Consistent timing at 600ms

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
  const sections = document.querySelectorAll('section[id^="project-"], #experience, #clients, #connect');
  const navLinks = document.querySelectorAll('.project-link-item, .footer-link-item');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // Find the link that matches this section
      const links = document.querySelectorAll(`a[href="#${entry.target.id}"]`);

      if (entry.isIntersecting) {
        // When a section enters the specified zone, highlight it
        navLinks.forEach(l => l.classList.remove('active'));
        links.forEach(link => {
          if (link.classList.contains('project-link-item') || link.classList.contains('footer-link-item')) {
            link.classList.add('active');
          }
        });
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px' });
  sections.forEach(s => observer.observe(s));

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
});
