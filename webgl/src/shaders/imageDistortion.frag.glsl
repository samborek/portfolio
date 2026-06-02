precision highp float;

uniform sampler2D uMap;
uniform float uTime;
uniform float uHover;
uniform vec2 uMouse;
uniform vec2 uMouseVel;
uniform vec2 uResolution;
uniform float uDistortion;
uniform float uRgbShift;

varying vec2 vUv;

// Cheap 2D value noise for liquid UV displacement
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 uv = vUv;

  // Local cursor in 0–1 plane space
  vec2 toMouse = uv - uMouse;
  float mouseDist = length(toMouse);
  float influence = smoothstep(0.85, 0.0, mouseDist) * uHover;

  // Liquid ripple + drift (stronger so the effect reads on project shots)
  float ripple = sin(mouseDist * 16.0 - uTime * 2.4) * 0.024 * influence;
  float n = noise(uv * 4.0 + uTime * 0.18 + uMouseVel * 2.5);
  vec2 displacement = normalize(toMouse + 1e-5) * ripple;
  displacement += (n - 0.5) * 0.016 * uHover * uDistortion;
  displacement += uMouseVel * 0.07 * influence;

  vec2 distortedUv = uv + displacement * uDistortion;

  // Subtle RGB shift near cursor
  float chroma = uRgbShift * influence;
  vec2 rUv = distortedUv + normalize(toMouse + 1e-5) * chroma;
  vec2 bUv = distortedUv - normalize(toMouse + 1e-5) * chroma;

  vec4 color;
  color.r = texture2D(uMap, rUv).r;
  color.g = texture2D(uMap, distortedUv).g;
  color.b = texture2D(uMap, bUv).b;
  color.a = texture2D(uMap, distortedUv).a;

  gl_FragColor = color;
}
