import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export interface ScrollSyncOptions {
  wrapper: HTMLElement;
  content: HTMLElement;
  /** Smooth scroll lerp (0–1). Lower = more inertia. */
  lerp?: number;
  enabled?: boolean;
}

/**
 * Lenis smooth scroll + GSAP ticker bridge.
 * Exposes virtual scroll position for WebGL DOM sync (getBoundingClientRect
 * already reflects transformed scroll; Lenis updates the wrapper scrollTop).
 */
export class ScrollSyncManager {
  readonly lenis: Lenis | null;
  private rafId = 0;
  private enabled: boolean;

  constructor(options: ScrollSyncOptions) {
    this.enabled = options.enabled !== false;

    if (!this.enabled) {
      this.lenis = null;
      return;
    }

    this.lenis = new Lenis({
      wrapper: options.wrapper,
      content: options.content,
      lerp: options.lerp ?? 0.08,
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: 1.1,
    });

    this.lenis.on('scroll', () => {
      window.dispatchEvent(new CustomEvent('folio:scroll'));
    });

    const tick = (time: number) => {
      this.lenis?.raf(time);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  scrollTo(target: number | HTMLElement, options?: { duration?: number }) {
    if (!this.lenis) return;
    this.lenis.scrollTo(target, {
      duration: options?.duration ?? 1.2,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.lenis?.destroy();
  }
}
