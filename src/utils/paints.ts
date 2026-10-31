import { FillGradient } from 'pixi.js';
import { gradientPoint, invertGradientTransform } from '@open-pencil/scene-graph/gradient';
import type { EditorNode, GradientFillDefinition, GradientTransform } from '../types';

export function gradientId(node: EditorNode, prefix = ''): string {
  return `${prefix}gradient-${node.id}`;
}

export function fillReference(node: EditorNode, prefix = ''): string {
  return node.fillGradient ? `url(#${gradientId(node, prefix)})` : 'fill' in node ? node.fill : '#ffffff';
}

export function svgGradientTransform(transform: GradientTransform): string {
  const value = invertGradientTransform(transform);
  return `matrix(${value.m00} ${value.m10} ${value.m01} ${value.m11} ${value.m02} ${value.m12})`;
}

export function svgGradientDefinition(node: EditorNode, prefix = ''): string {
  const gradient = node.fillGradient;
  if (!gradient) return '';
  const tag = gradient.type === 'linear' ? 'linearGradient' : 'radialGradient';
  const geometry = gradient.type === 'linear'
    ? 'x1="0" y1="0.5" x2="1" y2="0.5"'
    : 'cx="0.5" cy="0.5" r="0.5"';
  const stops = gradient.stops.map((stop) =>
    `<stop offset="${stop.position}" stop-color="${stop.color}"/>`,
  ).join('');
  return `<defs><${tag} id="${gradientId(node, prefix)}" gradientUnits="objectBoundingBox" ${geometry} gradientTransform="${svgGradientTransform(gradient.transform)}">${stops}</${tag}></defs>`;
}

/** Convert Figma's unit-square paint to the matching Pixi local gradient. */
export function pixiGradient(gradient: GradientFillDefinition): FillGradient {
  const colorStops = gradient.stops.map((stop) => ({ offset: stop.position, color: stop.color }));
  if (gradient.type === 'linear') {
    return new FillGradient({
      type: 'linear',
      start: gradientPoint(gradient.transform, { x: 0, y: 0.5 }),
      end: gradientPoint(gradient.transform, { x: 1, y: 0.5 }),
      colorStops,
      textureSpace: 'local',
    });
  }
  const center = gradientPoint(gradient.transform, { x: 0.5, y: 0.5 });
  const left = gradientPoint(gradient.transform, { x: 0, y: 0.5 });
  const right = gradientPoint(gradient.transform, { x: 1, y: 0.5 });
  const top = gradientPoint(gradient.transform, { x: 0.5, y: 0 });
  const bottom = gradientPoint(gradient.transform, { x: 0.5, y: 1 });
  const axisX = { x: right.x - left.x, y: right.y - left.y };
  const axisY = { x: bottom.x - top.x, y: bottom.y - top.y };
  const diameterX = Math.hypot(axisX.x, axisX.y);
  const diameterY = Math.hypot(axisY.x, axisY.y);
  return new FillGradient({
    type: 'radial',
    center,
    outerCenter: center,
    innerRadius: 0,
    outerRadius: diameterX > 0.000001 ? diameterX / 2 : 0.5,
    scale: diameterX > 0.000001 ? diameterY / diameterX : 1,
    rotation: Math.atan2(axisX.y, axisX.x),
    colorStops,
    textureSpace: 'local',
  });
}
