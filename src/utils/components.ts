import type { DesignDocument, EditorNode } from '../types';
import { createId, getChildren, getDescendantIds, getNode, isEditorNodeEqual } from './document';

function variantKey(node: EditorNode): string {
  return node.variantKey ?? node.component?.sourceId ?? node.id;
}

export function createComponent(doc: DesignDocument, id: string): DesignDocument {
  const root = getNode(doc, id);
  if (!root) return doc;
  const ids = new Set([id, ...getDescendantIds(doc, id)]);
  return {
    ...doc,
    nodes: doc.nodes.map((node) => ids.has(node.id) ? {
      ...node,
      component: { rootId: id, sourceId: node.id, role: 'main' as const },
      variantKey: node.variantKey ?? node.id,
      overrides: undefined,
    } : node),
  };
}

function buildInstanceTree(
  doc: DesignDocument,
  mainRoot: EditorNode,
  existingNodes: Map<string, EditorNode>,
  rootPosition?: { x: number; y: number; rotation: number; parentId: string | null },
): EditorNode[] {
  const existingRoot = existingNodes.get(variantKey(mainRoot));
  const rootX = rootPosition?.x ?? existingRoot?.x ?? mainRoot.x + 40;
  const rootY = rootPosition?.y ?? existingRoot?.y ?? mainRoot.y + 40;
  const deltaX = rootX - mainRoot.x;
  const deltaY = rootY - mainRoot.y;

  const clone = (mainNode: EditorNode, parentId: string | null, isRoot: boolean): EditorNode[] => {
    const existing = existingNodes.get(variantKey(mainNode));
    const overrides = existing?.overrides ?? {};
    const computed = {
      ...mainNode,
      x: mainNode.x + deltaX,
      y: mainNode.y + deltaY,
    } as EditorNode;
    const instance = {
      ...computed,
      ...overrides,
      id: existing?.id ?? createId('instance'),
      parentId: isRoot ? (rootPosition?.parentId ?? existingRoot?.parentId ?? mainRoot.parentId) : parentId,
      component: { rootId: mainRoot.id, sourceId: mainNode.id, role: 'instance' as const },
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    } as EditorNode;
    if (isRoot) {
      instance.x = rootX;
      instance.y = rootY;
      instance.rotation = rootPosition?.rotation ?? existingRoot?.rotation ?? mainRoot.rotation;
    }
    return [
      instance,
      ...getChildren(doc, mainNode.id).flatMap((child) => clone(child, instance.id, false)),
    ];
  };
  return clone(mainRoot, mainRoot.parentId, true);
}

export function createInstance(
  doc: DesignDocument,
  rootId: string,
  placement?: { x: number; y: number; parentId: string | null },
): { doc: DesignDocument; instanceId: string } | null {
  const mainRoot = getNode(doc, rootId);
  if (!mainRoot || mainRoot.component?.role !== 'main') return null;
  const instances = buildInstanceTree(doc, mainRoot, new Map(), {
    x: placement?.x ?? mainRoot.x + 40,
    y: placement?.y ?? mainRoot.y + 40,
    rotation: mainRoot.rotation,
    parentId: placement?.parentId ?? mainRoot.parentId,
  });
  return { doc: { ...doc, nodes: [...doc.nodes, ...instances] }, instanceId: instances[0].id };
}

export function createVariant(doc: DesignDocument, rootId: string): { doc: DesignDocument; variantId: string } | null {
  const root = getNode(doc, rootId);
  if (!root || root.component?.role !== 'main') return null;
  const setId = root.variantSetId ?? createId('set');
  const treeIds = [rootId, ...getDescendantIds(doc, rootId)];
  const idMap = new Map(treeIds.map((id) => [id, createId('node')]));
  const variantCount = doc.nodes.filter((node) => node.variantSetId === setId && node.id === node.component?.rootId && node.component?.role === 'main').length;
  const originalNodes = doc.nodes.map((node) => treeIds.includes(node.id) ? {
    ...node,
    variantSetId: setId,
    variantProps: node.variantProps ?? { State: 'Default' },
  } : node);
  const copies = treeIds.flatMap((id) => {
    const node = getNode(doc, id);
    if (!node) return [];
    const isRoot = id === rootId;
    return [{
      ...node,
      id: idMap.get(id)!,
      parentId: node.parentId && idMap.has(node.parentId) ? idMap.get(node.parentId)! : node.parentId,
      component: { rootId: idMap.get(rootId)!, sourceId: idMap.get(id)!, role: 'main' as const },
      variantSetId: setId,
      variantProps: isRoot ? { State: `Variant ${Math.max(2, variantCount + 1)}` } : node.variantProps,
      name: isRoot ? `${root.name} / Variant ${Math.max(2, variantCount + 1)}` : node.name,
      x: node.x + (isRoot ? 40 : 0),
      y: node.y + (isRoot ? 40 : 0),
    } as EditorNode];
  });
  return { doc: { ...doc, nodes: [...originalNodes, ...copies] }, variantId: idMap.get(rootId)! };
}

export function setVariant(doc: DesignDocument, instanceId: string, variantId: string): DesignDocument {
  const instanceRoot = getNode(doc, instanceId);
  const mainRoot = getNode(doc, variantId);
  if (!instanceRoot || !mainRoot || mainRoot.component?.role !== 'main') return doc;
  const oldIds = new Set([instanceId, ...getDescendantIds(doc, instanceId)]);
  const existingNodes = new Map(
    doc.nodes.filter((node) => oldIds.has(node.id)).map((node) => [variantKey(node), node]),
  );
  const rebuilt = buildInstanceTree(doc, mainRoot, existingNodes, {
    x: instanceRoot.x, y: instanceRoot.y, rotation: instanceRoot.rotation, parentId: instanceRoot.parentId,
  });
  const rootIndex = doc.nodes.findIndex((node) => node.id === instanceId);
  const nodes = doc.nodes.filter((node) => !oldIds.has(node.id));
  nodes.splice(Math.max(0, rootIndex), 0, ...rebuilt);
  return { ...doc, nodes };
}

export function syncComponents(doc: DesignDocument): DesignDocument {
  const mainRoots = doc.nodes.filter((node) => node.component?.role === 'main' && node.id === node.component.rootId);
  if (mainRoots.length === 0) return doc;
  let nodes = doc.nodes;
  mainRoots.forEach((mainRoot) => {
    const instanceRoots = nodes.filter((node) =>
      node.component?.role === 'instance' && node.component.rootId === mainRoot.id && node.component.sourceId === mainRoot.id,
    );
    instanceRoots.forEach((instanceRoot) => {
      const oldIds = new Set([instanceRoot.id, ...getDescendantIds({ ...doc, nodes }, instanceRoot.id)]);
      const existingNodes = new Map(
        nodes.filter((node) => oldIds.has(node.id)).map((node) => [variantKey(node), node]),
      );
      const rebuilt = buildInstanceTree({ ...doc, nodes }, mainRoot, existingNodes);
      const previousById = new Map(nodes.map((node) => [node.id, node]));
      const preserved = rebuilt.map((node) => {
        const previous = previousById.get(node.id);
        return previous && isEditorNodeEqual(previous, node) ? previous : node;
      });
      const rootIndex = nodes.findIndex((node) => node.id === instanceRoot.id);
      nodes = nodes.filter((node) => !oldIds.has(node.id));
      nodes.splice(Math.max(0, rootIndex), 0, ...preserved);
    });
  });
  const unchanged = nodes.length === doc.nodes.length && nodes.every((node, index) => node === doc.nodes[index]);
  return unchanged ? doc : { ...doc, nodes };
}

export function detachInstance(doc: DesignDocument, id: string): DesignDocument {
  const ids = new Set([id, ...getDescendantIds(doc, id)]);
  return {
    ...doc,
    nodes: doc.nodes.map((node) => ids.has(node.id) ? {
      ...node,
      component: undefined,
      overrides: undefined,
    } : node),
  };
}
