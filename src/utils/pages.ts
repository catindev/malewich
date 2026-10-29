import type { DesignDocument, EditorNode, PageDefinition } from '../types';
import { getDescendantIds, getNode } from './document';

export const LEGACY_PAGE_ID = 'page-1';

export function getDocumentPages(doc: DesignDocument): PageDefinition[] {
  return doc.pages?.length ? doc.pages : [{ id: LEGACY_PAGE_ID, name: 'Страница 1' }];
}

export function getActivePageId(doc: DesignDocument): string {
  const pages = getDocumentPages(doc);
  return pages.some((page) => page.id === doc.activePageId)
    ? doc.activePageId!
    : pages[0].id;
}

export function getPageRoots(doc: DesignDocument, pageId = getActivePageId(doc)): EditorNode[] {
  return doc.nodes.filter((node) => node.parentId === null && (node.pageId ?? LEGACY_PAGE_ID) === pageId);
}

export function getPageNodeIds(doc: DesignDocument, pageId = getActivePageId(doc)): Set<string> {
  return new Set(getPageRoots(doc, pageId).flatMap((node) => [node.id, ...getDescendantIds(doc, node.id)]));
}

export function getPageDocument(doc: DesignDocument, pageId = getActivePageId(doc)): DesignDocument {
  const ids = getPageNodeIds(doc, pageId);
  return { ...doc, activePageId: pageId, nodes: doc.nodes.filter((node) => ids.has(node.id)) };
}

export function getNodePageId(doc: DesignDocument, node: EditorNode): string {
  let current: EditorNode | undefined = node;
  while (current?.parentId) current = getNode(doc, current.parentId);
  return current?.pageId ?? LEGACY_PAGE_ID;
}

/** Materialize legacy page metadata before a page command or a new root is inserted. */
export function ensureDocumentPages(doc: DesignDocument): DesignDocument {
  const pages = getDocumentPages(doc);
  const activePageId = getActivePageId(doc);
  return {
    ...doc,
    pages,
    activePageId,
    nodes: doc.nodes.map((node) => node.parentId === null && !node.pageId
      ? { ...node, pageId: activePageId }
      : node),
  };
}
