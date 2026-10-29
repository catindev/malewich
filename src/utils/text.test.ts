import { describe, expect, it } from 'vitest';
import type { TextNode } from '../types';
import { createNode } from './document';
import { getTextLines, measureAutoText } from './text';

function text(autoSize: TextNode['autoSize'], value: string, width = 40): TextNode {
  return {
    ...(createNode('text', 0, 0, width, 20) as TextNode),
    text: value, autoSize, fontSize: 10, lineHeight: 1.2, letterSpacing: 0,
  };
}

describe('text layout', () => {
  it('wraps fixed-width and auto-height text at word boundaries', () => {
    const node = text('height', 'one two three');
    expect(getTextLines(node)).toEqual(['one two', 'three']);
    expect(measureAutoText(node).height).toBe(24);
  });

  it('breaks words that exceed the fixed width', () => {
    const node = text('none', 'extraordinary', 30);
    expect(getTextLines(node).length).toBeGreaterThan(1);
  });

  it('keeps explicit lines in auto-width mode and measures both dimensions', () => {
    const node = text('width', 'a\nlong line', 100);
    expect(getTextLines(node)).toEqual(['a', 'long line']);
    const size = measureAutoText(node);
    expect(size.width).toBeGreaterThan(40);
    expect(size.height).toBe(24);
  });
});
