import type { LinearNode, ParametricShapeNode, Point } from '../types';
import { applyMatrix, nodeMatrix, round } from './geometry';

export interface LinearEndpoints {
  start: Point;
  end: Point;
}

/** Actual endpoints in parent coordinates, including the node's rotation and flips. */
export function linearEndpoints(node: LinearNode): LinearEndpoints {
  const matrix = nodeMatrix(node);
  return {
    start: applyMatrix(matrix, { x: node.x, y: node.y }),
    end: applyMatrix(matrix, { x: node.x + node.width, y: node.y }),
  };
}

/** Store a segment as start + length + angle; renderers derive all paths from it. */
export function linearNodePatch(start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    x: start.x,
    y: start.y,
    width: Math.hypot(dx, dy),
    height: 0,
    rotation: Math.atan2(dy, dx) * 180 / Math.PI,
    flipX: false,
    flipY: false,
  };
}

export function constrainedEndpoint(start: Point, end: Point, constrain: boolean): Point {
  if (!constrain) return end;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
}

export function arrowHeadLength(node: LinearNode): number {
  return Math.min(24, Math.max(6, node.strokeWidth * 3));
}

function segment(start: Point, end: Point): [Point, Point] {
  return [start, end];
}

/** Unrotated local segments; the common node/world matrix is applied by the caller. */
export function linearSegments(node: LinearNode): [Point, Point][] {
  const start = { x: node.x, y: node.y };
  const end = { x: node.x + node.width, y: node.y };
  const segments: [Point, Point][] = [segment(start, end)];
  if (node.type !== 'arrow') return segments;
  const head = arrowHeadLength(node);
  const halfHeight = head * 0.6;
  if (node.startArrowhead) {
    segments.push(
      segment(start, { x: start.x + head, y: start.y - halfHeight }),
      segment(start, { x: start.x + head, y: start.y + halfHeight }),
    );
  }
  if (node.endArrowhead) {
    segments.push(
      segment(end, { x: end.x - head, y: end.y - halfHeight }),
      segment(end, { x: end.x - head, y: end.y + halfHeight }),
    );
  }
  return segments;
}

export function linearPath(node: LinearNode): string {
  return linearSegments(node)
    .map(([start, end]) => `M${round(start.x, 4)} ${round(start.y, 4)}L${round(end.x, 4)} ${round(end.y, 4)}`)
    .join(' ');
}

/** Regular polygon/star vertices are derived from the current box and original parameters. */
export function parametricShapePath(node: ParametricShapeNode): string {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const rx = node.width / 2;
  const ry = node.height / 2;
  const count = node.type === 'polygon'
    ? Math.max(3, Math.min(100, Math.round(node.sides)))
    : Math.max(3, Math.min(100, Math.round(node.points))) * 2;
  const innerRatio = node.type === 'star' ? Math.max(0.01, Math.min(1, node.innerRadius)) : 1;
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const ratio = node.type === 'star' && index % 2 === 1 ? innerRatio : 1;
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    points.push({ x: cx + Math.cos(angle) * rx * ratio, y: cy + Math.sin(angle) * ry * ratio });
  }
  return points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'}${round(point.x, 4)} ${round(point.y, 4)}`,
  ).join(' ') + 'Z';
}
