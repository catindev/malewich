import type { Bounds, DesignDocument, EditorNode, Point } from '../types';
import {
  getNode,
  getNodeBounds,
  getParentWorldMatrix,
  moveNodeTree,
  pointInParentCoordinates,
} from './document';
import { applyMatrix, invertMatrix, rotationMatrix } from './geometry';

export type AlignOperation =
  | 'left' | 'horizontal-center' | 'right'
  | 'top' | 'vertical-center' | 'bottom'
  | 'distribute-horizontal' | 'distribute-vertical';

function worldCenter(bounds: Bounds): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function localVector(doc: DesignDocument, node: EditorNode, vector: Point): Point {
  const matrix = invertMatrix(getParentWorldMatrix(doc, node));
  return { x: matrix.a * vector.x + matrix.c * vector.y, y: matrix.b * vector.x + matrix.d * vector.y };
}

export function resizeSelection(
  doc: DesignDocument,
  ids: string[],
  startBounds: Bounds,
  nextBounds: Bounds,
): EditorNode[] {
  const scaleX = nextBounds.width / Math.max(startBounds.width, 0.0001);
  const scaleY = nextBounds.height / Math.max(startBounds.height, 0.0001);
  return doc.nodes.map((node) => {
    if (!ids.includes(node.id)) return node;
    const bounds = getNodeBounds(doc, node);
    const center = worldCenter(bounds);
    const relativeX = (center.x - startBounds.x) / Math.max(startBounds.width, 0.0001);
    const relativeY = (center.y - startBounds.y) / Math.max(startBounds.height, 0.0001);
    const nextCenter = pointInParentCoordinates(doc, node.parentId, {
      x: nextBounds.x + relativeX * nextBounds.width,
      y: nextBounds.y + relativeY * nextBounds.height,
    });
    return {
      ...node,
      x: nextCenter.x - node.width * scaleX / 2,
      y: nextCenter.y - node.height * scaleY / 2,
      width: Math.max(1, Math.abs(node.width * scaleX)),
      height: Math.max(1, Math.abs(node.height * scaleY)),
      ...(node.type === 'text' ? { autoSize: 'none' as const } : {}),
    };
  });
}

export function rotateSelection(
  doc: DesignDocument,
  ids: string[],
  center: Point,
  angle: number,
): EditorNode[] {
  const matrix = rotationMatrix(angle, center.x, center.y);
  return doc.nodes.map((node) => {
    if (!ids.includes(node.id)) return node;
    const currentCenter = worldCenter(getNodeBounds(doc, node));
    const rotatedCenter = pointInParentCoordinates(doc, node.parentId, applyMatrix(matrix, currentCenter));
    return {
      ...node,
      x: rotatedCenter.x - node.width / 2,
      y: rotatedCenter.y - node.height / 2,
      rotation: node.rotation + angle,
    };
  });
}

export function alignSelection(doc: DesignDocument, ids: string[], operation: AlignOperation): EditorNode[] {
  const entries = ids.flatMap((id) => {
    const node = getNode(doc, id);
    return node ? [{ id, node, bounds: getNodeBounds(doc, node) }] : [];
  });
  if (entries.length < 2) return doc.nodes;
  const group = entries.reduce((result, entry) => ({
    x: Math.min(result.x, entry.bounds.x),
    y: Math.min(result.y, entry.bounds.y),
    right: Math.max(result.right, entry.bounds.x + entry.bounds.width),
    bottom: Math.max(result.bottom, entry.bounds.y + entry.bounds.height),
  }), { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity });
  const targets = new Map<string, Point>();

  if (operation === 'distribute-horizontal' || operation === 'distribute-vertical') {
    if (entries.length < 3) return doc.nodes;
    const horizontal = operation === 'distribute-horizontal';
    const sorted = [...entries].sort((a, b) => worldCenter(a.bounds)[horizontal ? 'x' : 'y'] - worldCenter(b.bounds)[horizontal ? 'x' : 'y']);
    const start = horizontal ? group.x : group.y;
    const end = horizontal ? group.right : group.bottom;
    const sizes = sorted.map((entry) => horizontal ? entry.bounds.width : entry.bounds.height);
    const gap = (end - start - sizes.reduce((sum, size) => sum + size, 0)) / (sorted.length - 1);
    let cursor = start;
    sorted.forEach((entry, index) => {
      const size = sizes[index];
      const current = worldCenter(entry.bounds);
      targets.set(entry.id, horizontal
        ? { x: cursor + size / 2, y: current.y }
        : { x: current.x, y: cursor + size / 2 });
      cursor += size + gap;
    });
  } else {
    entries.forEach((entry) => {
      const current = worldCenter(entry.bounds);
      let { x, y } = current;
      if (operation === 'left') x = group.x + entry.bounds.width / 2;
      if (operation === 'horizontal-center') x = (group.x + group.right) / 2;
      if (operation === 'right') x = group.right - entry.bounds.width / 2;
      if (operation === 'top') y = group.y + entry.bounds.height / 2;
      if (operation === 'vertical-center') y = (group.y + group.bottom) / 2;
      if (operation === 'bottom') y = group.bottom - entry.bounds.height / 2;
      targets.set(entry.id, { x, y });
    });
  }

  return entries.reduce((nodes, entry) => {
    const current = worldCenter(entry.bounds);
    const target = targets.get(entry.id)!;
    const delta = localVector(doc, entry.node, { x: target.x - current.x, y: target.y - current.y });
    return moveNodeTree(nodes, entry.id, delta.x, delta.y);
  }, doc.nodes);
}
