import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh } from 'three';
import { createImageDistortionMaterial } from '../materials/ImageDistortionMaterial';
import { useDomSync } from '../hooks/useDomSync';
import type { MouseState } from '../hooks/useMouseVelocity';
import { isElementVisible } from '../utils/domRect';
import { lerp } from '../utils/lerp';

export interface WebGLImagePlaneProps {
  image: HTMLImageElement;
  mouse: React.RefObject<MouseState>;
  distortion?: number;
  rgbShift?: number;
  syncLerp?: number;
}

/**
 * DOM-synced image plane with liquid ripple.
 * Mouse: ripple when cursor is over the image. Touch: ripple while finger is down on the image.
 */
export function WebGLImagePlane({
  image,
  mouse,
  distortion = 1,
  rgbShift = 0.004,
  syncLerp = 0.14,
}: WebGLImagePlaneProps) {
  const meshRef = useRef<Mesh>(null);
  const hover = useRef(0);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useDomSync(meshRef, { element: image, syncLerp });

  useEffect(() => {
    const markReady = () => {
      image.closest('.image-container')?.classList.add('loaded');
    };

    const loadTexture = () => {
      if (!image.naturalWidth) return;
      const tex = new THREE.Texture(image);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      setTexture((prev) => {
        prev?.dispose();
        return tex;
      });
      markReady();
    };

    const onError = () => {
      image.closest('.image-container')?.classList.add('loaded');
    };

    if (image.complete && image.naturalWidth) loadTexture();
    else image.addEventListener('load', loadTexture);
    image.addEventListener('error', onError);

    return () => {
      image.removeEventListener('load', loadTexture);
      image.removeEventListener('error', onError);
    };
  }, [image, image.src]);

  const material = useMemo(() => {
    if (!texture) return null;
    return createImageDistortionMaterial(texture, { distortion, rgbShift });
  }, [texture, distortion, rgbShift]);

  useFrame((state) => {
    if (!material || !meshRef.current) return;

    const uniforms = material.uniforms;
    uniforms.uTime.value = state.clock.elapsedTime;

    if (!isElementVisible(image)) {
      hover.current = lerp(hover.current, 0, 0.2);
      uniforms.uHover.value = hover.current;
      return;
    }

    const rect = image.getBoundingClientRect();
    const mx = (mouse.current.x - rect.left) / Math.max(rect.width, 1);
    const my = 1 - (mouse.current.y - rect.top) / Math.max(rect.height, 1);
    const inside =
      mouse.current.x >= rect.left &&
      mouse.current.x <= rect.right &&
      mouse.current.y >= rect.top &&
      mouse.current.y <= rect.bottom;

    const active =
      inside && (mouse.current.hasHover || mouse.current.pressing);

    const rampIn = mouse.current.hasHover ? 0.18 : 0.28;
    hover.current = lerp(hover.current, active ? 1 : 0, active ? rampIn : 0.14);
    uniforms.uHover.value = hover.current;

    if (active) {
      uniforms.uMouse.value.set(
        THREE.MathUtils.clamp(mx, 0, 1),
        THREE.MathUtils.clamp(my, 0, 1)
      );
      uniforms.uMouseVel.value.set(mouse.current.vx, mouse.current.vy);
    }

    uniforms.uResolution.value.set(rect.width, rect.height);
  });

  useEffect(() => () => material?.dispose(), [material]);

  if (!material) return null;

  return (
    <mesh ref={meshRef} material={material} renderOrder={10}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
