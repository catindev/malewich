import type { DesignDocument, EditorNode, Matrix, Point } from '../types';
import { applyMatrix, identityMatrix, invertMatrix, multiplyMatrix, nodeMatrix } from './geometry';
import { linearSegments } from './shapes';

interface IndexedNode {
  node: EditorNode;
  world: Matrix;
  visible: boolean;
}

/** Build world transforms and inherited visibility once, instead of repeatedly walking ancestors. */
function indexScene(doc: DesignDocument): IndexedNode[] {
  const nodesById = new Map(doc.nodes.map((node) => [node.id, node]));
  const children = new Map<string | null, EditorNode[]>();
  doc.nodes.forEach((node) => {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  });
  const result: IndexedNode[] = [];
  const visit = (parentId: string | null, parentWorld: Matrix, parentVisible: boolean) => {
    for (const node of children.get(parentId) ?? []) {
      // A missing parent is treated as a root in malformed legacy documents.
      const world = multiplyMatrix(parentWorld, nodeMatrix(node));
      const visible = parentVisible && node.visible;
      result.push({ node, world, visible });
      if (nodesById.has(node.id)) visit(node.id, world, visible);
    }
  };
  visit(null, identityMatrix(), true);
  return result;
}

function pointSegmentDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared > 0
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
}

/** Geometry hit-testing for the WebGL canvas; no DOM node per scene layer is required. */
export function hitTestNode(doc: DesignDocument, point: Point): EditorNode | null {
  const nodes = indexScene(doc);
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const { node, world, visible } = nodes[index];
    if (!visible) continue;
    const local = applyMatrix(invertMatrix(world), point);
    if (node.type === 'line' || node.type === 'arrow') {
      // Zero-height segments remain selectable around their visible stroke,
      // including arrowheads outside the shaft's geometric bounds.
      const tolerance = Math.max(4, node.strokeWidth / 2);
      if (linearSegments(node).some(([start, end]) =>
        pointSegmentDistance(local, start, end) <= tolerance,
      )) return node;
    }
    if (
      local.x >= node.x && local.x <= node.x + node.width &&
      local.y >= node.y && local.y <= node.y + node.height
    ) return node;
  }
  return null;
}
