import { describe, expect, it } from 'vitest';
import { snapResizingBounds } from './snapping';

describe('resize snapping', () => {
  it('snaps the moving east edge without changing the opposite edge', () => {
    const result = snapResizingBounds(
      { x: 0, y: 0, width: 196, height: 100 }, 'e',
      [{ x: 200, y: 0, width: 100, height: 100 }], 5,
    );
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 200, height: 100 });
    expect(result.guides[0]).toMatchObject({ axis: 'x', value: 200 });
  });

  it('snaps north and west handles while preserving opposite edges', () => {
    const result = snapResizingBounds(
      { x: 103, y: 102, width: 100, height: 100 }, 'nw',
      [{ x: 100, y: 100, width: 100, height: 100 }], 5,
    );
    expect(result.bounds.x).toBe(100);
    expect(result.bounds.y).toBe(100);
    expect(result.bounds.x + result.bounds.width).toBe(203);
    expect(result.bounds.y + result.bounds.height).toBe(202);
  });
});
