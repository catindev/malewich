import { describe, expect, it } from 'vitest';
import { createNode } from './document';
import { constrainedEndpoint, linearEndpoints, linearNodePatch, linearSegments, parametricShapePath } from './shapes';
import type { ArrowNode, LineNode, PolygonNode, StarNode } from '../types';
import { createEmptyDocument } from '../data/defaultDocument';
import { isDesignDocument } from './storage';

describe('parametric shapes', () => {
  it('stores a line as endpoints with length, angle and zero height', () => {
    const patch = linearNodePatch({ x: 10, y: 20 }, { x: 210, y: 20 });
    expect(patch).toMatchObject({ x: 10, y: 20, width: 200, height: 0, rotation: 0 });
    const line = { ...(createNode('line', 0, 0) as LineNode), ...patch };
    expect(linearEndpoints(line)).toEqual({ start: { x: 10, y: 20 }, end: { x: 210, y: 20 } });
    const rotated = { ...line, ...linearNodePatch({ x: 10, y: 20 }, { x: 10, y: 120 }) };
    const rotatedEndpoints = linearEndpoints(rotated);
    expect(rotatedEndpoints.start.x).toBeCloseTo(10);
    expect(rotatedEndpoints.start.y).toBeCloseTo(20);
    expect(rotatedEndpoints.end.x).toBeCloseTo(10);
    expect(rotatedEndpoints.end.y).toBeCloseTo(120);
    const constrained = constrainedEndpoint({ x: 0, y: 0 }, { x: 100, y: 20 }, true);
    expect(constrained.x).toBeCloseTo(101.98039);
    expect(constrained.y).toBe(0);
  });

  it('derives independent start and end arrowheads from the shaft', () => {
    const arrow = {
      ...(createNode('arrow', 10, 20, 200, 0) as ArrowNode),
      startArrowhead: true,
      endArrowhead: true,
      strokeWidth: 10,
    };
    const segments = linearSegments(arrow);
    expect(segments).toHaveLength(5);
    expect(segments[0]).toEqual([{ x: 10, y: 20 }, { x: 210, y: 20 }]);
    expect(segments.slice(1).flat().some((point) => point.y !== 20)).toBe(true);
  });

  it('preserves every primitive through JSON storage validation', () => {
    const nodes = [
      createNode('line', 0, 10, 200, 0),
      createNode('arrow', 0, 40, 200, 0),
      createNode('polygon', 250, 0, 100, 100),
      createNode('star', 400, 0, 100, 100),
    ];
    const doc = { ...createEmptyDocument('Shapes'), nodes };
    const restored: unknown = JSON.parse(JSON.stringify(doc));
    expect(isDesignDocument(restored)).toBe(true);
    expect(restored).toEqual(doc);
  });

  it('recomputes polygon sides and star rays with inner radius after resize', () => {
    const polygon = { ...(createNode('polygon', 0, 0, 100, 100) as PolygonNode), sides: 5 };
    const polygonPath = parametricShapePath(polygon);
    expect((polygonPath.match(/L/g) ?? [])).toHaveLength(4);
    expect(polygonPath).toContain('M50 0');

    const star = {
      ...(createNode('star', 0, 0, 200, 100) as StarNode),
      points: 6,
      innerRadius: 0.5,
    };
    const starPath = parametricShapePath(star);
    expect((starPath.match(/L/g) ?? [])).toHaveLength(11);
    expect(starPath).toContain('M100 0');
    expect(starPath).toContain('L125 28.3494');
  });
});
