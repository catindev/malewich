import type { DesignDocument, EditorNode, FrameNode, VectorNode } from '../types';
import { createId, createNode, getNode, getNodeBounds, getWorldRotation, isDescendant } from './document';
import { mergeBounds } from './geometry';
import { getActivePageId } from './pages';

function selectedRoots(doc: DesignDocument, ids: string[]): EditorNode[] {
  return ids.flatMap((id) => {
    const node = getNode(doc, id);
    return node && !ids.some((other) => other !== id && isDescendant(doc, id, other)) ? [node] : [];
  });
}

export function groupNodes(doc: DesignDocument, ids: string[], asFrame = false): { nodes: EditorNode[]; groupId: string } | null {
  const roots = selectedRoots(doc, ids);
  if (roots.length === 0 || roots.some((node) => node.parentId !== roots[0].parentId)) return null;
  const bounds = mergeBounds(roots.map((node) => getNodeBounds(doc, node)));
  const parentId = roots[0].parentId;
  const group = {
    ...(createNode('frame', bounds.x, bounds.y, bounds.width, bounds.height) as FrameNode),
    id: createId(asFrame ? 'frame' : 'group'),
    name: asFrame ? 'Фрейм' : 'Группа',
    parentId,
    pageId: parentId ? undefined : getActivePageId(doc),
    fill: 'transparent',
    clip: false,
    isGroup: !asFrame,
  };
  const selected = new Set(roots.map((node) => node.id));
  const nodes = doc.nodes.map((node) => selected.has(node.id) ? { ...node, parentId: group.id } : node);
  nodes.splice(Math.min(...roots.map((node) => doc.nodes.indexOf(node))), 0, group);
  return { nodes, groupId: group.id };
}

export function moveNodesToPage(doc: DesignDocument, ids: string[], pageId: string): EditorNode[] {
  const roots = selectedRoots(doc, ids);
  const moved = new Map(roots.map((node) => {
    const bounds = getNodeBounds(doc, node);
    return [node.id, {
      ...node,
      parentId: null,
      pageId,
      x: bounds.x + bounds.width / 2 - node.width / 2,
      y: bounds.y + bounds.height / 2 - node.height / 2,
      rotation: getWorldRotation(doc, node),
    } as EditorNode];
  }));
  return doc.nodes.map((node) => moved.get(node.id) ?? node);
}

export function reorderNodeToEdge(nodes: EditorNode[], id: string, edge: 'front' | 'back'): EditorNode[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index < 0) return nodes;
  const node = nodes[index];
  const siblings = nodes.map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidate }) => candidate.parentId === node.parentId);
  const target = edge === 'front' ? siblings.at(-1)! : siblings[0];
  if (target.candidateIndex === index) return nodes;
  const next = nodes.filter((candidate) => candidate.id !== id);
  const targetIndex = next.findIndex((candidate) => candidate.id === target.candidate.id);
  next.splice(targetIndex + (edge === 'front' ? 1 : 0), 0, node);
  return next;
}

function roundedRectPath(width: number, height: number, radius: number, x = 0, y = 0): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) return `M${x} ${y}H${x + width}V${y + height}H${x}Z`;
  return `M${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + height - r}Q${x + width} ${y + height} ${x + width - r} ${y + height}H${x + r}Q${x} ${y + height} ${x} ${y + height - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

function ellipsePath(x: number, y: number, width: number, height: number): string {
  const rx = width / 2;
  const ry = height / 2;
  const cx = x + rx;
  const cy = y + ry;
  const k = 0.5522847498;
  return `M${cx} ${y}C${cx + rx * k} ${y} ${x + width} ${cy - ry * k} ${x + width} ${cy}C${x + width} ${cy + ry * k} ${cx + rx * k} ${y + height} ${cx} ${y + height}C${cx - rx * k} ${y + height} ${x} ${cy + ry * k} ${x} ${cy}C${x} ${cy - ry * k} ${cx - rx * k} ${y} ${cx} ${y}Z`;
}

function shapePath(node: EditorNode, inset = 0): string | null {
  const width = Math.max(0, node.width - inset * 2);
  const height = Math.max(0, node.height - inset * 2);
  if (node.type === 'rectangle') {
    const radius = Math.max(0, node.cornerRadius - inset);
    return roundedRectPath(width, height, radius, inset, inset);
  }
  if (node.type === 'ellipse') return ellipsePath(inset, inset, width, height);
  return null;
}

function asVector(node: EditorNode, path: string, fill: string): VectorNode {
  const base: Record<string, unknown> = { ...node };
  delete base.cornerRadius;
  return {
    ...base,
    type: 'vector',
    fill,
    path,
    pathWidth: node.width,
    pathHeight: node.height,
    fillRule: 'evenodd',
  } as VectorNode;
}

export function flattenNodes(nodes: EditorNode[], ids: string[]): EditorNode[] {
  const selected = new Set(ids);
  return nodes.map((node) => {
    if (!selected.has(node.id) || (node.type !== 'rectangle' && node.type !== 'ellipse')) return node;
    return asVector(node, shapePath(node)!, node.fill);
  });
}

export function canOutlineStroke(node: EditorNode): boolean {
  return (node.type === 'rectangle' || node.type === 'ellipse') && node.strokeWidth > 0 && node.stroke !== 'transparent';
}

export function outlineNodeStrokes(nodes: EditorNode[], ids: string[]): EditorNode[] {
  const selected = new Set(ids);
  return nodes.map((node) => {
    if (!selected.has(node.id) || !canOutlineStroke(node)) return node;
    const inset = Math.min(node.strokeWidth / 2, node.width / 2, node.height / 2);
    return asVector(node, `${shapePath(node)!} ${shapePath(node, inset)!}`, node.stroke);
  });
}

export function flipNodes(nodes: EditorNode[], ids: string[], axis: 'horizontal' | 'vertical'): EditorNode[] {
  const selected = new Set(ids);
  const key = axis === 'horizontal' ? 'flipX' : 'flipY';
  return nodes.map((node) => selected.has(node.id) ? { ...node, [key]: !node[key] } : node);
}
