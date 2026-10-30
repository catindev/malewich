import { CanvasTextMetrics, type TextStyle } from 'pixi.js';
import { textLayoutGeneration } from './text';

const measurements = new Map<string, number>();
const MAX_MEASUREMENTS = 4096;

/** Measurement is independent of raster resolution and can survive zoom changes. */
export function measurePixiText(text: string, style: TextStyle): number {
  const key = [
    textLayoutGeneration(), style.fontFamily, style.fontSize, style.fontWeight,
    style.lineHeight, style.letterSpacing, style.align, style.fontStyle, style.fontVariant, text,
  ].join('\0');
  const cached = measurements.get(key);
  if (cached !== undefined) {
    measurements.delete(key);
    measurements.set(key, cached);
    return cached;
  }
  const width = CanvasTextMetrics.measureText(text, style).width;
  measurements.set(key, width);
  while (measurements.size > MAX_MEASUREMENTS) {
    const oldest = measurements.keys().next().value;
    if (oldest === undefined) break;
    measurements.delete(oldest);
  }
  return width;
}
