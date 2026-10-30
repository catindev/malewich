import type { DesignDocument, Point, Viewport } from '../types';
import { flattenDocument, getNode, getNodeBounds } from './document';
import { clamp, mergeBounds } from './geometry';
import { getPageDocument } from './pages';
import { MAX_ZOOM, MIN_ZOOM } from './rendering';

export interface ViewportSize {
  width: number;
  height: number;
}

export function zoomViewportAt(current: Viewport, nextZoom: number, localPoint: Point): Viewport {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const worldX = (localPoint.x - current.x) / current.zoom;
  const worldY = (localPoint.y - current.y) / current.zoom;
  return { zoom, x: localPoint.x - worldX * zoom, y: localPoint.y - worldY * zoom };
}

function fitViewport(nodes: DesignDocument['nodes'], doc: DesignDocument, rect: ViewportSize, padding: number, maxZoom: number): Viewport {
  const bounds = mergeBounds(nodes.map((node) => getNodeBounds(doc, node)));
  const zoom = clamp(Math.min(
    (rect.width - padding) / Math.max(bounds.width, 1),
    (rect.height - padding) / Math.max(bounds.height, 1),
  ), MIN_ZOOM, maxZoom);
  return {
    zoom,
    x: rect.width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: rect.height / 2 - (bounds.y + bounds.height / 2) * zoom,
  };
}

export function fitViewportToContent(doc: DesignDocument, rect: ViewportSize): Viewport {
  const pageDoc = getPageDocument(doc);
  const visibleNodes = flattenDocument(pageDoc).filter((node) => node.visible);
  return fitViewport(visibleNodes, pageDoc, rect, 100, 1.5);
}

export function fitViewportToSelection(doc: DesignDocument, selection: string[], rect: ViewportSize): Viewport {
  const nodes = selection.flatMap((id) => {
    const node = getNode(doc, id);
    return node?.visible ? [node] : [];
  });
  if (nodes.length === 0) return fitViewportToContent(doc, rect);
  return fitViewport(nodes, doc, rect, 120, MAX_ZOOM);
}
