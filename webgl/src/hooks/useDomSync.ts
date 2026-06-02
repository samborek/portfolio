import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { domRectToWorld, isElementVisible } from '../utils/domRect';
import { lerp, lerpVec2 } from '../utils/lerp';

export interface DomSyncOptions {
  element: HTMLImageElement;
  /** Position/scale smoothing — higher = snappier */
  syncLerp?: number;
  enabled?: boolean;
}

/**
 * Synchronizes a Three.js plane mesh with its DOM <img> counterpart.
 * Runs every frame (scroll, resize, Lenis, layout) via getBoundingClientRect().
 */
export function useDomSync(meshRef: React.RefObject<Mesh | null>, options: DomSyncOptions) {
  const current = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const initialized = useRef(false);
  const syncLerp = options.syncLerp ?? 0.14;

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || options.enabled === false) return;

    const el = options.element;
    if (!isElementVisible(el)) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    const rect = el.getBoundingClientRect();
    const target = domRectToWorld(rect, {
      width: window.innerWidth,
      height: window.innerHeight,
    });

    if (!initialized.current) {
      current.current = { ...target };
      initialized.current = true;
    } else {
      lerpVec2(current.current, { x: target.x, y: target.y }, syncLerp);
      current.current.width = lerp(current.current.width, target.width, syncLerp);
      current.current.height = lerp(current.current.height, target.height, syncLerp);
    }

    // DOM top-left Y → Three Y (camera top = 0, Y grows downward)
    mesh.position.set(current.current.x, current.current.y, 0);
    mesh.scale.set(current.current.width, current.current.height, 1);
  });
}
