import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode, RectangleNode, TextNode } from '../types';
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
});
