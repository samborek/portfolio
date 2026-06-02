export const WEBGL_IMAGE_SELECTOR = 'img[data-webgl-image]';

export interface RegisteredImage {
  id: string;
  element: HTMLImageElement;
}

let idCounter = 0;

function isRenderableImage(img: HTMLImageElement): boolean {
  if (!img.isConnected || !img.src) return false;
  const style = window.getComputedStyle(img);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (img.closest('[data-webgl-disabled]')) return false;
  return true;
}

/**
 * Discovers semantic DOM images and returns only visible, loaded candidates.
 * Re-scans on demand — carousel slides and theme toggles change visibility.
 */
export function collectDomImages(root: ParentNode = document): RegisteredImage[] {
  const nodes = root.querySelectorAll<HTMLImageElement>(WEBGL_IMAGE_SELECTOR);
  const seen = new Set<HTMLImageElement>();
  const result: RegisteredImage[] = [];

  nodes.forEach((el) => {
    if (!isRenderableImage(el) || seen.has(el)) return;
    seen.add(el);
    result.push({
      id: el.dataset.webglId || `webgl-img-${++idCounter}`,
      element: el,
    });
    if (!el.dataset.webglId) el.dataset.webglId = result[result.length - 1].id;
  });

  return result;
}

export function observeDomImages(
  root: ParentNode,
  onChange: () => void
): MutationObserver {
  const observer = new MutationObserver(() => onChange());
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'class', 'style', 'data-theme'],
  });
  return observer;
}
