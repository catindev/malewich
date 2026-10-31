import { describe, expect, it } from 'vitest';
import { createNode } from './document';
import { applyMatrix } from './geometry';
import { hitTestNode } from './hitTest';
import { getWorldMatrix } from './document';
import type { DesignDocument } from '../types';

function lineDocument() {
  const line = createNode('line', 100, 80, 200, 0.01);
  const doc: DesignDocument = {
    version: 1,
    id: 'hit-test-line',
    name: 'Line hit test',
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
    nodes: [line],
    pages: [{ id: 'page-1', name: 'Страница 1' }],
    activePageId: 'page-1',
  };
  return { doc, line };
}

describe('hitTestNode', () => {
  it('selects a line around its visible stroke despite its near-zero height', () => {
    const { doc, line } = lineDocument();
    line.rotation = 30;
    const world = getWorldMatrix(doc, line);
    const nearStroke = applyMatrix(world, { x: 200, y: 83 });
    const outsideStroke = applyMatrix(world, { x: 200, y: 86 });

    expect(hitTestNode(doc, nearStroke)?.id).toBe(line.id);
    expect(hitTestNode(doc, outsideStroke)).toBeNull();
  });
});
