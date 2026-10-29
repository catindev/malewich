import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode } from '../types';
import { createAutoLayout } from './autoLayout';
import { createNode } from './document';
import { highlightCss, nodeToCss } from './devMode';

describe('Dev Mode', () => {
  it('generates Auto Layout CSS with variable references', () => {
    const frame = {
      ...(createNode('frame', 0, 0, 300, 200) as FrameNode), id: 'frame', name: 'Card',
      autoLayout: { ...createAutoLayout('horizontal'), gap: 24 },
      variableBindings: { 'autoLayout.gap': 'spacing' },
    };
    const doc = {
      ...createEmptyDocument(),
      nodes: [frame],
      variables: [{ id: 'spacing', name: 'Spacing M', type: 'number' as const, value: 24 }],
    };
    const css = nodeToCss(doc, frame);
    expect(css).toContain('display: flex');
    expect(css).toContain('flex-direction: row');
    expect(css).toContain('gap: var(--spacing-m)');
    expect(css).toContain('width: 300px');
  });

  it('tokenizes CSS for syntax highlighting without changing the source', () => {
    const css = '/* Card */\n.card {\n  gap: var(--spacing-m);\n  color: #aabbcc;\n}';
    const tokens = highlightCss(css);
    expect(tokens.map((token) => token.value).join('')).toBe(css);
    expect(tokens).toContainEqual({ type: 'comment', value: '/* Card */' });
    expect(tokens).toContainEqual({ type: 'selector', value: '.card' });
    expect(tokens).toContainEqual({ type: 'property', value: 'gap' });
    expect(tokens).toContainEqual({ type: 'variable', value: '--spacing-m' });
    expect(tokens).toContainEqual({ type: 'color', value: '#aabbcc' });
  });
});
