import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode, RectangleNode } from '../types';
import { applyAutoLayout, createAutoLayout } from './autoLayout';
import { createNode } from './document';

function childLayout(horizontal: 'fixed' | 'fill' = 'fixed', vertical: 'fixed' | 'fill' = 'fixed', absolute = false) {
  return { horizontal, vertical, absolute };
}

function setup() {
  const frame = {
    ...(createNode('frame', 0, 0, 500, 200) as FrameNode), id: 'frame',
    autoLayout: { ...createAutoLayout('horizontal'), gap: 10, padding: { top: 10, right: 10, bottom: 10, left: 10 } },
  };
  const fixed = { ...(createNode('rectangle', 0, 0, 100, 50) as RectangleNode), id: 'fixed', parentId: 'frame' };
  const fill = {
    ...(createNode('rectangle', 0, 0, 100, 50) as RectangleNode), id: 'fill', parentId: 'frame',
    layout: childLayout('fill', 'fill'),
  };
  return { ...createEmptyDocument(), nodes: [frame, fixed, fill] };
}

describe('advanced Auto Layout', () => {
  it('distributes remaining main-axis space to Fill children', () => {
    const result = applyAutoLayout(setup());
    const fixed = result.nodes.find((node) => node.id === 'fixed')!;
    const fill = result.nodes.find((node) => node.id === 'fill')!;
    expect(fixed).toMatchObject({ x: 10, width: 100, height: 50 });
    expect(fill).toMatchObject({ x: 120, width: 370, height: 180 });
  });

  it('respects min/max constraints', () => {
    const doc = setup();
    const fill = doc.nodes.find((node) => node.id === 'fill')!;
    fill.layout = { ...fill.layout!, maxWidth: 200, minHeight: 40, maxHeight: 100 };
    const result = applyAutoLayout(doc);
    expect(result.nodes.find((node) => node.id === 'fill')).toMatchObject({ width: 200, height: 100 });
  });

  it('keeps absolute children outside the flow', () => {
    const doc = setup();
    const absolute = {
      ...(createNode('rectangle', 400, 20, 50, 50) as RectangleNode), id: 'absolute', parentId: 'frame',
      layout: childLayout('fixed', 'fixed', true),
    };
    doc.nodes.push(absolute);
    const result = applyAutoLayout(doc);
    expect(result.nodes.find((node) => node.id === 'absolute')).toMatchObject({ x: 400, y: 20 });
    expect(result.nodes.find((node) => node.id === 'fill')?.width).toBe(370);
  });

  it('supports per-axis Hug and nested Fill/Hug dependencies', () => {
    const doc = setup();
    const frame = doc.nodes.find((node) => node.id === 'frame') as FrameNode;
    frame.autoLayout = { ...frame.autoLayout!, heightMode: 'hug' };
    const result = applyAutoLayout(doc);
    expect(result.nodes.find((node) => node.id === 'frame')?.height).toBe(70);

    const nested = {
      ...(createNode('frame', 0, 0, 100, 50) as FrameNode), id: 'nested', parentId: 'frame',
      autoLayout: { ...createAutoLayout('vertical'), hug: true },
      layout: childLayout('fill', 'fixed'),
    };
    const nestedChild = { ...(createNode('rectangle', 0, 0, 20, 30) as RectangleNode), id: 'nestedChild', parentId: 'nested' };
    const huggingDoc = { ...doc, nodes: [...doc.nodes, nested, nestedChild] };
    const resolved = applyAutoLayout(huggingDoc);
    expect(resolved.nodes.find((node) => node.id === 'nested')?.width).toBeGreaterThan(100);
    expect(resolved.nodes.find((node) => node.id === 'nested')?.height).toBe(30);
  });

  it('matches bordered Figma layout and centers overflowing children', () => {
    const frame = {
      ...(createNode('frame', 0, 0, 160, 48) as FrameNode), id: 'bordered',
      stroke: '#cccccc', strokeWidth: 1, strokeAlign: 'inside' as const,
      autoLayout: {
        ...createAutoLayout('horizontal'), gap: 0, justify: 'space-between' as const,
        align: 'center' as const, padding: { top: 16, right: 16, bottom: 16, left: 16 },
      },
    };
    const text = { ...(createNode('rectangle', 0, 0, 65, 22) as RectangleNode), id: 'label', parentId: 'bordered' };
    const icon = { ...(createNode('rectangle', 0, 0, 16, 16) as RectangleNode), id: 'icon', parentId: 'bordered' };
    const result = applyAutoLayout({ ...createEmptyDocument(), nodes: [frame, text, icon] });
    expect(result.nodes.find((node) => node.id === 'label')).toMatchObject({ x: 17, y: 13 });
    expect(result.nodes.find((node) => node.id === 'icon')).toMatchObject({ x: 127, y: 16 });
  });

  it('allows zero-sized Fill spacers', () => {
    const frame = {
      ...(createNode('frame', 0, 0, 100, 40) as FrameNode), id: 'frame-zero',
      autoLayout: { ...createAutoLayout('vertical'), gap: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    };
    const first = { ...(createNode('rectangle', 0, 0, 20, 20) as RectangleNode), id: 'first', parentId: 'frame-zero' };
    const spacer = {
      ...(createNode('frame', 0, 20, 20, 10) as FrameNode), id: 'spacer', parentId: 'frame-zero',
      layout: childLayout('fixed', 'fill'),
    };
    const last = { ...(createNode('rectangle', 0, 30, 20, 20) as RectangleNode), id: 'last', parentId: 'frame-zero' };
    const result = applyAutoLayout({ ...createEmptyDocument(), nodes: [frame, first, spacer, last] });
    expect(result.nodes.find((node) => node.id === 'spacer')?.height).toBe(0);
    expect(result.nodes.find((node) => node.id === 'last')?.y).toBe(20);
  });

  it('does not reflow frames outside the requested scope', () => {
    const doc = setup();
    const other = {
      ...(createNode('frame', 600, 0, 200, 100) as FrameNode), id: 'other',
      autoLayout: createAutoLayout('horizontal'),
    };
    const otherChild = { ...(createNode('rectangle', 601, 2, 30, 30) as RectangleNode), id: 'other-child', parentId: 'other' };
    const scoped = applyAutoLayout({ ...doc, nodes: [...doc.nodes, other, otherChild] }, new Set(['frame']));
    expect(scoped.nodes.find((node) => node.id === 'fixed')?.x).toBe(10);
    expect(scoped.nodes.find((node) => node.id === 'other-child')).toMatchObject({ x: 601, y: 2 });
  });
});
