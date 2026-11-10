/** Screen-space inset (px) from each side of the map; top is larger to clear the timer/back button */
export const EDGE_INSET = { top: 96, right: 48, bottom: 40, left: 48 } as const;

/**
 * Where to draw an off-screen guess: the point where the line from the
 * center of the map toward the guess crosses the inset edge of the map.
 * @param point Guess position in map container pixels (may be far outside)
 * @param width Map container width
 * @param height Map container height
 * @param inset Space to keep clear on each side (defaults to EDGE_INSET)
 */
export function edgePosition(
  point: { x: number; y: number },
  width: number,
  height: number,
  inset: { top: number; right: number; bottom: number; left: number } = EDGE_INSET
): { x: number; y: number } {
  const cx = width / 2;
  const cy = height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;

  // Distance from center to each inset edge in the direction of travel
  const limitX = dx > 0 ? width - inset.right - cx : cx - inset.left;
  const limitY = dy > 0 ? height - inset.bottom - cy : cy - inset.top;

  const scaleX = dx === 0 ? Infinity : limitX / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : limitY / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY, 1);

  return { x: cx + dx * scale, y: cy + dy * scale };
}
