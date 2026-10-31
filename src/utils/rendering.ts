import { GraphicsPath, Polygon } from 'pixi.js';
import { parseSVGPath } from '@open-pencil/scene-graph/parse-path';
import type { EditorNode, VectorNode } from '../types';
import { parametricShapePath } from './shapes';

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

/** Keep culling overscan proportional to the viewport instead of allocating a large fixed margin. */
export function previewOverscan(width: number, height: number): number {
  if (!(width > 0 && height > 0)) return 0;
  return Math.min(128, Math.min(width, height) / 8);
}

/** A zero-width/height Figma line still has a visible stroke or expanded outline. */
export function vectorScale(node: Pick<VectorNode, 'width' | 'height' | 'pathWidth' | 'pathHeight'>): { x: number; y: number } {
  return {
    x: node.width === 0 ? 1 : node.width / node.pathWidth,
    y: node.height === 0 ? 1 : node.height / node.pathHeight,
  };
}

interface DashPoint { x: number; y: number }

/** Flatten only for stroking; the editable document retains the original curves. */
export function dashVectorPath(data: string, pattern: number[]): string {
  const intervals = pattern.filter((value) => Number.isFinite(value) && value > 0);
  if (intervals.length === 0 || !data) return data;
  const network = parseSVGPath(data);
  if (network.segments.length === 0) return data;
  const number = (value: number) => String(Math.abs(value) < 0.0005 ? 0 : Number(value.toFixed(3)));
  const point = (value: DashPoint) => `${number(value.x)} ${number(value.y)}`;
  const commands: string[] = [];
  let patternIndex = 0;
  let remaining = intervals[0];
  let drawing = true;
  let dashOpen = false;
  let previousVertex = -1;

  for (const segment of network.segments) {
    if (segment.start !== previousVertex) {
      patternIndex = 0;
      remaining = intervals[0];
      drawing = true;
      dashOpen = false;
    }
    const start = network.vertices[segment.start];
    const end = network.vertices[segment.end];
    const controlA = { x: start.x + segment.tangentStart.x, y: start.y + segment.tangentStart.y };
    const controlB = { x: end.x + segment.tangentEnd.x, y: end.y + segment.tangentEnd.y };
    const curved = segment.tangentStart.x !== 0 || segment.tangentStart.y !== 0 || segment.tangentEnd.x !== 0 || segment.tangentEnd.y !== 0;
    const steps = curved ? 24 : 1;
    let from = start;
    for (let stepIndex = 1; stepIndex <= steps; stepIndex += 1) {
      const t = stepIndex / steps;
      const u = 1 - t;
      const to = curved ? {
        x: u * u * u * start.x + 3 * u * u * t * controlA.x + 3 * u * t * t * controlB.x + t * t * t * end.x,
        y: u * u * u * start.y + 3 * u * u * t * controlA.y + 3 * u * t * t * controlB.y + t * t * t * end.y,
      } : end;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (length > 0.000001) {
        const at = (distance: number): DashPoint => ({
          x: from.x + (to.x - from.x) * distance / length,
          y: from.y + (to.y - from.y) * distance / length,
        });
        let travelled = 0;
        while (travelled < length - 0.000001) {
          const step = Math.min(remaining, length - travelled);
          const next = at(travelled + step);
          if (drawing) {
            if (!dashOpen) commands.push(`M${point(at(travelled))}`);
            commands.push(`L${point(next)}`);
            dashOpen = true;
          } else dashOpen = false;
          travelled += step;
          remaining -= step;
          if (remaining <= 0.000001) {
            patternIndex = (patternIndex + 1) % intervals.length;
            remaining = intervals[patternIndex];
            drawing = !drawing;
            dashOpen = false;
          }
        }
      }
      from = to;
    }
    previousVertex = segment.end;
  }
  return commands.join(' ');
}

/** Pixel-space outline used only when a shape stroke needs native-style dashes in Pixi. */
export function shapeOutlinePath(node: EditorNode): string {
  const { x, y, width: w, height: h } = node;
  if (node.type === 'polygon' || node.type === 'star') return parametricShapePath(node);
  if (node.type === 'ellipse') {
    const rx = w / 2;
    const ry = h / 2;
    const cx = x + rx;
    const cy = y + ry;
    const k = 0.5522847498;
    return [
      `M${cx + rx} ${cy}`,
      `C${cx + rx} ${cy + k * ry} ${cx + k * rx} ${cy + ry} ${cx} ${cy + ry}`,
      `C${cx - k * rx} ${cy + ry} ${cx - rx} ${cy + k * ry} ${cx - rx} ${cy}`,
      `C${cx - rx} ${cy - k * ry} ${cx - k * rx} ${cy - ry} ${cx} ${cy - ry}`,
      `C${cx + k * rx} ${cy - ry} ${cx + rx} ${cy - k * ry} ${cx + rx} ${cy} Z`,
    ].join(' ');
  }
  const radius = 'cornerRadius' in node ? Math.min(node.cornerRadius, w / 2, h / 2) : 0;
  if (radius <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return [
    `M${x + radius} ${y}H${x + w - radius}`,
    `Q${x + w} ${y} ${x + w} ${y + radius}V${y + h - radius}`,
    `Q${x + w} ${y + h} ${x + w - radius} ${y + h}H${x + radius}`,
    `Q${x} ${y + h} ${x} ${y + h - radius}V${y + radius}`,
    `Q${x} ${y} ${x + radius} ${y}Z`,
  ].join(' ');
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
