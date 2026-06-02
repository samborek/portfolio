import * as THREE from 'three';
import vertexShader from '../shaders/imageDistortion.vert.glsl';
import fragmentShader from '../shaders/imageDistortion.frag.glsl';

export interface ImageDistortionUniforms {
  uMap: { value: THREE.Texture | null };
  uTime: { value: number };
  uHover: { value: number };
  uMouse: { value: THREE.Vector2 };
  uMouseVel: { value: THREE.Vector2 };
  uResolution: { value: THREE.Vector2 };
  uDistortion: { value: number };
  uRgbShift: { value: number };
}

export function createImageDistortionMaterial(
  texture: THREE.Texture,
  options?: { distortion?: number; rgbShift?: number }
): THREE.ShaderMaterial {
  const uniforms: ImageDistortionUniforms = {
    uMap: { value: texture },
    uTime: { value: 0 },
    uHover: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uMouseVel: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDistortion: { value: options?.distortion ?? 1 },
    uRgbShift: { value: options?.rgbShift ?? 0.003 },
  };

  return new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as THREE.ShaderMaterial['uniforms'],
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
}
