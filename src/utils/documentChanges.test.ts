import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { DesignDocument, EditorNode, FrameNode, RectangleNode } from '../types';
import { applyAutoLayout, createAutoLayout } from './autoLayout';
import { syncComponents, createComponent, createInstance } from './components';
import { createNode } from './document';
import { deriveDocumentChange } from './documentChanges';

function rectangle(id: string, parentId: string | null = null, x = 0): RectangleNode {
  return { ...(createNode('rectangle', x, 0, 50, 40) as RectangleNode), id, parentId };
}

function documentWith(nodes: EditorNode[]): DesignDocument {
  return { ...createEmptyDocument(), nodes };
}

describe('document changes and identity', () => {
  it('reports only changed properties and preserves pure translation semantics', () => {
    const before = documentWith([rectangle('a'), rectangle('b')]);
    const after = {
      ...before,
      updatedAt: new Date().toISOString(),
      nodes: before.nodes.map((node) => node.id === 'a' ? { ...node, x: node.x + 12 } : node),
    };
    const change = deriveDocumentChange(before, after);
    expect(change.changedIds).toEqual(new Set(['a']));
    expect(change.changedProps.get('a')).toEqual(new Set(['x']));
    expect(change.translationOnly).toBe(true);
    expect(change.structureChanged).toBe(false);
    expect(after.nodes[1]).toBe(before.nodes[1]);
  });

  it('marks sibling reorder as structural even when node objects are unchanged', () => {
    const before = documentWith([rectangle('a'), rectangle('b')]);
    const after = { ...before, nodes: [before.nodes[1], before.nodes[0]] };
    const change = deriveDocumentChange(before, after);
    expect(change.changedIds.size).toBe(0);
    expect(change.structureChanged).toBe(true);
    expect(change.translationOnly).toBe(false);
  });

  it('keeps unchanged node identity through scoped Auto Layout', () => {
    const layout = {
      ...(createNode('frame', 0, 0, 300, 100) as FrameNode),
      id: 'layout',
      autoLayout: createAutoLayout('horizontal'),
    };
    const child = { ...rectangle('child', 'layout', 20), width: 60 };
    const unrelated = rectangle('unrelated', null, 500);
    const before = documentWith([layout, child, unrelated]);
    const after = applyAutoLayout(before, new Set(['layout']));
    expect(after.nodes[0]).toBe(layout);
    expect(after.nodes[1]).not.toBe(child);
    expect(after.nodes[2]).toBe(unrelated);
  });

  it('reuses all instances when component synchronization changes nothing', () => {
    const frame = { ...(createNode('frame', 0, 0, 300, 100) as FrameNode), id: 'frame' };
    const child = rectangle('child', 'frame', 30);
    let doc = documentWith([frame, child]);
    doc = createComponent(doc, 'frame');
    const created = createInstance(doc, 'frame');
    expect(created).not.toBeNull();
    doc = created!.doc;
    const synced = syncComponents(doc);
    expect(synced).toBe(doc);
    expect(synced.nodes.every((node, index) => node === doc.nodes[index])).toBe(true);
  });
});
