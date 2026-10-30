import { describe, expect, it } from 'vitest';
import type { EditorNode, FrameNode, RectangleNode } from '../types';
import { createNode } from './document';
import { flattenLayerRows } from './layers';

function fixtures() {
  const first = { ...(createNode('frame', 0, 0, 100, 100) as FrameNode), id: 'first', name: 'First' };
  const child = { ...(createNode('rectangle', 0, 0, 10, 10) as RectangleNode), id: 'child', parentId: 'first' };
  const second = { ...(createNode('rectangle', 0, 0, 10, 10) as RectangleNode), id: 'second' };
  const nodes: EditorNode[] = [first, child, second];
  const childrenByParent = new Map<string | null, EditorNode[]>();
  nodes.forEach((node) => {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  });
  return { childrenByParent };
}

describe('flattenLayerRows', () => {
  it('keeps top-first order and only walks expanded branches', () => {
    const { childrenByParent } = fixtures();
    expect(flattenLayerRows(childrenByParent, new Set()).map((row) => [row.node.id, row.depth, row.hasChildren])).toEqual([
      ['second', 0, false],
      ['first', 0, true],
      ['child', 1, false],
    ]);
    expect(flattenLayerRows(childrenByParent, new Set(['first'])).map((row) => row.node.id)).toEqual(['second', 'first']);
  });
});
