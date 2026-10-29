import type { DesignDocument, EditorNode, Matrix, Point } from '../types';
import { applyMatrix, identityMatrix, invertMatrix, multiplyMatrix, nodeMatrix } from './geometry';

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

/** Geometry hit-testing for the WebGL canvas; no DOM node per scene layer is required. */
export function hitTestNode(doc: DesignDocument, point: Point): EditorNode | null {
  const nodes = indexScene(doc);
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const { node, world, visible } = nodes[index];
    if (!visible) continue;
    const local = applyMatrix(invertMatrix(world), point);
    if (
      local.x >= node.x && local.x <= node.x + node.width &&
      local.y >= node.y && local.y <= node.y + node.height
    ) return node;
  }
  return null;
}
