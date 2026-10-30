import { readFileSync } from 'node:fs';
import { GraphicsPath } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { importFigmaDocument } from './figmaImport';
import { MAX_ZOOM, MIN_ZOOM, previewOverscan, textResolutionForZoom, vectorFillPaths } from './rendering';

function holes(data: string): number {
  return new GraphicsPath().addPath(new GraphicsPath(data, true)).shapePath.shapePrimitives
    .reduce((sum, primitive) => sum + (primitive.holes?.length ?? 0), 0);
}

describe('canvas text resolution', () => {
  it('matches canvas zoom and Retina density without exceeding the zoom limit', () => {
    expect(textResolutionForZoom(1, 1)).toBe(1);
    expect(textResolutionForZoom(4, 1)).toBe(4);
    expect(textResolutionForZoom(1, 2)).toBe(2);
    expect(textResolutionForZoom(4, 2)).toBe(8);
    expect(textResolutionForZoom(0.5, 1)).toBe(1);
    expect(textResolutionForZoom(10, 3)).toBe(20);
    expect(textResolutionForZoom(64, 2)).toBe(128);
    expect(textResolutionForZoom(256, 2)).toBe(512);
    expect(MIN_ZOOM).toBe(0.05);
    expect(MAX_ZOOM).toBe(256);
  });

  it('bounds preview overscan by viewport size and the 128px cap', () => {
    expect(previewOverscan(1000, 800)).toBe(100);
    expect(previewOverscan(2560, 1440)).toBe(128);
    expect(previewOverscan(0, 800)).toBe(0);
  });
});

describe('Pixi vector fill contours', () => {
  it('cuts the TKB logo hole even when it precedes its outer nonzero contour', () => {
    const bytes = readFileSync(new URL('../../e2e/fixtures/TCB.PAY.fig', import.meta.url));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const doc = importFigmaDocument(buffer, 'TCB.PAY.fig');
    const logo = doc.nodes.find((node) => node.id === 'fig-0-849');
    expect(logo?.type).toBe('vector');
    if (logo?.type !== 'vector') return;
    const groups = vectorFillPaths(logo.path, logo.fillRule);
    const letters = groups.find((data) => data.includes('M34.534 10.412'));
    expect(letters).toBeDefined();
    expect(holes(letters!)).toBe(1);
  });

  it('does not turn same-direction nested nonzero contours into accidental holes', () => {
    const outer = 'M0 0H20V20H0Z';
    const sameDirection = 'M5 5H15V15H5Z';
    expect(vectorFillPaths(`${outer} ${sameDirection}`, 'nonzero')).toEqual([outer]);
    expect(vectorFillPaths(`${outer} ${sameDirection}`, 'evenodd')).toEqual([`${outer} ${sameDirection}`]);
    expect(holes(vectorFillPaths(`${outer} ${sameDirection}`, 'evenodd')[0])).toBe(1);
  });

  it('keeps disjoint shapes separate and associates opposite contours with their own outer shape', () => {
    const outer = 'M0 0H20V20H0Z';
    const oppositeHole = 'M5 5V15H15V5Z';
    const disjoint = 'M30 0H40V10H30Z';
    const groups = vectorFillPaths(`${oppositeHole} ${disjoint} ${outer}`, 'nonzero');
    expect(groups).toHaveLength(2);
    expect(holes(groups.find((data) => data.startsWith(outer))!)).toBe(1);
    expect(holes(groups.find((data) => data.startsWith(disjoint))!)).toBe(0);
  });

  it('retains unsupported or open path data instead of dropping artwork', () => {
    const openStroke = 'M0 0L10 10 M20 20L30 30';
    expect(vectorFillPaths(openStroke)).toEqual([openStroke]);
  });
});
