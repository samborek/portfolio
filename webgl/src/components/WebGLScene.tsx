import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { OrthographicCamera as OrthoCam } from 'three';
import { WebGLImagePlane } from './WebGLImagePlane';
import { collectDomImages, observeDomImages } from '../managers/DomImageRegistry';
import { useMouseVelocity } from '../hooks/useMouseVelocity';
import { useViewportImages } from '../hooks/useViewportImages';
import { updateOrthoCamera } from '../utils/domRect';
import { isCoarsePointer } from '../utils/device';

function ViewportCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    updateOrthoCamera(camera as OrthoCam, size.width, size.height);
  }, [camera, size.width, size.height]);
  return null;
}

function ImagePlanes() {
  const mouse = useMouseVelocity();
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const visibleImages = useViewportImages(images);
  const touch = useMemo(() => isCoarsePointer(), []);

  const refresh = useCallback(() => {
    setImages(collectDomImages().map((r) => r.element));
  }, []);

  useEffect(() => {
    refresh();
    const root = document.getElementById('home-view') ?? document.body;
    const observer = observeDomImages(root, refresh);

    window.addEventListener('folio:webgl-images-changed', refresh);
    window.addEventListener('folio:scroll', refresh);
    window.addEventListener('resize', refresh);
    document.addEventListener('themechange', refresh);

    const themeObserver = new MutationObserver(refresh);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('folio:webgl-images-changed', refresh);
      window.removeEventListener('folio:scroll', refresh);
      window.removeEventListener('resize', refresh);
      document.removeEventListener('themechange', refresh);
    };
  }, [refresh]);

  return (
    <>
      {visibleImages.map((img) => (
        <WebGLImagePlane
          key={img.dataset.webglId ?? img.src}
          image={img}
          mouse={mouse}
          distortion={touch ? 0.8 : 1}
          rgbShift={touch ? 0.003 : 0.004}
          syncLerp={touch ? 0.2 : 0.14}
        />
      ))}
    </>
  );
}

export interface WebGLSceneProps {
  dpr?: number;
}

/**
 * Fullscreen fixed R3F canvas — single renderer, single RAF loop.
 * Sits above the page; DOM images remain the source of truth for layout/SEO.
 */
export function WebGLScene({ dpr }: WebGLSceneProps) {
  const resolvedDpr = useMemo(() => {
    if (dpr != null) return dpr;
    const cap = isCoarsePointer() ? 1 : 1.25;
    return Math.min(window.devicePixelRatio, cap);
  }, [dpr]);

  return (
    <Canvas
      className="folio-webgl-canvas"
      orthographic
      dpr={resolvedDpr}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
      }}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 20,
      }}
      eventSource={document.getElementById('home-view') ?? undefined}
      eventPrefix="client"
    >
      <ViewportCamera />
      <ImagePlanes />
    </Canvas>
  );
}
