import type { DesignDocument, EditorNode, FrameNode } from '../types';
import { isEditorNodeEqual } from './document';

function defaultPadding() {
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

export function createAutoLayout(direction: 'horizontal' | 'vertical' = 'vertical') {
  return {
    direction,
    gap: 16,
    padding: defaultPadding(),
    align: 'start' as const,
    justify: 'start' as const,
    hug: false,
  };
}

function clampSize(value: number, min?: number, max?: number): number {
  return Math.max(0, Math.min(max ?? Infinity, Math.max(min ?? 0, value)));
}

function setSize(node: EditorNode, horizontal: boolean, value: number): boolean {
  const layout = node.layout;
  const next = horizontal
    ? clampSize(value, layout?.minWidth, layout?.maxWidth)
    : clampSize(value, layout?.minHeight, layout?.maxHeight);
  const key = horizontal ? 'width' : 'height';
  if (node[key] === next) return false;
  node[key] = next;
  return true;
}

export function applyAutoLayout(doc: DesignDocument, scope?: ReadonlySet<string>): DesignDocument {
  if (scope?.size === 0) return doc;
  let result = doc;
  for (let pass = 0; pass < 6; pass += 1) {
    const nodes = result.nodes.map((node) => ({ ...node }));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const childrenByParent = new Map<string | null, EditorNode[]>();
    for (const node of nodes) {
      const children = childrenByParent.get(node.parentId) ?? [];
      children.push(node);
      childrenByParent.set(node.parentId, children);
    }
    const visited = new Set<string>();
    let changed = false;

    const moveTree = (node: EditorNode, x: number, y: number) => {
      if (node.x === x && node.y === y) return;
      const dx = x - node.x;
      const dy = y - node.y;
      const current = byId.get(node.id) ?? node;
      current.x = x;
      current.y = y;
      const translateDescendants = (parent: EditorNode) => {
        for (const child of childrenByParent.get(parent.id) ?? []) {
          child.x += dx;
          child.y += dy;
          translateDescendants(child);
        }
      };
      translateDescendants(current);
      changed = true;
    };

    const visit = (frame: FrameNode) => {
      if (visited.has(frame.id)) return;
      visited.add(frame.id);
      (childrenByParent.get(frame.id) ?? [])
        .filter((node): node is FrameNode => node.type === 'frame')
        .forEach(visit);
      const layout = frame.autoLayout;
      if (!layout || (scope && !scope.has(frame.id))) return;
      const horizontal = layout.direction === 'horizontal';
      const border = frame.stroke !== 'transparent' && frame.strokeWidth > 0 ? frame.strokeWidth : 0;
      const padding = {
        top: layout.padding.top + border,
        right: layout.padding.right + border,
        bottom: layout.padding.bottom + border,
        left: layout.padding.left + border,
      };
      const children = (childrenByParent.get(frame.id) ?? [])
        .filter((node) => node.visible && !node.layout?.absolute);
      const mainOf = (node: EditorNode) => horizontal ? node.width : node.height;
      const crossOf = (node: EditorNode) => horizontal ? node.height : node.width;
      const gaps = Math.max(0, children.length - 1) * layout.gap;
      const currentMain = children.reduce((sum, child) => sum + mainOf(child), 0) + gaps;
      const currentCross = children.length ? Math.max(...children.map(crossOf)) : 0;
      const mainHug = horizontal ? layout.hug || layout.widthMode === 'hug' : layout.hug || layout.heightMode === 'hug';
      const crossHug = horizontal ? layout.heightMode === 'hug' : layout.widthMode === 'hug';

      if (mainHug) {
        const size = currentMain + (horizontal ? padding.left + padding.right : padding.top + padding.bottom);
        if (setSize(frame, horizontal, size)) changed = true;
      }
      if (crossHug) {
        const size = currentCross + (horizontal ? padding.top + padding.bottom : padding.left + padding.right);
        if (setSize(frame, !horizontal, size)) changed = true;
      }
      const width = clampSize(frame.width, layout.minWidth, layout.maxWidth);
      const height = clampSize(frame.height, layout.minHeight, layout.maxHeight);
      if (frame.width !== width || frame.height !== height) {
        frame.width = width;
        frame.height = height;
        changed = true;
      }

      const availableMain = Math.max(0, horizontal
        ? frame.width - padding.left - padding.right
        : frame.height - padding.top - padding.bottom);
      const availableCross = Math.max(0, horizontal
        ? frame.height - padding.top - padding.bottom
        : frame.width - padding.left - padding.right);
      const mainProperty = horizontal ? 'horizontal' : 'vertical';
      const crossProperty = horizontal ? 'vertical' : 'horizontal';
      const fillMain = children.filter((child) => child.layout?.[mainProperty] === 'fill');
      const fixedMain = children.filter((child) => child.layout?.[mainProperty] !== 'fill')
        .reduce((sum, child) => sum + mainOf(child), 0) + gaps;
      if (fillMain.length > 0) {
        const fillSize = Math.max(0, availableMain - fixedMain) / fillMain.length;
        fillMain.forEach((child) => {
          if (setSize(child, horizontal, fillSize)) changed = true;
        });
      }
      children.forEach((child) => {
        if (child.layout?.[crossProperty] === 'fill' && setSize(child, !horizontal, availableCross)) changed = true;
      });

      const contentMain = children.reduce((sum, child) => sum + mainOf(child), 0) + gaps;
      const free = availableMain - contentMain;
      let cursor = horizontal ? frame.x + padding.left : frame.y + padding.top;
      if (layout.justify === 'center') cursor += free / 2;
      if (layout.justify === 'end') cursor += free;
      const between = layout.justify === 'space-between' && children.length > 1
        ? layout.gap + free / (children.length - 1)
        : layout.gap;

      children.forEach((child) => {
        const crossFree = availableCross - crossOf(child);
        const crossOffset = child.layout?.[crossProperty] === 'fill'
          ? 0 : layout.align === 'center' ? crossFree / 2 : layout.align === 'end' ? crossFree : 0;
        const x = horizontal ? cursor : frame.x + padding.left + crossOffset;
        const y = horizontal ? frame.y + padding.top + crossOffset : cursor;
        moveTree(child, x, y);
        cursor += mainOf(child) + between;
      });
    };

    nodes.filter((node): node is FrameNode => node.type === 'frame').forEach(visit);
    if (!changed) break;
    // A scoped reflow must not make untouched siblings look edited to WeakMap
    // indexes, React memoization or the retained renderer.
    const preserved = nodes.map((node, index) => isEditorNodeEqual(node, result.nodes[index]) ? result.nodes[index] : node);
    result = { ...result, nodes: preserved };
  }
  return result;
}
