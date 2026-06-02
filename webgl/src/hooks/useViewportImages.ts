import { useEffect, useState } from 'react';
import { isElementInViewport } from '../utils/domRect';

/**
 * Keeps only images near the viewport — avoids mounting WebGL planes for every carousel slide.
 * Uses the browser viewport (not a scroll root) so Embla horizontal slides report correctly.
 */
export function useViewportImages(
  images: HTMLImageElement[],
  rootMargin = '240px'
): HTMLImageElement[] {
  const [visible, setVisible] = useState<HTMLImageElement[]>(() =>
    images.filter((img) => isElementInViewport(img, 240))
  );

  useEffect(() => {
    if (!images.length) {
      setVisible([]);
      return;
    }

    const seen = new Set(
      images.filter((img) => isElementInViewport(img, 240))
    );

    const sync = () => {
      setVisible(images.filter((img) => seen.has(img)));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const img = entry.target as HTMLImageElement;
          if (entry.isIntersecting) seen.add(img);
          else seen.delete(img);
        });
        sync();
      },
      { root: null, rootMargin, threshold: 0.01 }
    );

    images.forEach((img) => observer.observe(img));
    sync();
    return () => observer.disconnect();
  }, [images, rootMargin]);

  return visible;
}
