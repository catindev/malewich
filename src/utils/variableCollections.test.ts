import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../data/defaultDocument';
import type { RectangleNode } from '../types';
import {
  applyVariable,
  createVariable,
  createVariableCollection,
  setVariableMode,
  updateVariable,
  updateVariableValue,
} from './library';
import { createNode } from './document';

describe('variable collections and themes', () => {
  it('switches bound values between Light and Dark modes', () => {
    const rectangle = { ...(createNode('rectangle', 0, 0, 100, 100) as RectangleNode), id: 'rect' };
    let doc = createVariableCollection({ ...createEmptyDocument(), nodes: [rectangle] }, 'Theme');
    doc = createVariable(doc, 'color');
    const variable = doc.variables![0];
    const collection = doc.variableCollections![0];
    doc = applyVariable(doc, 'rect', variable.id, 'fill');
    doc = updateVariableValue(doc, variable.id, '#ffffff');
    doc = setVariableMode(doc, collection.id, collection.modes[1].id);
    doc = updateVariableValue(doc, variable.id, '#111111');
    expect(doc.nodes[0]).toMatchObject({ fill: '#111111' });
    doc = setVariableMode(doc, collection.id, collection.modes[0].id);
    expect(doc.nodes[0]).toMatchObject({ fill: '#ffffff' });
  });

  it('resolves aliases through the target variable active mode', () => {
    const rectangle = { ...(createNode('rectangle', 0, 0, 100, 100) as RectangleNode), id: 'rect' };
    let doc = createVariableCollection({ ...createEmptyDocument(), nodes: [rectangle] });
    doc = createVariable(doc, 'color');
    const base = doc.variables![0];
    doc = createVariable(doc, 'color');
    const alias = doc.variables![1];
    doc = updateVariable(doc, alias.id, { aliasOf: base.id });
    doc = applyVariable(doc, 'rect', alias.id, 'fill');
    const collection = doc.variableCollections![0];
    doc = setVariableMode(doc, collection.id, collection.modes[1].id);
    doc = updateVariableValue(doc, base.id, '#222222');
    expect(doc.nodes[0]).toMatchObject({ fill: '#222222' });
  });
});
