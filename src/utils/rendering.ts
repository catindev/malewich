import { GraphicsPath, Polygon } from 'pixi.js';

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 256;

/**
 * Canvas text is a texture: match its resolution to both Retina and canvas zoom.
 * Long textures are tiled by the renderer, so this no longer needs an 8x cap.
 */
export function textResolutionForZoom(zoom: number, devicePixelRatio = 1): number {
  const baseResolution = Math.min(2, Math.max(1, devicePixelRatio));
  return Math.min(MAX_ZOOM * 2, Math.max(1, baseResolution * zoom));
}

interface VectorContour {
  data: string;
  polygon: Polygon;
  area: number;
  direction: number;
  parent?: VectorContour;
  winding: number;
  role: 'outer' | 'hole' | 'internal';
  group?: VectorContour;
}

function signedArea(polygon: Polygon): number {
  let area = 0;
  const points = polygon.points;
  for (let index = 0; index < points.length; index += 2) {
    const next = (index + 2) % points.length;
    area += points[index] * points[next + 1] - points[next] * points[index + 1];
  }
  return area / 2;
}

function readContour(data: string): VectorContour | undefined {
  const path = new GraphicsPath(data);
  const primitives = path.shapePath.shapePrimitives;
  if (primitives.length !== 1 || !(primitives[0].shape instanceof Polygon)) return undefined;
  const polygon = primitives[0].shape;
  const area = signedArea(polygon);
  if (!/z\s*$/i.test(data) || Math.abs(area) < 0.000001) return undefined;
  return { data, polygon, area: Math.abs(area), direction: Math.sign(area), winding: 0, role: 'outer' };
}

/**
 * Pixi 8 detects SVG holes only for `evenodd`, and only in particular path
 * orders. Convert filled contours into outer+hole groups using their actual
 * winding. Open strokes and unsupported path commands retain the original path.
 */
export function vectorFillPaths(data: string, fillRule: 'nonzero' | 'evenodd' = 'nonzero'): string[] {
  const parts = data.split(/(?=[Mm])/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return [data];
  const contours = parts.map(readContour);
  const closed = contours.filter((contour): contour is VectorContour => contour !== undefined);
  // Keep the original path when it contains commands outside our editable
  // M/L/Q/C/Z contour model rather than dropping any artwork.
  if (closed.length !== parts.length) return [data];

  for (const contour of closed) {
    const containers = closed.filter((candidate) => candidate !== contour
      && candidate.area > contour.area
      && candidate.polygon.containsPolygon(contour.polygon));
    contour.parent = containers.sort((left, right) => left.area - right.area)[0];
  }

  const ordered = [...closed].sort((left, right) => {
    let leftDepth = 0;
    let rightDepth = 0;
    for (let parent = left.parent; parent; parent = parent.parent) leftDepth += 1;
    for (let parent = right.parent; parent; parent = parent.parent) rightDepth += 1;
    return leftDepth - rightDepth;
  });
  for (const contour of ordered) {
    if (fillRule === 'evenodd') {
      const parent = contour.parent;
      contour.role = parent && parent.role === 'outer' ? 'hole' : 'outer';
      contour.group = contour.role === 'hole' ? parent?.group : contour;
      continue;
    }
    const parentWinding = contour.parent?.winding ?? 0;
    contour.winding = parentWinding + contour.direction;
    if (parentWinding === 0 && contour.winding !== 0) {
      contour.role = 'outer';
      contour.group = contour;
    } else if (parentWinding !== 0 && contour.winding === 0) {
      contour.role = 'hole';
      let parent = contour.parent;
      while (parent && parent.role !== 'outer') parent = parent.parent;
      contour.group = parent?.group ?? contour;
    } else {
      // Same-direction nested contours do not change nonzero coverage.
      contour.role = 'internal';
      contour.group = contour.parent?.group;
    }
  }

  return ordered.filter((contour) => contour.role === 'outer').map((outer) => [
    outer.data,
    ...closed.filter((contour) => contour.role === 'hole' && contour.group === outer).map((contour) => contour.data),
  ].join(' '));
}
