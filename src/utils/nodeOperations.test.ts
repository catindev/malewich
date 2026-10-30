import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { RectangleNode } from '../types';
import { createNode } from './document';
import { applyMatrix, nodeMatrix } from './geometry';
import { flattenNodes, flipNodes, groupNodes, moveNodesToPage, outlineNodeStrokes, reorderNodeToEdge } from './nodeOperations';

function rectangle(id: string, x: number): RectangleNode {
  return { ...(createNode('rectangle', x, 20, 100, 80) as RectangleNode), id, name: id };
}

describe('object operations', () => {
  it('groups roots into a transparent frame without changing their artwork coordinates', () => {
    const first = rectangle('first', 10);
    const second = rectangle('second', 180);
    const doc = { ...createEmptyDocument(), nodes: [first, second] };
    const result = groupNodes(doc, [first.id, second.id])!;
    const group = result.nodes.find((node) => node.id === result.groupId)!;
    expect(group).toMatchObject({ type: 'frame', x: 10, y: 20, width: 270, height: 80, fill: 'transparent', isGroup: true });
    expect(result.nodes.find((node) => node.id === first.id)).toMatchObject({ parentId: group.id, x: 10, y: 20 });
    expect(result.nodes.find((node) => node.id === second.id)).toMatchObject({ parentId: group.id, x: 180, y: 20 });
    expect(result.nodes.indexOf(group)).toBeLessThan(result.nodes.findIndex((node) => node.id === first.id));
  });

  it('moves a selection to another page as a root', () => {
    const node = rectangle('root', 40);
    const doc = { ...createEmptyDocument(), pages: [{ id: 'page-1', name: 'One' }, { id: 'page-2', name: 'Two' }], nodes: [node] };
    const moved = moveNodesToPage(doc, [node.id], 'page-2');
    expect(moved[0]).toMatchObject({ id: node.id, parentId: null, pageId: 'page-2', x: 40, y: 20 });
  });

  it('flattens shapes and converts their strokes to editable compound vectors', () => {
    const node = { ...rectangle('shape', 0), stroke: '#ff0000', strokeWidth: 4, cornerRadius: 8 };
    const flattened = flattenNodes([node], [node.id])[0];
    expect(flattened).toMatchObject({ type: 'vector', pathWidth: 100, pathHeight: 80, fill: node.fill });
    const outlined = outlineNodeStrokes([node], [node.id])[0];
    expect(outlined).toMatchObject({ type: 'vector', fill: '#ff0000', fillRule: 'evenodd' });
    expect(outlined.type === 'vector' && outlined.path.includes('M8 2')).toBe(true);
  });

  it('flips the world matrix and reorders only among siblings', () => {
    const node = rectangle('shape', 10);
    const other = rectangle('other', 200);
    const flipped = flipNodes([node], [node.id], 'horizontal')[0];
    const point = applyMatrix(nodeMatrix(flipped), { x: 10, y: 20 });
    expect(point.x).toBeCloseTo(110);
    expect(point.y).toBe(20);
    expect(reorderNodeToEdge([node, other], node.id, 'front').map((item) => item.id)).toEqual(['other', 'shape']);
    expect(reorderNodeToEdge([node, other], node.id, 'back')).toEqual([node, other]);
  });
});
