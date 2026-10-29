import type { Bounds, Point } from '../types';

export interface SnapGuide {
  axis: 'x' | 'y';
  value: number;
  start: number;
  end: number;
}

export interface SnapResult {
  delta: Point;
  guides: SnapGuide[];
}

interface AxisMatch {
  difference: number;
  value: number;
  candidate: Bounds;
}

function candidates(bounds: Bounds, axis: 'x' | 'y'): number[] {
  return axis === 'x'
    ? [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width]
    : [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];
}

function snapAxis(
  original: Bounds,
  delta: Point,
  candidatesBounds: Bounds[],
  axis: 'x' | 'y',
  threshold: number,
): AxisMatch | null {
  const moved = {
    ...original,
    x: original.x + delta.x,
    y: original.y + delta.y,
  };
  const movingValues = candidates(moved, axis);
  let best: (AxisMatch & { distance: number }) | null = null;
  candidatesBounds.forEach((candidate) => {
    const targetValues = candidates(candidate, axis);
    movingValues.forEach((movingValue) => {
      targetValues.forEach((targetValue) => {
        const difference = targetValue - movingValue;
        const distance = Math.abs(difference);
        if (distance <= threshold && (!best || distance < best.distance)) {
          best = { difference, value: targetValue, candidate, distance };
        }
      });
    });
  });
  return best;
}

export function snapMovingBounds(
  original: Bounds,
  initialDelta: Point,
  candidateBounds: Bounds[],
  threshold: number,
): SnapResult {
  const delta = { ...initialDelta };
  const guides: SnapGuide[] = [];
  const xMatch = snapAxis(original, delta, candidateBounds, 'x', threshold);
  if (xMatch) delta.x += xMatch.difference;
  const yMatch = snapAxis(original, delta, candidateBounds, 'y', threshold);
  if (yMatch) delta.y += yMatch.difference;

  const moved = { ...original, x: original.x + delta.x, y: original.y + delta.y };
  if (xMatch) {
    guides.push({
      axis: 'x', value: xMatch.value,
      start: Math.min(moved.y, xMatch.candidate.y),
      end: Math.max(moved.y + moved.height, xMatch.candidate.y + xMatch.candidate.height),
    });
  }
  if (yMatch) {
    guides.push({
      axis: 'y', value: yMatch.value,
      start: Math.min(moved.x, yMatch.candidate.x),
      end: Math.max(moved.x + moved.width, yMatch.candidate.x + yMatch.candidate.width),
    });
  }
  return { delta, guides };
}

export interface ResizeSnapResult {
  bounds: Bounds;
  guides: SnapGuide[];
}

function nearestValue(value: number, values: number[], threshold: number) {
  return values.reduce<{ difference: number; distance: number } | null>((best, target) => {
    const difference = target - value;
    const distance = Math.abs(difference);
    return distance <= threshold && (!best || distance < best.distance) ? { difference, distance } : best;
  }, null);
}

export function snapResizingBounds(
  initialBounds: Bounds,
  handle: string,
  candidateBounds: Bounds[],
  threshold: number,
): ResizeSnapResult {
  const bounds = { ...initialBounds };
  const guides: SnapGuide[] = [];
  const horizontal = handle.includes('e') ? 'e' : handle.includes('w') ? 'w' : null;
  const vertical = handle.includes('s') ? 's' : handle.includes('n') ? 'n' : null;
  if (horizontal) {
    const movingValue = horizontal === 'e' ? bounds.x + bounds.width : bounds.x;
    const targets = candidateBounds.flatMap((candidate) => candidates(candidate, 'x'));
    const match = nearestValue(movingValue, targets, threshold);
    if (match) {
      if (horizontal === 'e') bounds.width += match.difference;
      else {
        bounds.x += match.difference;
        bounds.width -= match.difference;
      }
      const candidate = candidateBounds.find((item) => candidates(item, 'x').some((value) => value === movingValue + match.difference))!;
      guides.push({
        axis: 'x', value: movingValue + match.difference,
        start: Math.min(bounds.y, candidate.y),
        end: Math.max(bounds.y + bounds.height, candidate.y + candidate.height),
      });
    }
  }
  if (vertical) {
    const movingValue = vertical === 's' ? bounds.y + bounds.height : bounds.y;
    const targets = candidateBounds.flatMap((candidate) => candidates(candidate, 'y'));
    const match = nearestValue(movingValue, targets, threshold);
    if (match) {
      if (vertical === 's') bounds.height += match.difference;
      else {
        bounds.y += match.difference;
        bounds.height -= match.difference;
      }
      const candidate = candidateBounds.find((item) => candidates(item, 'y').some((value) => value === movingValue + match.difference))!;
      guides.push({
        axis: 'y', value: movingValue + match.difference,
        start: Math.min(bounds.x, candidate.x),
        end: Math.max(bounds.x + bounds.width, candidate.x + candidate.width),
      });
    }
  }
  return { bounds, guides };
}
