import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode, RectangleNode } from '../types';
import { createComponent, createInstance, detachInstance, syncComponents } from './components';
import { createNode } from './document';

function setup() {
  const frame = { ...(createNode('frame', 0, 0, 300, 200) as FrameNode), id: 'frame', name: 'Card' };
  const child = { ...(createNode('rectangle', 20, 30, 100, 80) as RectangleNode), id: 'child', parentId: 'frame', name: 'Content' };
  return { ...createEmptyDocument(), nodes: [frame, child] };
}

describe('components', () => {
  it('creates a linked instance with relative geometry', () => {
    const component = createComponent(setup(), 'frame');
    const result = createInstance(component, 'frame')!;
    const root = result.doc.nodes.find((node) => node.id === result.instanceId)!;
    const child = result.doc.nodes.find((node) => node.parentId === root.id)!;
    expect(root).toMatchObject({ x: 40, y: 40, component: { role: 'instance', rootId: 'frame', sourceId: 'frame' } });
    expect(child).toMatchObject({ x: 60, y: 70 });
  });

  it('propagates main changes and preserves local overrides', () => {
    const component = createComponent(setup(), 'frame');
    const instance = createInstance(component, 'frame')!;
    const instanceRoot = instance.doc.nodes.find((node) => node.id === instance.instanceId)!;
    const instanceChild = instance.doc.nodes.find((node) => node.parentId === instanceRoot.id)!;
    if (instanceChild.type === 'rectangle') instanceChild.fill = '#111111';
    instanceChild.overrides = { fill: '#111111' };
    const mainChild = instance.doc.nodes.find((node) => node.id === 'child')!;
    if (mainChild.type === 'rectangle') mainChild.fill = '#222222';
    mainChild.name = 'Updated';
    const synced = syncComponents(instance.doc);
    const syncedChild = synced.nodes.find((node) => node.id === instanceChild.id)!;
    expect(syncedChild).toMatchObject({ fill: '#111111', name: 'Updated' });
  });

  it('reconciles children added to and removed from the main component', () => {
    const component = createComponent(setup(), 'frame');
    const instance = createInstance(component, 'frame')!;
    const added = { ...(createNode('ellipse', 150, 30, 40, 40) as RectangleNode), id: 'added', parentId: 'frame' };
    const withAdded = syncComponents({ ...instance.doc, nodes: [...instance.doc.nodes, added] });
    const root = withAdded.nodes.find((node) => node.id === instance.instanceId)!;
    expect(withAdded.nodes.filter((node) => node.parentId === root.id)).toHaveLength(2);
    const withoutChild = syncComponents({ ...withAdded, nodes: withAdded.nodes.filter((node) => node.id !== 'child') });
    expect(withoutChild.nodes.filter((node) => node.parentId === root.id)).toHaveLength(1);
  });

  it('detaches an instance hierarchy', () => {
    const component = createComponent(setup(), 'frame');
    const instance = createInstance(component, 'frame')!;
    const detached = detachInstance(instance.doc, instance.instanceId);
    expect(detached.nodes.filter((node) => node.component?.role === 'instance')).toHaveLength(0);
  });
});
