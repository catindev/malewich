import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { DesignDocument, EditorNode, FrameNode, RectangleNode } from '../types';
import { applyMatrix, multiplyMatrix, nodeMatrix } from './geometry';
import {
  createNode,
  duplicateNodes,
  getDescendantIds,
  getWorldMatrix,
  removeNodes,
  reorderNode,
} from './document';

function withNodes(nodes: EditorNode[]): DesignDocument {
  return { ...createEmptyDocument('Тест'), nodes };
}

function frame(id: string, parentId: string | null = null): FrameNode {
  return { ...(createNode('frame', 10, 20, 300, 200) as FrameNode), id, parentId, name: id };
}

function rectangle(id: string, parentId: string | null = null): RectangleNode {
  return { ...(createNode('rectangle', 50, 60, 100, 80) as RectangleNode), id, parentId, name: id };
}

describe('document model', () => {
  it('removes a frame together with all descendants', () => {
    const doc = withNodes([
      frame('root'), frame('nested', 'root'), rectangle('child', 'nested'), rectangle('outside'),
    ]);
    expect(getDescendantIds(doc, 'root')).toEqual(['nested', 'child']);
    expect(removeNodes(doc, ['root']).map((node) => node.id)).toEqual(['outside']);
  });

  it('duplicates a hierarchy with new ids and offsets only the root', () => {
    const doc = withNodes([frame('root'), rectangle('child', 'root')]);
    const result = duplicateNodes(doc, ['root']);
    expect(result.nodes).toHaveLength(4);
    const rootCopy = result.nodes.find((node) => node.id === result.ids[0])!;
    const childCopy = result.nodes.find((node) => node.parentId === rootCopy.id)!;
    expect(rootCopy.id).not.toBe('root');
    expect(rootCopy.x).toBe(34);
    expect(rootCopy.y).toBe(44);
    expect(childCopy.id).not.toBe('child');
    expect(childCopy.x).toBe(50);
    expect(childCopy.y).toBe(60);
  });

  it('composes nested transforms in parent-to-child order', () => {
    const parent = { ...frame('root'), rotation: 30 };
    const child = { ...rectangle('child', 'root'), rotation: 20 };
    const doc = withNodes([parent, child]);
    const actual = getWorldMatrix(doc, child);
    const expected = multiplyMatrix(nodeMatrix(parent), nodeMatrix(child));
    const point = { x: child.x, y: child.y };
    const actualPoint = applyMatrix(actual, point);
    const expectedPoint = applyMatrix(expected, point);
    expect(actualPoint.x).toBeCloseTo(expectedPoint.x);
    expect(actualPoint.y).toBeCloseTo(expectedPoint.y);
  });

  it('reorders only among siblings', () => {
    const doc = withNodes([
      frame('root'), rectangle('first', 'root'), rectangle('outside'), rectangle('second', 'root'),
    ]);
    const result = reorderNode(doc.nodes, 'first', 'up');
    expect(result.map((node) => node.id)).toEqual(['root', 'second', 'outside', 'first']);
  });
});
