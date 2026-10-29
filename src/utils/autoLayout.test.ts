import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode, RectangleNode } from '../types';
import { applyAutoLayout, createAutoLayout } from './autoLayout';
import { createNode } from './document';

function setup(direction: 'horizontal' | 'vertical') {
  const frame = {
    ...(createNode('frame', 10, 20, 300, 200) as FrameNode), id: 'frame',
    autoLayout: { ...createAutoLayout(direction), gap: 10, padding: { top: 5, right: 8, bottom: 5, left: 8 } },
  };
  const a = { ...(createNode('rectangle', 0, 0, 50, 40) as RectangleNode), id: 'a', parentId: 'frame' };
  const b = { ...(createNode('rectangle', 0, 0, 70, 60) as RectangleNode), id: 'b', parentId: 'frame' };
  return { ...createEmptyDocument(), nodes: [frame, a, b] };
}

describe('Auto Layout', () => {
  it('lays out horizontal children with gap and padding', () => {
    const result = applyAutoLayout(setup('horizontal'));
    const [a, b] = result.nodes.filter((node) => node.type === 'rectangle');
    expect(a).toMatchObject({ x: 18, y: 25 });
    expect(b).toMatchObject({ x: 78, y: 25 });
  });

  it('supports cross-axis center and main-axis space-between', () => {
    const doc = setup('horizontal');
    const frame = doc.nodes[0] as FrameNode;
    frame.autoLayout = { ...frame.autoLayout!, align: 'center', justify: 'space-between' };
    const result = applyAutoLayout(doc);
    const [a, b] = result.nodes.filter((node) => node.type === 'rectangle');
    expect(a).toMatchObject({ x: 18, y: 100 });
    expect(b).toMatchObject({ x: 232, y: 90 });
  });

  it('hugs content along the layout direction', () => {
    const doc = setup('vertical');
    const frame = doc.nodes[0] as FrameNode;
    frame.autoLayout = { ...frame.autoLayout!, hug: true };
    const result = applyAutoLayout(doc);
    const updated = result.nodes.find((node) => node.id === 'frame')!;
    expect(updated.height).toBe(120);
    expect(updated.width).toBe(300);
  });

  it('lays out nested frames before the parent', () => {
    const doc = setup('vertical');
    const inner = {
      ...(createNode('frame', 0, 0, 50, 50) as FrameNode), id: 'inner', parentId: 'frame',
      autoLayout: { ...createAutoLayout('vertical'), hug: true, gap: 0 },
    };
    const child = { ...(createNode('rectangle', 0, 0, 20, 30) as RectangleNode), id: 'child', parentId: 'inner' };
    doc.nodes.push(inner, child);
    const result = applyAutoLayout(doc);
    expect(result.nodes.find((node) => node.id === 'inner')?.height).toBe(30);
    expect(result.nodes.find((node) => node.id === 'child')).toMatchObject({ x: result.nodes.find((node) => node.id === 'inner')!.x, y: result.nodes.find((node) => node.id === 'inner')!.y });
  });
});
