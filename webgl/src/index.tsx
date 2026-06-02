/**
 * Folio WebGL image system — entry for Hexo (IIFE bundle).
 */
import { createRoot } from 'react-dom/client';
import { App } from './App';

export { App } from './App';
export { WebGLScene } from './components/WebGLScene';
export { WebGLImage } from './components/WebGLImage';
export { ScrollSyncManager } from './managers/ScrollSyncManager';
export { WEBGL_IMAGE_SELECTOR, collectDomImages } from './managers/DomImageRegistry';

export interface BootOptions {
  homeOnly?: boolean;
  scrollWrapper?: string;
  scrollContent?: string;
  enableLenis?: boolean;
  enableWebgl?: boolean;
}

function isIndexPage(options: BootOptions): boolean {
  return options.homeOnly === false || document.body.classList.contains('index-page');
}

export function shouldBootLenis(options: BootOptions = {}): boolean {
  if (!isIndexPage(options)) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

export function shouldBootWebgl(options: BootOptions = {}): boolean {
  if (localStorage.getItem('folio:disable-webgl') === '1') return false;
  if (!isIndexPage(options)) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (!document.querySelector('img[data-webgl-image]')) return false;
  return true;
}

export function boot(options: BootOptions = {}): (() => void) | null {
  const enableLenis = options.enableLenis ?? shouldBootLenis(options);
  const enableWebgl = options.enableWebgl ?? shouldBootWebgl(options);

  if (!enableLenis && !enableWebgl) return null;

  let container = document.getElementById('folio-webgl-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'folio-webgl-root';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  root.render(
    <App
      enableLenis={enableLenis}
      enableWebgl={enableWebgl}
      scrollWrapper={options.scrollWrapper}
      scrollContent={options.scrollContent}
    />
  );

  return () => {
    root.unmount();
    container?.remove();
    document.body.classList.remove('folio-webgl-images-active', 'folio-lenis-active');
  };
}

if (typeof window !== 'undefined') {
  const run = () => boot();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
