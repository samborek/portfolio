import { useEffect, useRef } from 'react';

export interface MouseState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  normalizedX: number;
  normalizedY: number;
  /** Finger/mouse button is down — drives ripple on touch screens */
  pressing: boolean;
  /** Device has real hover (mouse/trackpad) */
  hasHover: boolean;
}

const MAX_VELOCITY = 0.08;

/**
 * Tracks pointer position + velocity for shader uniforms.
 * Works for mouse, pen, and touch (touch uses pressing while finger is down).
 */
export function useMouseVelocity() {
  const state = useRef<MouseState>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
    pressing: false,
    hasHover: typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches,
  });
  const last = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    const sample = (clientX: number, clientY: number) => {
      const now = performance.now();
      const dt = Math.max(now - last.current.t, 1);
      const dx = clientX - last.current.x;
      const dy = clientY - last.current.y;

      state.current.x = clientX;
      state.current.y = clientY;
      state.current.normalizedX = clientX / window.innerWidth;
      state.current.normalizedY = clientY / window.innerHeight;

      const rawVx = (dx / dt) * 16;
      const rawVy = (dy / dt) * 16;
      state.current.vx += (Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rawVx)) - state.current.vx) * 0.2;
      state.current.vy += (Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, rawVy)) - state.current.vy) * 0.2;

      last.current = { x: clientX, y: clientY, t: now };
    };

    const onPointerDown = (e: PointerEvent) => {
      state.current.pressing = true;
      sample(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      sample(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      state.current.pressing = false;
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return state;
}
