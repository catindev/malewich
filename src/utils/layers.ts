import type { EditorNode } from '../types';

export interface LayerListRow {
  node: EditorNode;
  depth: number;
  hasChildren: boolean;
}

/** Flatten only the expanded tree, preserving the existing top-first z-order. */
export function flattenLayerRows(
  childrenByParent: ReadonlyMap<string | null, EditorNode[]>,
  collapsed: ReadonlySet<string>,
): LayerListRow[] {
  const rows: LayerListRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    const children = childrenByParent.get(parentId) ?? [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const node = children[index];
      const hasChildren = (childrenByParent.get(node.id)?.length ?? 0) > 0;
      rows.push({ node, depth, hasChildren });
      if (hasChildren && !collapsed.has(node.id)) visit(node.id, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}
