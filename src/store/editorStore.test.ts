import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode, RectangleNode } from '../types';
import { createAutoLayout } from '../utils/autoLayout';
import { createNode, getNode } from '../utils/document';
import { getActivePageId, getDocumentPages, getPageDocument } from '../utils/pages';
import { useEditorStore } from './editorStore';

function setup() {
  const frame = { ...(createNode('frame', 0, 0, 400, 300) as FrameNode), id: 'frame' };
  const child = { ...(createNode('rectangle', 30, 40, 100, 80) as RectangleNode), id: 'child', parentId: 'frame' };
  useEditorStore.getState().loadDocument({ ...createEmptyDocument(), nodes: [frame, child] });
  return { frame, child };
}

describe('editor store', () => {
  beforeEach(setup);

  it('supports undo and redo', () => {
    const store = useEditorStore.getState();
    store.setSelection(['child']);
    store.updateNode('child', { x: 90 });
    expect(getNode(useEditorStore.getState().doc, 'child')?.x).toBe(90);
    useEditorStore.getState().undo();
    expect(getNode(useEditorStore.getState().doc, 'child')?.x).toBe(30);
    useEditorStore.getState().redo();
    expect(getNode(useEditorStore.getState().doc, 'child')?.x).toBe(90);
  });

  it('moves descendants when a frame position changes in the inspector', () => {
    useEditorStore.getState().updateNode('frame', { x: 50, y: 20 });
    const doc = useEditorStore.getState().doc;
    expect(getNode(doc, 'frame')).toMatchObject({ x: 50, y: 20 });
    expect(getNode(doc, 'child')).toMatchObject({ x: 80, y: 60 });
  });

  it('does not delete locked nodes', () => {
    useEditorStore.getState().updateNode('child', { locked: true });
    useEditorStore.getState().setSelection(['child']);
    useEditorStore.getState().deleteSelection();
    expect(getNode(useEditorStore.getState().doc, 'child')).toBeDefined();
  });

  it('duplicates and selects the copy', () => {
    useEditorStore.getState().setSelection(['frame']);
    useEditorStore.getState().duplicateSelection();
    const state = useEditorStore.getState();
    expect(state.doc.nodes).toHaveLength(4);
    expect(state.selection).toHaveLength(1);
    expect(state.selection[0]).not.toBe('frame');
  });

  it('copies and pastes in place with a new id', () => {
    useEditorStore.getState().setSelection(['child']);
    useEditorStore.getState().copySelection();
    useEditorStore.getState().pasteClipboard();
    const state = useEditorStore.getState();
    expect(state.doc.nodes).toHaveLength(3);
    const copy = getNode(state.doc, state.selection[0]);
    expect(copy).toMatchObject({ x: 30, y: 40, parentId: 'frame' });
    expect(copy?.id).not.toBe('child');
  });

  it('cuts and pastes a complete hierarchy', () => {
    useEditorStore.getState().setSelection(['frame']);
    useEditorStore.getState().copySelection(true);
    expect(useEditorStore.getState().doc.nodes).toHaveLength(0);
    useEditorStore.getState().pasteClipboard();
    const state = useEditorStore.getState();
    expect(state.doc.nodes).toHaveLength(2);
    expect(state.doc.nodes.some((node) => node.parentId === state.selection[0])).toBe(true);
  });

  it('nudges a frame together with its children', () => {
    useEditorStore.getState().setSelection(['frame']);
    useEditorStore.getState().nudgeSelection(10, 1);
    const doc = useEditorStore.getState().doc;
    expect(getNode(doc, 'frame')).toMatchObject({ x: 10, y: 1 });
    expect(getNode(doc, 'child')).toMatchObject({ x: 40, y: 41 });
  });

  it('drags a layer out of a frame while preserving its coordinates', () => {
    const outside = { ...(createNode('rectangle', 400, 0, 100, 100) as RectangleNode), id: 'outside' };
    useEditorStore.getState().addNode(outside);
    useEditorStore.getState().moveLayer('child', 'outside', 'before');
    const state = useEditorStore.getState();
    expect(getNode(state.doc, 'child')).toMatchObject({ parentId: null, x: 30, y: 40 });
    expect(state.doc.nodes.map((node) => node.id)).toEqual(['frame', 'child', 'outside']);
  });

  it('prevents nesting a frame inside itself', () => {
    const before = useEditorStore.getState().doc;
    useEditorStore.getState().moveLayer('frame', 'child', 'inside');
    expect(useEditorStore.getState().doc).toBe(before);
  });

  it('keeps instance overrides during main synchronization and resets them', () => {
    useEditorStore.getState().createComponent('frame');
    useEditorStore.getState().createInstance('frame');
    const rootId = useEditorStore.getState().selection[0];
    const instanceChild = useEditorStore.getState().doc.nodes.find((node) => node.parentId === rootId)!;
    useEditorStore.getState().updateNode(instanceChild.id, { x: 55 });
    useEditorStore.getState().updateNode('child', { x: 70 });
    expect(getNode(useEditorStore.getState().doc, instanceChild.id)?.x).toBe(55);
    useEditorStore.getState().resetInstance(rootId);
    expect(getNode(useEditorStore.getState().doc, instanceChild.id)?.x).toBe(110);
  });

  it('stores library applications on instances as overrides', () => {
    useEditorStore.getState().createComponent('frame');
    useEditorStore.getState().createInstance('frame');
    const rootId = useEditorStore.getState().selection[0];
    const instanceChild = useEditorStore.getState().doc.nodes.find((node) => node.parentId === rootId)!;
    useEditorStore.getState().createStyle(null, 'color');
    const styleId = useEditorStore.getState().doc.styles![0].id;
    useEditorStore.getState().applyStyle(instanceChild.id, styleId);
    useEditorStore.getState().updateNode('child', { fill: '#000000' });
    expect(getNode(useEditorStore.getState().doc, instanceChild.id)).toMatchObject({ fill: '#8b5cf6', fillStyleId: styleId });
  });

  it('reflows an Auto Layout parent when sibling order changes', () => {
    const autoLayout = { ...createAutoLayout('horizontal'), gap: 10, padding: { top: 0, right: 0, bottom: 0, left: 0 } };
    const frame = { ...(createNode('frame', 0, 0, 300, 100) as FrameNode), id: 'layout', autoLayout };
    const a = { ...(createNode('rectangle', 0, 0, 50, 20) as RectangleNode), id: 'a', parentId: 'layout' };
    const b = { ...(createNode('rectangle', 60, 0, 50, 20) as RectangleNode), id: 'b', parentId: 'layout' };
    useEditorStore.getState().loadDocument({ ...createEmptyDocument(), nodes: [frame, a, b] });
    useEditorStore.getState().reorder('a', 'up');
    expect(getNode(useEditorStore.getState().doc, 'b')?.x).toBe(0);
    expect(getNode(useEditorStore.getState().doc, 'a')?.x).toBe(60);
  });

  it('does not reflow an unrelated frame in an imported document', () => {
    const autoLayout = { ...createAutoLayout('horizontal'), gap: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 } };
    const first = { ...(createNode('frame', 0, 0, 200, 100) as FrameNode), id: 'first', autoLayout };
    const firstChild = { ...(createNode('rectangle', 5, 0, 50, 20) as RectangleNode), id: 'first-child', parentId: 'first' };
    const second = { ...(createNode('frame', 300, 0, 200, 100) as FrameNode), id: 'second', autoLayout };
    const secondChild = { ...(createNode('rectangle', 305, 0, 50, 20) as RectangleNode), id: 'second-child', parentId: 'second' };
    useEditorStore.getState().loadDocument({
      ...createEmptyDocument(), preserveSavedGeometry: true,
      nodes: [first, firstChild, second, secondChild],
    });
    expect(getNode(useEditorStore.getState().doc, 'second-child')?.x).toBe(305);
    useEditorStore.getState().updateNode('first-child', { width: 60 });
    expect(getNode(useEditorStore.getState().doc, 'first-child')?.x).toBe(0);
    expect(getNode(useEditorStore.getState().doc, 'second-child')?.x).toBe(305);
  });

  it('isolates pages and assigns new roots to the active page', () => {
    const store = useEditorStore.getState();
    store.addPage('Дизайн');
    const activePageId = getActivePageId(useEditorStore.getState().doc);
    const frame = { ...(createNode('frame', 0, 0, 200, 100) as FrameNode), id: 'second-page-frame' };
    useEditorStore.getState().addNode(frame);
    const doc = useEditorStore.getState().doc;
    expect(getNode(doc, frame.id)?.pageId).toBe(activePageId);
    expect(getPageDocument(doc).nodes.map((node) => node.id)).toEqual([frame.id]);
    expect(getPageDocument(doc, 'page-1').nodes.map((node) => node.id)).toEqual(['frame', 'child']);
  });

  it('duplicates a complete page and deletes it without touching the source', () => {
    const store = useEditorStore.getState();
    store.duplicatePage('page-1');
    const duplicated = useEditorStore.getState().doc;
    const duplicateId = getActivePageId(duplicated);
    expect(duplicateId).not.toBe('page-1');
    expect(getPageDocument(duplicated, duplicateId).nodes).toHaveLength(2);
    expect(getPageDocument(duplicated, duplicateId).nodes.every((node) => !['frame', 'child'].includes(node.id))).toBe(true);
    useEditorStore.getState().deletePage(duplicateId);
    const restored = useEditorStore.getState().doc;
    expect(getDocumentPages(restored)).toHaveLength(1);
    expect(getPageDocument(restored, 'page-1').nodes.map((node) => node.id)).toEqual(['frame', 'child']);
  });

  it('groups pages without deleting them when the group is removed', () => {
    const store = useEditorStore.getState();
    store.addPageGroup('Продукт');
    const groupId = useEditorStore.getState().doc.pageGroups![0].id;
    useEditorStore.getState().addPage('Экраны', groupId);
    const pageId = getActivePageId(useEditorStore.getState().doc);
    expect(getDocumentPages(useEditorStore.getState().doc).find((page) => page.id === pageId)?.groupId).toBe(groupId);
    useEditorStore.getState().deletePageGroup(groupId);
    const doc = useEditorStore.getState().doc;
    expect(doc.pageGroups).toEqual([]);
    expect(getDocumentPages(doc).find((page) => page.id === pageId)).toMatchObject({ name: 'Экраны', groupId: null });
  });
});
