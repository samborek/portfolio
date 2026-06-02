import type { OrthographicCamera } from 'three';

export interface DomRectSync {
  /** Center X in screen pixels (top-left origin) */
  x: number;
  /** Center Y in screen pixels (top-left origin) */
  y: number;
  width: number;
  height: number;
}

/**
 * Maps a DOM element's getBoundingClientRect() into orthographic world units.
 * Camera uses (0,0) top-left, Y down — matching the DOM coordinate system.
 */
export function domRectToWorld(
  rect: DOMRect,
  viewport: { width: number; height: number }
): DomRectSync {
  return {
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.5,
    width: rect.width,
    height: rect.height,
  };
}

export function updateOrthoCamera(
  camera: OrthographicCamera,
  width: number,
  height: number
): void {
  camera.left = 0;
  camera.right = width;
  camera.top = 0;
  camera.bottom = height;
  camera.near = -100;
  camera.far = 100;
  camera.position.set(0, 0, 10);
  camera.updateProjectionMatrix();
}

/**
 * Layout visibility for DOM→WebGL sync.
 * Ignores opacity: WebGL targets are intentionally opacity:0 in CSS while planes render them.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

/** True when the element intersects the viewport (with optional margin). */
export function isElementInViewport(el: HTMLElement, marginPx = 120): boolean {
  if (!isElementVisible(el)) return false;
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return (
    rect.bottom >= -marginPx &&
    rect.top <= vh + marginPx &&
    rect.right >= -marginPx &&
    rect.left <= vw + marginPx
  );
}
