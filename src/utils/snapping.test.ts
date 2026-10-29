import { describe, expect, it } from 'vitest';
import { snapMovingBounds } from './snapping';

describe('smart guides', () => {
  const moving = { x: 0, y: 0, width: 100, height: 80 };

  it('snaps the nearest edge within the screen-space threshold', () => {
    const target = { x: 204, y: 0, width: 100, height: 80 };
    const result = snapMovingBounds(moving, { x: 100, y: 0 }, [target], 6);
    expect(result.delta.x).toBe(104);
    expect(result.guides[0]).toMatchObject({ axis: 'x', value: 204 });
  });

  it('aligns centers as well as edges', () => {
    const target = { x: 200, y: 194, width: 100, height: 100 };
    const result = snapMovingBounds(moving, { x: 0, y: 200 }, [target], 5);
    expect(result.delta.y).toBe(204);
    expect(result.guides[0]).toMatchObject({ axis: 'y', value: 244 });
  });

  it('does not snap outside the threshold', () => {
    const target = { x: 220, y: 220, width: 100, height: 80 };
    const result = snapMovingBounds(moving, { x: 0, y: 0 }, [target], 5);
    expect(result.delta).toEqual({ x: 0, y: 0 });
    expect(result.guides).toEqual([]);
  });
});
