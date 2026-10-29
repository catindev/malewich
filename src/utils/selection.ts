import type { DesignDocument, EditorNode } from '../types';
import { getAncestors } from './document';

/**
 * Matches Figma's drill-down selection: the first click selects the top-level
 * frame, repeated clicks enter the hierarchy, and Cmd/Ctrl clicks select deep.
 */
export function getSelectionTarget(
  doc: DesignDocument,
  node: EditorNode,
  selection: string[],
  deepSelect = false,
): string {
  if (deepSelect || selection.includes(node.id)) return node.id;
  const ancestors = getAncestors(doc, node);
  if (ancestors.length === 0) return node.id;

  const selectedNode = selection.length === 1
    ? doc.nodes.find((candidate) => candidate.id === selection[0])
    : undefined;
  if (selectedNode && selectedNode.parentId === node.parentId) return node.id;

  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    if (selection.includes(ancestors[index].id)) {
      return ancestors[index + 1]?.id ?? node.id;
    }
  }
  return ancestors[0].id;
}
