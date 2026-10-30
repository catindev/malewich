import type { DesignDocument, EditorNode } from '../types';

export interface DocumentChange {
  revision: number;
  /** A different document replaced the current scene. */
  full: boolean;
  /** Parentage, node membership or sibling order changed. */
  structureChanged: boolean;
  /** Only X/Y changed on existing nodes, with no document metadata changes. */
  translationOnly: boolean;
  changedIds: ReadonlySet<string>;
  deletedIds: ReadonlySet<string>;
  changedProps: ReadonlyMap<string, ReadonlySet<string>>;
}

export const EMPTY_DOCUMENT_CHANGE: DocumentChange = {
  revision: 0,
  full: false,
  structureChanged: false,
  translationOnly: false,
  changedIds: new Set(),
  deletedIds: new Set(),
  changedProps: new Map(),
};

function metadataChanged(before: DesignDocument, after: DesignDocument): boolean {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (key === 'nodes' || key === 'updatedAt') continue;
    if (!Object.is(
      before[key as keyof DesignDocument],
      after[key as keyof DesignDocument],
    )) return true;
  }
  return false;
}

function changedNodeProps(before: EditorNode | undefined, after: EditorNode): Set<string> {
  const changed = new Set<string>();
  if (!before) {
    Object.keys(after).forEach((key) => changed.add(key));
    return changed;
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (!Object.is(
      before[key as keyof EditorNode],
      after[key as keyof EditorNode],
    )) changed.add(key);
  }
  return changed;
}

let revision = 0;

/** One diff shared by derived document work, React and the retained renderer. */
export function deriveDocumentChange(before: DesignDocument, after: DesignDocument): DocumentChange {
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const beforeSiblingIndexes = new Map<string, number>();
  const beforeCounts = new Map<string | null, number>();
  for (const node of before.nodes) {
    const index = beforeCounts.get(node.parentId) ?? 0;
    beforeSiblingIndexes.set(node.id, index);
    beforeCounts.set(node.parentId, index + 1);
  }

  const changedIds = new Set<string>();
  const changedProps = new Map<string, ReadonlySet<string>>();
  const afterIds = new Set<string>();
  const afterCounts = new Map<string | null, number>();
  let structureChanged = before.id !== after.id;
  for (const node of after.nodes) {
    afterIds.add(node.id);
    const previous = beforeNodes.get(node.id);
    const props = changedNodeProps(previous, node);
    if (props.size > 0) {
      changedIds.add(node.id);
      changedProps.set(node.id, props);
    }
    if (!previous || previous.parentId !== node.parentId) structureChanged = true;

    const siblingIndex = afterCounts.get(node.parentId) ?? 0;
    afterCounts.set(node.parentId, siblingIndex + 1);
    if (previous && previous.parentId === node.parentId && beforeSiblingIndexes.get(node.id) !== siblingIndex) {
      structureChanged = true;
    }
  }
  const deletedIds = new Set<string>();
  for (const node of before.nodes) {
    if (!afterIds.has(node.id)) {
      deletedIds.add(node.id);
      structureChanged = true;
    }
  }

  const metadata = metadataChanged(before, after);
  const translationOnly = changedIds.size > 0 && deletedIds.size === 0 && !structureChanged && !metadata &&
    [...changedProps.values()].every((props) => [...props].every((key) => key === 'x' || key === 'y'));

  revision += 1;
  return {
    revision,
    full: before.id !== after.id,
    structureChanged,
    translationOnly,
    changedIds,
    deletedIds,
    changedProps,
  };
}
