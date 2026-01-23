document.addEventListener('DOMContentLoaded', () => {
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
        const duration = progress > lastProgress ? 0.4 : 0.15;
        progressBar.style.setProperty('--progress-transition', `${duration}s`);
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
        if (scene.classList.contains('unicorn-btn') || scene.closest('.unicorn-btn')) {
          const canvas = scene.querySelector('canvas');
          const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting && canvas) {
                const rect = scene.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                scene.dispatchEvent(new MouseEvent('mousemove', {
                  clientX: centerX,
                  clientY: centerY,
                  bubbles: true
                }));
              }
            });
          }, { threshold: 0.1 });
          visibilityObserver.observe(scene);
        }
      });
    });
  }

  // --- Sidebar & ScrollSpy ---
  const sections = document.querySelectorAll('section[id^="project-"], #experience, #clients, #connect');
  const navLinks = document.querySelectorAll('.project-link-item');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.project-link-item[href="#${entry.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -60% 0px' });
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
});
