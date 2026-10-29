import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { FrameNode, RectangleNode, TextNode } from '../types';
import { createAutoLayout } from './autoLayout';
import { createNode } from './document';
import {
  applyStyle,
  applyVariable,
  createStyle,
  createVariable,
  updateStyle,
  updateVariable,
} from './library';

describe('library', () => {
  it('updates all nodes linked to a color style', () => {
    const rectangle = { ...(createNode('rectangle', 0, 0, 100, 100) as RectangleNode), id: 'rect' };
    let doc = createStyle({ ...createEmptyDocument(), nodes: [rectangle] }, 'rect', 'color');
    const style = doc.styles![0];
    doc = applyStyle(doc, 'rect', style.id);
    doc = updateStyle(doc, style.id, { color: '#123456' });
    expect(doc.nodes[0]).toMatchObject({ fill: '#123456', fillStyleId: style.id });
  });

  it('applies and updates a text style', () => {
    const text = { ...(createNode('text', 0, 0, 200, 40) as TextNode), id: 'text' };
    let doc = createStyle({ ...createEmptyDocument(), nodes: [text] }, 'text', 'text');
    const style = doc.styles![0];
    doc = applyStyle(doc, 'text', style.id);
    doc = updateStyle(doc, style.id, { fontSize: 48 });
    expect(doc.nodes[0]).toMatchObject({ fontSize: 48, textStyleId: style.id });
  });

  it('updates color variables and Auto Layout number variables', () => {
    const frame = { ...(createNode('frame', 0, 0, 300, 200) as FrameNode), id: 'frame', autoLayout: createAutoLayout() };
    let doc = createVariable({ ...createEmptyDocument(), nodes: [frame] }, 'number');
    const variable = doc.variables![0];
    doc = applyVariable(doc, 'frame', variable.id, 'autoLayout.gap');
    doc = updateVariable(doc, variable.id, { value: 32 });
    expect(doc.nodes[0]).toMatchObject({ autoLayout: { gap: 32 } });
    expect(doc.nodes[0].variableBindings).toEqual({ 'autoLayout.gap': variable.id });
  });
});
