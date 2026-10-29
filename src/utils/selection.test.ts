import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode, TextNode } from '../types';
import { createNode } from './document';
import { getSelectionTarget } from './selection';

const frame = { ...(createNode('frame', 0, 0, 500, 400) as FrameNode), id: 'frame' };
const text = { ...(createNode('text', 20, 20, 200, 40) as TextNode), id: 'text', parentId: 'frame' };
const doc = { ...createEmptyDocument(), nodes: [frame, text] };

describe('hierarchical selection', () => {
  it('selects the top-level frame first', () => {
    expect(getSelectionTarget(doc, text, [])).toBe('frame');
  });

  it('drills down when the parent is already selected', () => {
    expect(getSelectionTarget(doc, text, ['frame'])).toBe('text');
  });

  it('keeps selection within the current nesting context', () => {
    expect(getSelectionTarget(doc, text, ['text'])).toBe('text');
  });

  it('supports explicit deep selection', () => {
    expect(getSelectionTarget(doc, text, [], true)).toBe('text');
  });
});
