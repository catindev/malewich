import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { ArrowNode, FrameNode, PolygonNode, RectangleNode, StarNode, TextNode } from '../types';
import { createNode } from './document';
import { documentToSvg } from './export';

describe('SVG export', () => {
  it('exports the selected subtree and escapes text', () => {
    const first = { ...(createNode('frame', 0, 0, 400, 300) as FrameNode), id: 'first', name: 'Первый' };
    const second = { ...(createNode('frame', 500, 0, 200, 200) as FrameNode), id: 'second', name: 'Второй' };
    const text = {
      ...(createNode('text', 20, 30, 200, 50) as TextNode),
      id: 'title', parentId: 'first', text: 'A < B & "C"',
    };
    const doc = { ...createEmptyDocument('Экспорт'), nodes: [first, second, text] };
    const result = documentToSvg(doc, ['first']);
    expect(result.bounds).toMatchObject({ x: 0, y: 0, width: 400, height: 300 });
    expect(result.svg).toContain('viewBox="0 0 400 300"');
    expect(result.svg).toContain('A &lt; B &amp; &quot;C&quot;');
    expect(result.svg).toContain('export-clip-first');
    expect(result.svg).not.toContain('export-clip-second');
  });

  it('exports vector shapes without external dependencies', () => {
    const rectangle = { ...(createNode('rectangle', 10, 15, 120, 80) as RectangleNode), id: 'rect', fill: '#ff0000' };
    const doc = { ...createEmptyDocument(), nodes: [rectangle] };
    const { svg } = documentToSvg(doc, []);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('width="120" height="80"');
  });

  it('exports an editable line with its stroke style', () => {
    const line = {
      ...createNode('line', 10, 20, 180, 0),
      id: 'line', strokeCap: 'round' as const, strokeDash: [8, 4],
    };
    const doc = { ...createEmptyDocument(), nodes: [line] };
    const { svg } = documentToSvg(doc, ['line']);
    expect(svg).toContain('<path d="M10 20L190 20"');
    expect(svg).toContain('fill="none" stroke="#202020" stroke-width="2"');
    expect(svg).toContain('stroke-dasharray="8 4" stroke-linecap="round"');
  });

  it('exports arrowheads and editable polygon/star parameters without clipping', () => {
    const arrow = {
      ...(createNode('arrow', 0, 20, 200, 0) as ArrowNode),
      id: 'arrow', startArrowhead: true, endArrowhead: true, strokeWidth: 10,
    };
    const polygon = { ...(createNode('polygon', 250, 0, 100, 100) as PolygonNode), id: 'polygon', sides: 5 };
    const star = {
      ...(createNode('star', 400, 0, 100, 100) as StarNode),
      id: 'star', points: 6, innerRadius: 0.5,
    };
    const doc = { ...createEmptyDocument(), nodes: [arrow, polygon, star] };
    const arrowExport = documentToSvg(doc, ['arrow']);
    expect((arrowExport.svg.match(/M/g) ?? [])).toHaveLength(5);
    expect(arrowExport.bounds.height).toBeGreaterThan(20);
    expect((documentToSvg(doc, ['polygon']).svg.match(/L/g) ?? [])).toHaveLength(4);
    expect((documentToSvg(doc, ['star']).svg.match(/L/g) ?? [])).toHaveLength(11);
  });
});
