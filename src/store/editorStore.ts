import { create } from 'zustand';
import { createEmptyDocument, createWelcomeDocument } from '../data/defaultDocument';
import type { DesignDocument, EditorNode, StyleDefinition, Tool, VariableDefinition, Viewport } from '../types';
import {
  createId,
  duplicateNodes,
  getDescendantIds,
  getNode,
  getNodeBounds,
  getWorldRotation,
  isDescendant,
  isDocumentContentEqual,
  isNodeLocked,
  moveNodeTree,
  pointInParentCoordinates,
  removeNodes,
  reorderNode,
  uniqueNodeName,
} from '../utils/document';
import { applyAutoLayout } from '../utils/autoLayout';
import {
  createComponent as createComponentDefinition,
  createInstance as createComponentInstance,
  createVariant as createComponentVariant,
  setVariant as setComponentVariant,
  detachInstance as detachComponentInstance,
  syncComponents,
} from '../utils/components';
import { alignSelection as alignDocumentSelection, type AlignOperation } from '../utils/groupTransform';
import {
  flattenNodes,
  flipNodes,
  groupNodes,
  moveNodesToPage,
  outlineNodeStrokes,
  reorderNodeToEdge,
} from '../utils/nodeOperations';
import {
  applyStyle as applyLibraryStyle,
  applyVariable as applyLibraryVariable,
  createStyle as createLibraryStyle,
  createVariable as createLibraryVariable,
  createVariableCollection as createLibraryCollection,
  setVariableMode as setLibraryVariableMode,
  updateVariableValue as updateLibraryVariableValue,
  deleteStyle as deleteLibraryStyle,
  deleteVariable as deleteLibraryVariable,
  resolveVariables,
  updateStyle as updateLibraryStyle,
  updateVariable as updateLibraryVariable,
} from '../utils/library';
import { loadStoredDocument } from '../utils/storage';
import {
  ensureDocumentPages,
  getActivePageId,
  getDocumentPages,
  getPageRoots,
} from '../utils/pages';

const HISTORY_LIMIT = 100;
const initialDocument = applyAutoLayout(syncComponents(resolveVariables(loadStoredDocument() ?? createWelcomeDocument())));

type DocumentUpdater = (doc: DesignDocument) => DesignDocument;
interface DocumentUpdateOptions {
  /** A whole subtree moved without changing any parent-relative layout. */
  preserveRelativeGeometry?: boolean;
}
type SaveState = 'saved' | 'saving' | 'error';
export type LayerDropPosition = 'before' | 'after' | 'inside';

interface ClipboardData {
  rootIds: string[];
  nodes: EditorNode[];
}

interface EditorState {
  doc: DesignDocument;
  past: DesignDocument[];
  future: DesignDocument[];
  selection: string[];
  tool: Tool;
  viewport: Viewport;
  saveState: SaveState;
  clipboard: ClipboardData | null;
  setTool: (tool: Tool) => void;
  setViewport: (viewport: Viewport) => void;
  setSelection: (selection: string[]) => void;
  setSaveState: (saveState: SaveState) => void;
  commit: (updater: DocumentUpdater) => void;
  transient: (updater: DocumentUpdater, options?: DocumentUpdateOptions) => void;
  recordSnapshot: (snapshot: DesignDocument) => void;
  addNode: (node: EditorNode) => void;
  updateNode: (id: string, patch: Partial<EditorNode>, record?: boolean) => void;
  updateSelection: (patch: Partial<EditorNode>) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  copySelection: (cut?: boolean) => void;
  pasteClipboard: (replace?: boolean) => void;
  groupSelection: (asFrame?: boolean) => void;
  moveSelectionToPage: (pageId: string) => void;
  flattenSelection: () => void;
  outlineSelectionStroke: () => void;
  flipSelection: (axis: 'horizontal' | 'vertical') => void;
  nudgeSelection: (dx: number, dy: number) => void;
  alignSelection: (operation: AlignOperation) => void;
  createComponent: (id: string) => void;
  createInstance: (id: string, placement?: { x: number; y: number; parentId: string | null }) => void;
  createVariant: (id: string) => void;
  setVariant: (instanceId: string, variantId: string) => void;
  resetInstance: (id: string) => void;
  detachInstance: (id: string) => void;
  createStyle: (nodeId: string | null, type: 'color' | 'text') => void;
  applyStyle: (nodeId: string, styleId: string) => void;
  updateStyle: (styleId: string, patch: Partial<StyleDefinition>) => void;
  deleteStyle: (styleId: string) => void;
  createVariable: (type: 'color' | 'number') => void;
  createVariableCollection: (name?: string) => void;
  setVariableMode: (collectionId: string, modeId: string) => void;
  updateVariableValue: (variableId: string, value: string | number) => void;
  applyVariable: (nodeId: string, variableId: string, property?: string) => void;
  updateVariable: (variableId: string, patch: Partial<VariableDefinition>) => void;
  deleteVariable: (variableId: string) => void;
  addPrototypeLink: (sourceFrameId: string, targetFrameId: string, transition?: 'instant' | 'dissolve' | 'slide', duration?: number) => void;
  removePrototypeLink: (linkId: string) => void;
  setActivePage: (pageId: string) => void;
  addPage: (name?: string, groupId?: string | null) => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  setPageBackground: (pageId: string, background: string) => void;
  deletePage: (pageId: string) => void;
  movePage: (pageId: string, direction: 'up' | 'down') => void;
  movePageTo: (pageId: string, targetId: string) => void;
  setPageGroup: (pageId: string, groupId: string | null) => void;
  addPageGroup: (name?: string) => void;
  renamePageGroup: (groupId: string, name: string) => void;
  deletePageGroup: (groupId: string) => void;
  reorder: (id: string, direction: 'up' | 'down') => void;
  reorderToEdge: (id: string, edge: 'front' | 'back') => void;
  moveLayer: (id: string, targetId: string, position: LayerDropPosition) => void;
  undo: () => void;
  redo: () => void;
  renameDocument: (name: string) => void;
  newDocument: () => void;
  loadDocument: (doc: DesignDocument) => void;
}

const layoutFields = new Set([
  'x', 'y', 'width', 'height', 'rotation', 'visible', 'parentId', 'autoLayout', 'layout',
  'text', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'autoSize',
  'stroke', 'strokeWidth', 'component', 'overrides', 'variableBindings',
]);

function changedLayoutScope(before: DesignDocument, after: DesignDocument): Set<string> {
  const scope = new Set<string>();
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const afterIds = new Set(after.nodes.map((node) => node.id));
  const changed: EditorNode[] = [];
  const addWithAncestors = (node: EditorNode, doc: DesignDocument) => {
    let current: EditorNode | undefined = node;
    while (current) {
      if (current.type === 'frame' && current.autoLayout) scope.add(current.id);
      current = current.parentId ? getNode(doc, current.parentId) : undefined;
    }
  };
  after.nodes.forEach((node) => {
    const previous = beforeNodes.get(node.id);
    const hasLayoutChange = !previous || (previous !== node && [...layoutFields].some((field) =>
      (previous as unknown as Record<string, unknown>)[field] !== (node as unknown as Record<string, unknown>)[field],
    ));
    if (hasLayoutChange) changed.push(node);
  });
  before.nodes.filter((node) => !afterIds.has(node.id)).forEach((node) => addWithAncestors(node, before));
  changed.forEach((node) => addWithAncestors(node, after));

  const parentIds = new Set([...before.nodes, ...after.nodes].map((node) => node.parentId));
  parentIds.forEach((parentId) => {
    if (!parentId) return;
    const beforeOrder = before.nodes.filter((node) => node.parentId === parentId).map((node) => node.id);
    const afterOrder = after.nodes.filter((node) => node.parentId === parentId).map((node) => node.id);
    if (beforeOrder.length === afterOrder.length && beforeOrder.some((id, index) => id !== afterOrder[index])) {
      const parent = getNode(after, parentId);
      if (parent?.type === 'frame' && parent.autoLayout) scope.add(parentId);
    }
  });

  const changedMainRoots = new Set(changed.filter((node) => node.component?.role === 'main').map((node) => node.component!.rootId));
  if (changedMainRoots.size > 0) {
    after.nodes.filter((node) => node.component?.role === 'instance' && changedMainRoots.has(node.component.rootId))
      .forEach((node) => addWithAncestors(node, after));
  }
  return scope;
}

function hasNonTranslationChanges(previous: EditorNode, next: EditorNode): boolean {
  for (const key in previous) {
    if (key === 'x' || key === 'y') continue;
    if (!Object.is(
      previous[key as keyof EditorNode],
      next[key as keyof EditorNode],
    )) return true;
  }
  for (const key in next) {
    if (key !== 'x' && key !== 'y' && !(key in previous)) return true;
  }
  return false;
}

function needsComponentSync(before: DesignDocument, after: DesignDocument): boolean {
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  return after.nodes.some((node) => {
    const previous = beforeNodes.get(node.id);
    if (previous === node) return false;
    if (!previous) return Boolean(node.component);
    // Moving a main tree as a whole preserves every instance root and its
    // relative geometry. Rebuilding all instances on every pointer step is
    // both unnecessary and the dominant cost on imported component pages.
    if (node.component?.role === 'main') return hasNonTranslationChanges(previous, node);
    return node.component?.role === 'instance' && Boolean(previous.overrides) && !node.overrides;
  });
}

function assignNewRootsToActivePage(doc: DesignDocument, previous: DesignDocument): DesignDocument {
  const previousIds = new Set(previous.nodes.map((node) => node.id));
  const activePageId = getActivePageId(doc);
  let changed = false;
  const nodes = doc.nodes.map((node) => {
    if (node.parentId !== null || previousIds.has(node.id) || node.pageId === activePageId) return node;
    changed = true;
    return { ...node, pageId: activePageId };
  });
  return changed ? { ...doc, nodes } : doc;
}

function withTimestamp(
  input: DesignDocument,
  previous: DesignDocument,
  options?: DocumentUpdateOptions,
): DesignDocument {
  const doc = assignNewRootsToActivePage(input, previous);
  if (options?.preserveRelativeGeometry && !needsComponentSync(previous, doc)) {
    return { ...doc, updatedAt: new Date().toISOString() };
  }
  const resolved = resolveVariables({ ...doc, updatedAt: new Date().toISOString() });
  const scope = changedLayoutScope(previous, resolved);
  const synchronized = needsComponentSync(previous, resolved) ? syncComponents(resolved) : resolved;
  return applyAutoLayout(synchronized, scope);
}

function preserveInstanceEdit(before: DesignDocument, after: DesignDocument, id: string): DesignDocument {
  const original = getNode(before, id);
  if (original?.component?.role !== 'instance') return after;
  const isRoot = original.component.sourceId === original.component.rootId;
  const overrides = { ...(original.overrides ?? {}) };
  const updated = getNode(after, id);
  if (!updated) return after;
  Object.keys(updated).forEach((key) => {
    if (['id', 'parentId', 'component', 'overrides'].includes(key)) return;
    if (isRoot && ['x', 'y', 'rotation'].includes(key)) return;
    const typedKey = key as keyof EditorNode;
    if (JSON.stringify(original[typedKey]) !== JSON.stringify(updated[typedKey])) {
      overrides[key] = updated[typedKey];
    }
  });
  if (updated.fillStyleId !== original.fillStyleId && 'fill' in updated) overrides.fill = updated.fill;
  if (updated.textStyleId !== original.textStyleId && updated.type === 'text') {
    const textProperties = ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;
    textProperties.forEach((key) => {
      overrides[key] = updated[key];
    });
  }
  if (JSON.stringify(updated.variableBindings) !== JSON.stringify(original.variableBindings)) {
    Object.keys(updated.variableBindings ?? {}).forEach((property) => {
      if (property.startsWith('autoLayout.') && updated.type === 'frame') overrides.autoLayout = updated.autoLayout;
      else overrides[property] = updated[property as keyof EditorNode];
    });
  }
  return {
    ...after,
    nodes: after.nodes.map((node) => node.id === id ? { ...node, overrides } : node),
  };
}

function cleanSelection(doc: DesignDocument, selection: string[]): string[] {
  return selection.filter((id) => Boolean(getNode(doc, id)));
}

export const useEditorStore = create<EditorState>((set) => ({
  doc: initialDocument,
  past: [],
  future: [],
  selection: [],
  tool: 'select',
  viewport: { x: 100, y: 70, zoom: 1 },
  saveState: 'saved',
  clipboard: null,
  setTool: (tool) => set({ tool }),
  setViewport: (viewport) => set({ viewport }),
  setSelection: (selection) => set({ selection }),
  setSaveState: (saveState) => set({ saveState }),
  commit: (updater) => set((state) => {
    const input = updater(state.doc);
    if (input === state.doc) return state;
    const next = withTimestamp(input, state.doc);
    if (next === state.doc || isDocumentContentEqual(next, state.doc)) return state;
    return {
      doc: next,
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: cleanSelection(next, state.selection),
    };
  }),
  transient: (updater, options) => set((state) => ({
    doc: withTimestamp(updater(state.doc), state.doc, options),
  })),
  recordSnapshot: (snapshot) => set((state) => {
    if (snapshot === state.doc || isDocumentContentEqual(snapshot, state.doc)) return state;
    return {
      past: [...state.past.slice(-HISTORY_LIMIT + 1), snapshot],
      future: [],
      selection: cleanSelection(state.doc, state.selection),
    };
  }),
  addNode: (node) => set((state) => {
    const namedNode = { ...node, name: node.name || uniqueNodeName(state.doc, node.type) };
    const doc = withTimestamp({ ...state.doc, nodes: [...state.doc.nodes, namedNode] }, state.doc);
    return {
      doc,
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: [node.id],
    };
  }),
  updateNode: (id, patch, record = true) => set((state) => {
    const currentNode = getNode(state.doc, id);
    if (!currentNode || Object.entries(patch).every(([key, value]) =>
      (currentNode as unknown as Record<string, unknown>)[key] === value,
    )) return state;
    const nextPatch = { ...patch } as Partial<EditorNode>;
    if (currentNode.component?.role === 'instance') {
      const isRoot = currentNode.component.sourceId === currentNode.component.rootId;
      const overrides = { ...(currentNode.overrides ?? {}) };
      Object.entries(patch).forEach(([key, value]) => {
        if (['id', 'parentId', 'component', 'overrides'].includes(key)) return;
        if (isRoot && ['x', 'y', 'rotation'].includes(key)) return;
        overrides[key] = value;
      });
      nextPatch.overrides = overrides;
    }
    const update: DocumentUpdater = (doc) => {
      const original = getNode(doc, id);
      if (!original) return doc;
      const dx = nextPatch.x === undefined ? 0 : nextPatch.x - original.x;
      const dy = nextPatch.y === undefined ? 0 : nextPatch.y - original.y;
      const treeIds = new Set([id, ...getDescendantIds(doc, id)]);
      return {
        ...doc,
        nodes: doc.nodes.map((node) => {
          if (node.id === id) return { ...node, ...nextPatch } as EditorNode;
          if ((dx !== 0 || dy !== 0) && treeIds.has(node.id)) {
            return { ...node, x: node.x + dx, y: node.y + dy };
          }
          return node;
        }),
      };
    };
    if (!record) return { doc: withTimestamp(update(state.doc), state.doc) };
    const doc = withTimestamp(update(state.doc), state.doc);
    return {
      doc,
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
    };
  }),
  updateSelection: (patch) => set((state) => {
    const ids = new Set(state.selection);
    const doc = withTimestamp({
      ...state.doc,
      nodes: state.doc.nodes.map((node) => ids.has(node.id) ? { ...node, ...patch } as EditorNode : node),
    }, state.doc);
    return {
      doc,
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
    };
  }),
  deleteSelection: () => set((state) => {
    const ids = state.selection.filter((id) => {
      const node = getNode(state.doc, id);
      return node && !isNodeLocked(state.doc, node);
    });
    if (ids.length === 0) return state;
    const doc = withTimestamp({ ...state.doc, nodes: removeNodes(state.doc, ids) }, state.doc);
    return {
      doc,
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: [],
    };
  }),
  duplicateSelection: () => set((state) => {
    if (state.selection.length === 0) return state;
    const result = duplicateNodes(state.doc, state.selection);
    return {
      doc: withTimestamp({ ...state.doc, nodes: result.nodes }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: result.ids,
    };
  }),
  copySelection: (cut = false) => set((state) => {
    const rootIds = state.selection.filter((id) => !state.selection.some(
      (otherId) => otherId !== id && isDescendant(state.doc, id, otherId),
    ));
    if (rootIds.length === 0) return state;
    const ids = new Set(rootIds.flatMap((id) => [id, ...getDescendantIds(state.doc, id)]));
    const clipboard = {
      rootIds,
      nodes: state.doc.nodes.filter((node) => ids.has(node.id)).map((node) => ({ ...node })),
    };
    if (!cut) return { clipboard };
    const removableIds = rootIds.filter((id) => {
      const node = getNode(state.doc, id);
      return node && !isNodeLocked(state.doc, node);
    });
    return {
      clipboard,
      doc: withTimestamp({ ...state.doc, nodes: removeNodes(state.doc, removableIds) }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: [],
    };
  }),
  pasteClipboard: (replace = false) => set((state) => {
    if (!state.clipboard || state.clipboard.nodes.length === 0) return state;
    const targetDoc = replace
      ? { ...state.doc, nodes: removeNodes(state.doc, state.selection) }
      : state.doc;
    const idMap = new Map(state.clipboard.nodes.map((node) => [node.id, createId('node')]));
    const rootIds = new Set(state.clipboard.rootIds);
    const copies = state.clipboard.nodes.map((node) => {
      const parentId = node.parentId && idMap.has(node.parentId)
        ? idMap.get(node.parentId)!
        : getNode(targetDoc, node.parentId)?.type === 'frame' ? node.parentId : null;
      return {
        ...node,
        id: idMap.get(node.id)!,
        parentId,
        name: !replace && rootIds.has(node.id) ? `${node.name} копия` : node.name,
      } as EditorNode;
    });
    return {
      doc: withTimestamp({ ...state.doc, nodes: [...targetDoc.nodes, ...copies] }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: state.clipboard.rootIds.map((id) => idMap.get(id)!).filter(Boolean),
    };
  }),
  groupSelection: (asFrame = false) => set((state) => {
    const result = groupNodes(state.doc, state.selection, asFrame);
    if (!result) return state;
    return {
      doc: withTimestamp({ ...state.doc, nodes: result.nodes }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: [result.groupId],
    };
  }),
  moveSelectionToPage: (pageId) => set((state) => {
    if (state.selection.length === 0 || !getDocumentPages(state.doc).some((page) => page.id === pageId)) return state;
    return {
      doc: withTimestamp({ ...state.doc, activePageId: pageId, nodes: moveNodesToPage(state.doc, state.selection, pageId) }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      viewport: { x: 100, y: 70, zoom: 1 },
    };
  }),
  flattenSelection: () => set((state) => ({
    doc: withTimestamp({ ...state.doc, nodes: flattenNodes(state.doc.nodes, state.selection) }, state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  outlineSelectionStroke: () => set((state) => ({
    doc: withTimestamp({ ...state.doc, nodes: outlineNodeStrokes(state.doc.nodes, state.selection) }, state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  flipSelection: (axis) => set((state) => ({
    doc: withTimestamp({ ...state.doc, nodes: flipNodes(state.doc.nodes, state.selection, axis) }, state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  nudgeSelection: (dx, dy) => set((state) => {
    const rootIds = state.selection.filter((id) => {
      const node = getNode(state.doc, id);
      return node && !isNodeLocked(state.doc, node) && !state.selection.some(
        (otherId) => otherId !== id && isDescendant(state.doc, id, otherId),
      );
    });
    if (rootIds.length === 0) return state;
    const nodes = rootIds.reduce(
      (result, id) => moveNodeTree(result, id, dx, dy),
      state.doc.nodes,
    );
    return {
      doc: withTimestamp({ ...state.doc, nodes }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
    };
  }),
  alignSelection: (operation) => set((state) => {
    const rootIds = state.selection.filter((id) => {
      const node = getNode(state.doc, id);
      return node && !isNodeLocked(state.doc, node) && !state.selection.some(
        (otherId) => otherId !== id && isDescendant(state.doc, id, otherId),
      );
    });
    const nodes = alignDocumentSelection(state.doc, rootIds, operation);
    if (nodes === state.doc.nodes) return state;
    return {
      doc: withTimestamp({ ...state.doc, nodes }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
    };
  }),
  createComponent: (id) => set((state) => {
    const node = getNode(state.doc, id);
    if (!node || node.component?.role === 'instance') return state;
    return {
      doc: withTimestamp(createComponentDefinition(state.doc, id), state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
    };
  }),
  createInstance: (id, placement) => set((state) => {
    const node = getNode(state.doc, id);
    if (!node?.component) return state;
    const result = createComponentInstance(state.doc, node.component.rootId, placement);
    if (!result) return state;
    return {
      doc: withTimestamp(result.doc, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: [result.instanceId],
    };
  }),
  createVariant: (id) => set((state) => {
    const result = createComponentVariant(state.doc, id);
    if (!result) return state;
    return {
      doc: withTimestamp(result.doc, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [], selection: [result.variantId],
    };
  }),
  setVariant: (instanceId, variantId) => set((state) => ({
    doc: withTimestamp(setComponentVariant(state.doc, instanceId, variantId), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
    future: [], selection: [instanceId],
  })),
  resetInstance: (id) => set((state) => {
    const ids = new Set([id, ...getDescendantIds(state.doc, id)]);
    return {
      doc: withTimestamp({
        ...state.doc,
        nodes: state.doc.nodes.map((node) => ids.has(node.id) ? { ...node, overrides: undefined } : node),
      }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
    };
  }),
  detachInstance: (id) => set((state) => ({
    doc: withTimestamp(detachComponentInstance(state.doc, id), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
    future: [],
  })),
  createStyle: (nodeId, type) => set((state) => ({
    doc: withTimestamp(createLibraryStyle(state.doc, nodeId, type), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  applyStyle: (nodeId, styleId) => set((state) => ({
    doc: withTimestamp(preserveInstanceEdit(state.doc, applyLibraryStyle(state.doc, nodeId, styleId), nodeId), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  updateStyle: (styleId, patch) => set((state) => ({
    doc: withTimestamp(updateLibraryStyle(state.doc, styleId, patch), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  deleteStyle: (styleId) => set((state) => ({
    doc: withTimestamp(deleteLibraryStyle(state.doc, styleId), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  createVariable: (type) => set((state) => ({
    doc: withTimestamp(createLibraryVariable(state.doc, type), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  createVariableCollection: (name) => set((state) => ({
    doc: withTimestamp(createLibraryCollection(state.doc, name), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  setVariableMode: (collectionId, modeId) => set((state) => ({
    doc: withTimestamp(setLibraryVariableMode(state.doc, collectionId, modeId), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  updateVariableValue: (variableId, value) => set((state) => ({
    doc: withTimestamp(updateLibraryVariableValue(state.doc, variableId, value), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  applyVariable: (nodeId, variableId, property) => set((state) => ({
    doc: withTimestamp(preserveInstanceEdit(state.doc, applyLibraryVariable(state.doc, nodeId, variableId, property), nodeId), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  updateVariable: (variableId, patch) => set((state) => ({
    doc: withTimestamp(updateLibraryVariable(state.doc, variableId, patch), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  deleteVariable: (variableId) => set((state) => ({
    doc: withTimestamp(deleteLibraryVariable(state.doc, variableId), state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  addPrototypeLink: (sourceFrameId, targetFrameId, transition = 'dissolve', duration = 250) => set((state) => ({
    doc: withTimestamp({
      ...state.doc,
      prototypeLinks: [...(state.doc.prototypeLinks ?? []).filter((link) => link.sourceFrameId !== sourceFrameId), {
        id: createId('link'), sourceFrameId, targetFrameId, transition, duration,
      }],
    }, state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  removePrototypeLink: (linkId) => set((state) => ({
    doc: withTimestamp({ ...state.doc, prototypeLinks: (state.doc.prototypeLinks ?? []).filter((link) => link.id !== linkId) }, state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  setActivePage: (pageId) => set((state) => {
    if (!getDocumentPages(state.doc).some((page) => page.id === pageId) || getActivePageId(state.doc) === pageId) return state;
    return {
      doc: { ...state.doc, activePageId: pageId },
      selection: [],
      viewport: { x: 100, y: 70, zoom: 1 },
    };
  }),
  addPage: (name, groupId = null) => set((state) => {
    const current = ensureDocumentPages(state.doc);
    const id = createId('page');
    const pages = getDocumentPages(current);
    const page = {
      id,
      name: name?.trim() || `Страница ${pages.length + 1}`,
      groupId: groupId && current.pageGroups?.some((group) => group.id === groupId) ? groupId : null,
    };
    return {
      doc: withTimestamp({ ...current, pages: [...pages, page], activePageId: id }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [], selection: [],
      viewport: { x: 100, y: 70, zoom: 1 },
    };
  }),
  duplicatePage: (pageId) => set((state) => {
    const current = ensureDocumentPages(state.doc);
    const pages = getDocumentPages(current);
    const sourceIndex = pages.findIndex((page) => page.id === pageId);
    if (sourceIndex < 0) return state;
    const id = createId('page');
    const roots = getPageRoots(current, pageId);
    const duplicated = duplicateNodes(current, roots.map((node) => node.id));
    const nextPages = [...pages];
    nextPages.splice(sourceIndex + 1, 0, {
      ...pages[sourceIndex], id, name: `${pages[sourceIndex].name} копия`,
    });
    const next = { ...current, pages: nextPages, activePageId: id, nodes: duplicated.nodes };
    return {
      doc: withTimestamp(next, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [], selection: [],
      viewport: { x: 100, y: 70, zoom: 1 },
    };
  }),
  renamePage: (pageId, name) => set((state) => {
    const current = ensureDocumentPages(state.doc);
    return {
      doc: withTimestamp({
        ...current,
        pages: getDocumentPages(current).map((page) => page.id === pageId
          ? { ...page, name: name.trim() || page.name }
          : page),
      }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
    };
  }),
  setPageBackground: (pageId, background) => set((state) => {
    const current = ensureDocumentPages(state.doc);
    return {
      doc: withTimestamp({
        ...current,
        pages: getDocumentPages(current).map((page) => page.id === pageId
          ? { ...page, background }
          : page),
      }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
    };
  }),
  deletePage: (pageId) => set((state) => {
    const current = ensureDocumentPages(state.doc);
    const pages = getDocumentPages(current);
    const pageIndex = pages.findIndex((page) => page.id === pageId);
    if (pages.length <= 1 || pageIndex < 0) return state;
    const rootIds = getPageRoots(current, pageId).map((node) => node.id);
    const removedIds = new Set(rootIds.flatMap((id) => [id, ...getDescendantIds(current, id)]));
    const remainingPages = pages.filter((page) => page.id !== pageId);
    const activePageId = getActivePageId(current) === pageId
      ? (remainingPages[Math.min(pageIndex, remainingPages.length - 1)]?.id ?? remainingPages[0].id)
      : getActivePageId(current);
    const next = {
      ...current,
      pages: remainingPages,
      activePageId,
      nodes: removeNodes(current, rootIds),
      prototypeLinks: (current.prototypeLinks ?? []).filter((link) =>
        !removedIds.has(link.sourceFrameId) && !removedIds.has(link.targetFrameId)),
    };
    return {
      doc: withTimestamp(next, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [], selection: [],
    };
  }),
  movePage: (pageId, direction) => set((state) => {
    const pages = [...getDocumentPages(state.doc)];
    const index = pages.findIndex((page) => page.id === pageId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= pages.length) return state;
    [pages[index], pages[target]] = [pages[target], pages[index]];
    return {
      doc: withTimestamp({ ...ensureDocumentPages(state.doc), pages }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
    };
  }),
  movePageTo: (pageId, targetId) => set((state) => {
    const pages = [...getDocumentPages(state.doc)];
    const index = pages.findIndex((page) => page.id === pageId);
    const targetIndex = pages.findIndex((page) => page.id === targetId);
    if (index < 0 || targetIndex < 0 || index === targetIndex) return state;
    const [page] = pages.splice(index, 1);
    const insertionIndex = pages.findIndex((candidate) => candidate.id === targetId);
    pages.splice(insertionIndex, 0, page);
    return {
      doc: withTimestamp({ ...ensureDocumentPages(state.doc), pages }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
    };
  }),
  setPageGroup: (pageId, groupId) => set((state) => {
    const current = ensureDocumentPages(state.doc);
    if (groupId && !current.pageGroups?.some((group) => group.id === groupId)) return state;
    return {
      doc: withTimestamp({
        ...current,
        pages: getDocumentPages(current).map((page) => page.id === pageId ? { ...page, groupId } : page),
      }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
    };
  }),
  addPageGroup: (name) => set((state) => {
    const current = ensureDocumentPages(state.doc);
    const groups = current.pageGroups ?? [];
    return {
      doc: withTimestamp({
        ...current,
        pageGroups: [...groups, { id: createId('page-group'), name: name?.trim() || `Группа ${groups.length + 1}` }],
      }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
    };
  }),
  renamePageGroup: (groupId, name) => set((state) => ({
    doc: withTimestamp({
      ...state.doc,
      pageGroups: (state.doc.pageGroups ?? []).map((group) => group.id === groupId
        ? { ...group, name: name.trim() || group.name }
        : group),
    }, state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  deletePageGroup: (groupId) => set((state) => ({
    doc: withTimestamp({
      ...state.doc,
      pageGroups: (state.doc.pageGroups ?? []).filter((group) => group.id !== groupId),
      pages: getDocumentPages(state.doc).map((page) => page.groupId === groupId ? { ...page, groupId: null } : page),
    }, state.doc),
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
  })),
  reorder: (id, direction) => set((state) => {
    const nodes = reorderNode(state.doc.nodes, id, direction);
    if (nodes === state.doc.nodes) return state;
    return {
      doc: withTimestamp({ ...state.doc, nodes }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
    };
  }),
  reorderToEdge: (id, edge) => set((state) => {
    const nodes = reorderNodeToEdge(state.doc.nodes, id, edge);
    if (nodes === state.doc.nodes) return state;
    return {
      doc: withTimestamp({ ...state.doc, nodes }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc], future: [],
    };
  }),
  moveLayer: (id, targetId, position) => set((state) => {
    const node = getNode(state.doc, id);
    const target = getNode(state.doc, targetId);
    if (!node || !target || id === targetId || isDescendant(state.doc, targetId, id) ||
      isNodeLocked(state.doc, node) || isNodeLocked(state.doc, target)) return state;
    const inside = position === 'inside' && target.type === 'frame';
    const newParentId = inside ? target.id : target.parentId;
    const bounds = getNodeBounds(state.doc, node);
    const center = pointInParentCoordinates(state.doc, newParentId, {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
    const worldRotation = getWorldRotation(state.doc, node);
    const newParent = getNode(state.doc, newParentId);
    const parentRotation = newParent ? getWorldRotation(state.doc, newParent) : 0;
    const movedNode = {
      ...node,
      parentId: newParentId,
      pageId: newParentId ? node.pageId : getActivePageId(state.doc),
      x: center.x - node.width / 2,
      y: center.y - node.height / 2,
      rotation: worldRotation - parentRotation,
    } as EditorNode;
    const nodes = state.doc.nodes.filter((candidate) => candidate.id !== id);
    if (inside) {
      nodes.push(movedNode);
    } else {
      const targetIndex = nodes.findIndex((candidate) => candidate.id === targetId);
      nodes.splice(Math.max(0, targetIndex + (position === 'after' ? 1 : 0)), 0, movedNode);
    }
    return {
      doc: withTimestamp({ ...state.doc, nodes }, state.doc),
      past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
      future: [],
      selection: [id],
    };
  }),
  undo: () => set((state) => {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      doc: previous,
      past: state.past.slice(0, -1),
      future: [state.doc, ...state.future].slice(0, HISTORY_LIMIT),
      selection: cleanSelection(previous, state.selection),
    };
  }),
  redo: () => set((state) => {
    const next = state.future[0];
    if (!next) return state;
    return {
      doc: next,
      past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
      selection: cleanSelection(next, state.selection),
    };
  }),
  renameDocument: (name) => set((state) => ({
    doc: withTimestamp({ ...state.doc, name: name.trim() || 'Без названия' }, state.doc),
  })),
  newDocument: () => set({
    doc: createEmptyDocument(), past: [], future: [], selection: [], tool: 'select',
    viewport: { x: 100, y: 70, zoom: 1 },
  }),
  loadDocument: (doc) => set({
    doc: doc.preserveSavedGeometry ? syncComponents(resolveVariables(doc)) : applyAutoLayout(syncComponents(resolveVariables(doc))),
    past: [], future: [], selection: [], tool: 'select',
    viewport: { x: 100, y: 70, zoom: 1 },
  }),
}));
