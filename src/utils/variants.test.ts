import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode, RectangleNode } from '../types';
import { createComponent, createInstance, createVariant, setVariant, syncComponents } from './components';
import { createNode } from './document';

describe('component variants', () => {
  it('switches variants while preserving instance identity and overrides', () => {
    const frame = { ...(createNode('frame', 0, 0, 300, 200) as FrameNode), id: 'frame', name: 'Button' };
    const child = { ...(createNode('rectangle', 20, 30, 100, 80) as RectangleNode), id: 'child', parentId: 'frame' };
    let doc = createComponent({ ...createEmptyDocument(), nodes: [frame, child] }, 'frame');
    const variant = createVariant(doc, 'frame')!;
    doc = variant.doc;
    const instance = createInstance(doc, 'frame')!;
    doc = instance.doc;
    const rootId = instance.instanceId;
    const instanceChild = doc.nodes.find((node) => node.parentId === rootId)!;
    instanceChild.x = 55;
    instanceChild.overrides = { x: 55 };

    doc = setVariant(doc, rootId, variant.variantId);
    const switchedRoot = doc.nodes.find((node) => node.id === rootId)!;
    const switchedChild = doc.nodes.find((node) => node.id === instanceChild.id)!;
    expect(switchedRoot).toMatchObject({ x: 40, y: 40, component: { rootId: variant.variantId } });
    expect(switchedChild.x).toBe(55);
    expect(switchedChild.overrides).toEqual({ x: 55 });

    const variantChild = doc.nodes.find((node) => node.parentId === variant.variantId)!;
    if (variantChild.type === 'rectangle') variantChild.fill = '#123456';
    doc = syncComponents(doc);
    expect(doc.nodes.find((node) => node.id === instanceChild.id)).toMatchObject({ fill: '#123456', x: 55 });
  });
});
