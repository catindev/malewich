import type {
  Bounds,
  DesignDocument,
  EditorNode,
  Matrix,
  NodeType,
  Point,
} from '../types';
import {
  applyMatrix,
  identityMatrix,
  invertMatrix,
  multiplyMatrix,
  nodeBounds,
  nodeMatrix,
} from './geometry';

export function createId(prefix = 'node'): string {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${value}`;
}

export function createNode(
  type: NodeType,
  x: number,
  y: number,
  width = 160,
  height = 100,
): EditorNode {
  const base = {
    id: createId(type),
    name: '',
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    parentId: null,
    stroke: 'transparent',
    strokeWidth: 0,
  };

  switch (type) {
    case 'frame':
      return { ...base, type, name: 'Фрейм', fill: '#ffffff', cornerRadius: 0, clip: true };
    case 'rectangle':
      return { ...base, type, name: 'Прямоугольник', fill: '#8b5cf6', cornerRadius: 0 };
    case 'ellipse':
      return { ...base, type, name: 'Эллипс', fill: '#8b5cf6' };
    case 'text':
      return {
        ...base,
        type,
        name: 'Текст',
        width: width || 220,
        height: height || 48,
        fill: '#202020',
        text: 'Ваш текст',
        fontSize: 32,
        fontFamily: 'Inter, Arial, sans-serif',
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'left',
        autoSize: 'width',
      };
    case 'image':
      return { ...base, type, name: 'Изображение', src: '', cornerRadius: 0 };
    case 'vector':
      return {
        ...base, type, name: 'Вектор', fill: '#8b5cf6',
        path: 'M0 0H160V100H0Z', pathWidth: 160, pathHeight: 100, fillRule: 'nonzero',
      };
  }
}

interface DocumentIndex {
  byId: ReadonlyMap<string, EditorNode>;
  childrenByParent: ReadonlyMap<string | null, EditorNode[]>;
  descendantsById: Map<string, string[]>;
}

const documentIndexes = new WeakMap<DesignDocument, DocumentIndex>();

function getDocumentIndex(doc: DesignDocument): DocumentIndex {
  const cached = documentIndexes.get(doc);
  if (cached) return cached;
  const byId = new Map<string, EditorNode>();
  const childrenByParent = new Map<string | null, EditorNode[]>();
  for (const node of doc.nodes) {
    byId.set(node.id, node);
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  }
  const index: DocumentIndex = { byId, childrenByParent, descendantsById: new Map() };
  documentIndexes.set(doc, index);
  return index;
}

export function getNode(doc: DesignDocument, id: string | null): EditorNode | undefined {
  return id ? getDocumentIndex(doc).byId.get(id) : undefined;
}

export function getChildren(doc: DesignDocument, parentId: string | null): EditorNode[] {
  // Preserve the old fresh-array contract: callers routinely reverse/sort the result.
  return (getDocumentIndex(doc).childrenByParent.get(parentId) ?? []).slice();
}

export function getDescendantIds(doc: DesignDocument, id: string): string[] {
  const index = getDocumentIndex(doc);
  const cached = index.descendantsById.get(id);
  if (cached) return cached.slice();
  const descendants: string[] = [];
  const visit = (parentId: string) => {
    for (const child of index.childrenByParent.get(parentId) ?? []) {
      descendants.push(child.id);
      visit(child.id);
    }
  };
  visit(id);
  index.descendantsById.set(id, descendants);
  return descendants.slice();
}

export function getAncestors(doc: DesignDocument, node: EditorNode): EditorNode[] {
  const ancestors: EditorNode[] = [];
  let parent = getNode(doc, node.parentId);
  while (parent) {
    ancestors.unshift(parent);
    parent = getNode(doc, parent.parentId);
  }
  return ancestors;
}

export function getWorldMatrix(doc: DesignDocument, node: EditorNode): Matrix {
  return multiplyMatrix(getParentWorldMatrix(doc, node), nodeMatrix(node));
}

export function getParentWorldMatrix(doc: DesignDocument, node: EditorNode): Matrix {
  return getAncestors(doc, node).reduce(
    (matrix, ancestor) => multiplyMatrix(matrix, nodeMatrix(ancestor)),
    identityMatrix(),
  );
}

export function getWorldRotation(doc: DesignDocument, node: EditorNode): number {
  return getAncestors(doc, node).reduce((rotation, ancestor) => rotation + ancestor.rotation, node.rotation);
}

export function getNodeBounds(doc: DesignDocument, node: EditorNode): Bounds {
  return nodeBounds(node, getWorldMatrix(doc, node));
}

export function isDescendant(doc: DesignDocument, id: string, possibleAncestor: string): boolean {
  let node = getNode(doc, id);
  while (node?.parentId) {
    if (node.parentId === possibleAncestor) return true;
    node = getNode(doc, node.parentId);
  }
  return false;
}

export function isNodeVisible(doc: DesignDocument, node: EditorNode): boolean {
  return node.visible && getAncestors(doc, node).every((ancestor) => ancestor.visible);
}

export function isNodeLocked(doc: DesignDocument, node: EditorNode): boolean {
  return node.locked || getAncestors(doc, node).some((ancestor) => ancestor.locked);
}

export function flattenDocument(doc: DesignDocument): EditorNode[] {
  const visit = (parentId: string | null): EditorNode[] =>
    getChildren(doc, parentId).flatMap((node) => [node, ...visit(node.id)]);
  return visit(null);
}

export function findFrameAtPoint(doc: DesignDocument, point: Point): EditorNode | null {
  const frames = flattenDocument(doc).filter((node) => node.type === 'frame' && isNodeVisible(doc, node));
  for (const frame of frames.reverse()) {
    const localPoint = applyMatrix(invertMatrix(getWorldMatrix(doc, frame)), point);
    if (
      localPoint.x >= frame.x && localPoint.x <= frame.x + frame.width &&
      localPoint.y >= frame.y && localPoint.y <= frame.y + frame.height
    ) {
      return frame;
    }
  }
  return null;
}

export function pointInParentCoordinates(
  doc: DesignDocument,
  parentId: string | null,
  point: Point,
): Point {
  const parent = getNode(doc, parentId);
  return parent ? applyMatrix(invertMatrix(getWorldMatrix(doc, parent)), point) : point;
}

export function moveNodeTree(nodes: EditorNode[], id: string, dx: number, dy: number): EditorNode[] {
  const ids = new Set([id, ...getDescendantIds({ nodes } as DesignDocument, id)]);
  return nodes.map((node) => ids.has(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node);
}

export function uniqueNodeName(doc: DesignDocument, type: NodeType): string {
  const labels: Record<NodeType, string> = {
    frame: 'Фрейм',
    rectangle: 'Прямоугольник',
    ellipse: 'Эллипс',
    text: 'Текст',
    image: 'Изображение',
    vector: 'Вектор',
  };
  const count = doc.nodes.filter((node) => node.type === type).length + 1;
  return `${labels[type]} ${count}`;
}

export function duplicateNodes(doc: DesignDocument, ids: string[]): { nodes: EditorNode[]; ids: string[] } {
  const allIds = ids.flatMap((id) => [id, ...getDescendantIds(doc, id)]);
  const uniqueIds = [...new Set(allIds)];
  const idMap = new Map(uniqueIds.map((id) => [id, createId('node')]));
  const copies = uniqueIds.flatMap((id) => {
    const node = getNode(doc, id);
    if (!node) return [];
    const isRootCopy = !node.parentId || !idMap.has(node.parentId);
    return [{
      ...node,
      id: idMap.get(id)!,
      parentId: node.parentId && idMap.has(node.parentId) ? idMap.get(node.parentId)! : node.parentId,
      name: isRootCopy ? `${node.name} копия` : node.name,
      x: node.x + (isRootCopy ? 24 : 0),
      y: node.y + (isRootCopy ? 24 : 0),
    } as EditorNode];
  });
  return { nodes: [...doc.nodes, ...copies], ids: ids.map((id) => idMap.get(id)).filter((id): id is string => Boolean(id)) };
}

export function removeNodes(doc: DesignDocument, ids: string[]): EditorNode[] {
  const allIds = new Set(ids.flatMap((id) => [id, ...getDescendantIds(doc, id)]));
  return doc.nodes.filter((node) => !allIds.has(node.id));
}

export function reorderNode(nodes: EditorNode[], id: string, direction: 'up' | 'down'): EditorNode[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index < 0) return nodes;
  const node = nodes[index];
  const siblingIndexes = nodes
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate }) => candidate.parentId === node.parentId)
    .map(({ candidateIndex }) => candidateIndex);
  const position = siblingIndexes.indexOf(index);
  const targetPosition = direction === 'up' ? position + 1 : position - 1;
  if (targetPosition < 0 || targetPosition >= siblingIndexes.length) return nodes;
  const targetIndex = siblingIndexes[targetPosition];
  const next = [...nodes];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}
