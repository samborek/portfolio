export function lerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha;
}

export function lerpVec2(
  current: { x: number; y: number },
  target: { x: number; y: number },
  alpha: number
): void {
  current.x = lerp(current.x, target.x, alpha);
  current.y = lerp(current.y, target.y, alpha);
}
