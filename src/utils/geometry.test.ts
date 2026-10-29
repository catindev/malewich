import { describe, expect, it } from 'vitest';
import { applyMatrix, invertMatrix, normalizeRect, rotationMatrix } from './geometry';

describe('geometry', () => {
  it('inverts affine transformations', () => {
    const matrix = rotationMatrix(37, 40, 80);
    const point = { x: 125, y: -30 };
    const transformed = applyMatrix(matrix, point);
    const restored = applyMatrix(invertMatrix(matrix), transformed);
    expect(restored.x).toBeCloseTo(point.x);
    expect(restored.y).toBeCloseTo(point.y);
  });

  it('normalizes rectangles drawn in any direction', () => {
    expect(normalizeRect({ x: 100, y: 80 }, { x: 20, y: 10 })).toEqual({
      x: 20, y: 10, width: 80, height: 70,
    });
  });
});
