import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { RectangleNode } from '../types';
import { createNode, getNode } from './document';
import { alignSelection, resizeSelection, rotateSelection } from './groupTransform';

function rectangle(id: string, x: number, y: number, width = 100, height = 100): RectangleNode {
  return { ...(createNode('rectangle', x, y, width, height) as RectangleNode), id, name: id };
}

function documentWith(nodes: RectangleNode[]) {
  return { ...createEmptyDocument(), nodes };
}

describe('group transforms', () => {
  it('resizes positions and dimensions proportionally', () => {
    const doc = documentWith([rectangle('a', 0, 0), rectangle('b', 200, 0)]);
    const nodes = resizeSelection(doc, ['a', 'b'], { x: 0, y: 0, width: 300, height: 100 }, { x: 0, y: 0, width: 600, height: 200 });
    expect(getNode({ ...doc, nodes }, 'a')).toMatchObject({ x: 0, width: 200, height: 200 });
    expect(getNode({ ...doc, nodes }, 'b')).toMatchObject({ x: 400, width: 200, height: 200 });
  });

  it('rotates each object around the shared center', () => {
    const doc = documentWith([rectangle('a', 0, 0), rectangle('b', 200, 0)]);
    const nodes = rotateSelection(doc, ['a', 'b'], { x: 150, y: 50 }, 90);
    const a = getNode({ ...doc, nodes }, 'a')!;
    const b = getNode({ ...doc, nodes }, 'b')!;
    expect(a.rotation).toBe(90);
    expect(a.x).toBeCloseTo(100);
    expect(a.y).toBeCloseTo(-100);
    expect(b.x).toBeCloseTo(100);
    expect(b.y).toBeCloseTo(100);
  });

  it('aligns left edges and distributes objects evenly', () => {
    const doc = documentWith([rectangle('a', 0, 0, 50, 100), rectangle('b', 100, 20, 100, 80), rectangle('c', 400, 0, 50, 100)]);
    const aligned = alignSelection(doc, ['a', 'b', 'c'], 'left');
    expect(getNode({ ...doc, nodes: aligned }, 'a')?.x).toBe(0);
    expect(getNode({ ...doc, nodes: aligned }, 'b')?.x).toBe(0);
    const distributed = alignSelection(doc, ['a', 'b', 'c'], 'distribute-horizontal');
    expect(getNode({ ...doc, nodes: distributed }, 'b')?.x).toBe(175);
  });
});
