import { useEffect, useMemo, useState } from 'react';
import { WebGLScene } from './components/WebGLScene';
import { ScrollProvider } from './context/ScrollContext';
import { ScrollSyncManager } from './managers/ScrollSyncManager';

export interface AppProps {
  scrollWrapper?: string;
  scrollContent?: string;
  enableLenis?: boolean;
  enableWebgl?: boolean;
}

export function App({
  scrollWrapper = '#home-view',
  scrollContent = '#home-view .portfolio-wrapper',
  enableLenis = true,
  enableWebgl = true,
}: AppProps) {
  const [active, setActive] = useState(false);

  const scrollManager = useMemo(() => {
    const wrapper = document.querySelector<HTMLElement>(scrollWrapper);
    const content = document.querySelector<HTMLElement>(scrollContent);
    if (!wrapper || !content) return null;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return new ScrollSyncManager({
      wrapper,
      content,
      lerp: 0.08,
      enabled: enableLenis && !reducedMotion,
    });
  }, [scrollWrapper, scrollContent, enableLenis]);

  useEffect(() => {
    setActive(true);

    if (enableWebgl) {
      document.body.classList.add('folio-webgl-images-active');
    }
    if (enableLenis && scrollManager?.lenis) {
      document.body.classList.add('folio-lenis-active');
      window.folioScroll = {
        scrollTo: (target, options) => scrollManager.scrollTo(target, options),
      };
    }

    const wrapper = document.querySelector<HTMLElement>(scrollWrapper);
    const onScroll = () => window.dispatchEvent(new CustomEvent('folio:scroll'));
    wrapper?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      wrapper?.removeEventListener('scroll', onScroll);
      document.body.classList.remove('folio-webgl-images-active', 'folio-lenis-active');
      delete window.folioScroll;
      scrollManager?.destroy();
    };
  }, [scrollManager, scrollWrapper, enableWebgl, enableLenis]);

  if (!active) return null;

  return (
    <ScrollProvider manager={scrollManager}>
      {enableWebgl ? <WebGLScene /> : null}
    </ScrollProvider>
  );
}
