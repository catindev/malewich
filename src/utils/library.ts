import type {
  DesignDocument,
  EditorNode,
  StyleDefinition,
  TextNode,
  VariableDefinition,
} from '../types';
import { createId, getNode } from './document';

export function createStyle(doc: DesignDocument, nodeId: string | null, type: 'color' | 'text'): DesignDocument {
  const node = getNode(doc, nodeId);
  const styles = doc.styles ?? [];
  let style: StyleDefinition;
  if (type === 'color') {
    style = {
      id: createId('style'), type, name: `Color ${styles.filter((item) => item.type === 'color').length + 1}`,
      color: node && 'fill' in node ? node.fill : '#8b5cf6',
    };
  } else {
    const text = node?.type === 'text' ? node as TextNode : null;
    style = {
      id: createId('style'), type, name: `Text ${styles.filter((item) => item.type === 'text').length + 1}`,
      fontSize: text?.fontSize ?? 16,
      fontFamily: text?.fontFamily ?? 'Inter, Arial, sans-serif',
      fontWeight: text?.fontWeight ?? 400,
      lineHeight: text?.lineHeight ?? 1.2,
      letterSpacing: text?.letterSpacing ?? 0,
    };
  }
  return { ...doc, styles: [...styles, style] };
}

export function applyStyle(doc: DesignDocument, nodeId: string, styleId: string): DesignDocument {
  const style = doc.styles?.find((item) => item.id === styleId);
  if (!style) return doc;
  return {
    ...doc,
    nodes: doc.nodes.map((node) => {
      if (node.id !== nodeId) return node;
      if (style.type === 'color' && 'fill' in node) return { ...node, fill: style.color, fillStyleId: style.id };
      if (style.type === 'text' && node.type === 'text') {
        return {
          ...node,
          textStyleId: style.id,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
        };
      }
      return node;
    }),
  };
}

export function updateStyle(doc: DesignDocument, styleId: string, patch: Partial<StyleDefinition>): DesignDocument {
  const style = doc.styles?.find((item) => item.id === styleId);
  if (!style) return doc;
  const nextStyle = { ...style, ...patch } as StyleDefinition;
  const next = { ...doc, styles: doc.styles!.map((item) => item.id === styleId ? nextStyle : item) };
  return {
    ...next,
    nodes: next.nodes.map((node) => {
      if (nextStyle.type === 'color' && node.fillStyleId === styleId && 'fill' in node) {
        return { ...node, fill: nextStyle.color };
      }
      if (nextStyle.type === 'text' && node.textStyleId === styleId && node.type === 'text') {
        return {
          ...node,
          fontSize: nextStyle.fontSize,
          fontFamily: nextStyle.fontFamily,
          fontWeight: nextStyle.fontWeight,
          lineHeight: nextStyle.lineHeight,
          letterSpacing: nextStyle.letterSpacing,
        };
      }
      return node;
    }),
  };
}

export function deleteStyle(doc: DesignDocument, styleId: string): DesignDocument {
  return {
    ...doc,
    styles: (doc.styles ?? []).filter((style) => style.id !== styleId),
    nodes: doc.nodes.map((node) => ({
      ...node,
      fillStyleId: node.fillStyleId === styleId ? undefined : node.fillStyleId,
      textStyleId: node.textStyleId === styleId ? undefined : node.textStyleId,
    })),
  };
}

export function createVariableCollection(doc: DesignDocument, name?: string): DesignDocument {
  const collections = doc.variableCollections ?? [];
  const lightId = createId('light');
  const darkId = createId('dark');
  const collection = {
    id: createId('collection'),
    name: name ?? `Collection ${collections.length + 1}`,
    modes: [{ id: lightId, name: 'Light' }, { id: darkId, name: 'Dark' }],
    activeModeId: lightId,
  };
  return {
    ...doc,
    variableCollections: [...collections, collection],
    variables: (doc.variables ?? []).map((variable) => variable.collectionId ? variable : {
      ...variable,
      collectionId: collection.id,
      modeValues: Object.fromEntries(collection.modes.map((mode) => [mode.id, variable.value])),
    }),
  };
}

function ensureCollection(doc: DesignDocument): DesignDocument {
  return (doc.variableCollections ?? []).length > 0 ? doc : createVariableCollection(doc, 'Default');
}

export function createVariable(doc: DesignDocument, type: 'color' | 'number'): DesignDocument {
  const withCollection = ensureCollection(doc);
  const variables = withCollection.variables ?? [];
  const collection = withCollection.variableCollections![0];
  const value = type === 'color' ? '#8b5cf6' : 16;
  const variable: VariableDefinition = {
    id: createId('variable'), type,
    name: `${type === 'color' ? 'Color' : 'Number'} ${variables.filter((item) => item.type === type).length + 1}`,
    value,
    collectionId: collection.id,
    modeValues: Object.fromEntries(collection.modes.map((mode) => [mode.id, value])),
  };
  return { ...withCollection, variables: [...variables, variable] };
}

function defaultVariableProperty(node: EditorNode, variable: VariableDefinition): string {
  if (variable.type === 'color') return 'fill';
  if (node.type === 'frame' && node.autoLayout) return 'autoLayout.gap';
  if ('cornerRadius' in node) return 'cornerRadius';
  return 'opacity';
}

export function applyVariable(
  doc: DesignDocument,
  nodeId: string,
  variableId: string,
  property?: string,
): DesignDocument {
  const variable = doc.variables?.find((item) => item.id === variableId);
  const node = getNode(doc, nodeId);
  if (!variable || !node) return doc;
  const target = property ?? defaultVariableProperty(node, variable);
  return resolveVariables({
    ...doc,
    nodes: doc.nodes.map((candidate) => candidate.id === nodeId ? {
      ...candidate,
      variableBindings: { ...(candidate.variableBindings ?? {}), [target]: variableId },
    } : candidate),
  });
}

function variableValue(doc: DesignDocument, variable: VariableDefinition, seen = new Set<string>()): string | number {
  if (variable.aliasOf && !seen.has(variable.id)) {
    const target = doc.variables?.find((item) => item.id === variable.aliasOf);
    if (target) return variableValue(doc, target, new Set([...seen, variable.id]));
  }
  const collection = doc.variableCollections?.find((item) => item.id === variable.collectionId);
  if (collection && variable.modeValues) {
    return variable.modeValues[collection.activeModeId] ?? variable.value;
  }
  return variable.value;
}

export function setVariableMode(doc: DesignDocument, collectionId: string, modeId: string): DesignDocument {
  return resolveVariables({
    ...doc,
    variableCollections: (doc.variableCollections ?? []).map((collection) => collection.id === collectionId
      ? { ...collection, activeModeId: modeId }
      : collection),
  });
}

export function updateVariableValue(doc: DesignDocument, variableId: string, value: string | number): DesignDocument {
  const variable = doc.variables?.find((item) => item.id === variableId);
  if (!variable) return doc;
  const collection = doc.variableCollections?.find((item) => item.id === variable.collectionId);
  if (collection) {
    return updateVariable(doc, variableId, {
      modeValues: { ...(variable.modeValues ?? {}), [collection.activeModeId]: value },
    });
  }
  return updateVariable(doc, variableId, { value });
}

export function resolveVariables(doc: DesignDocument): DesignDocument {
  if (!doc.variables || doc.variables.length === 0) return doc;
  let documentChanged = false;
  const nodes = doc.nodes.map((node) => {
    if (!node.variableBindings) return node;
    let next = node;
    Object.entries(node.variableBindings).forEach(([property, variableId]) => {
      const variable = doc.variables!.find((item) => item.id === variableId);
      if (!variable) return;
      if (property.startsWith('autoLayout.') && next.type === 'frame' && next.autoLayout) {
        const key = property.slice('autoLayout.'.length);
        const value = Number(variableValue(doc, variable));
        const currentLayout = next.autoLayout;
        if (key === 'gap' && currentLayout.gap !== value) {
          next = { ...next, autoLayout: { ...currentLayout, gap: value } };
        }
        if (key.startsWith('padding.')) {
          const side = key.slice('padding.'.length) as keyof typeof currentLayout.padding;
          if (currentLayout.padding[side] !== value) {
            next = { ...next, autoLayout: { ...currentLayout, padding: { ...currentLayout.padding, [side]: value } } };
          }
        }
      } else if (property in next) {
        const value = variable.type === 'number' ? Number(variableValue(doc, variable)) : String(variableValue(doc, variable));
        if ((next as unknown as Record<string, unknown>)[property] !== value) {
          next = { ...next, [property]: value } as EditorNode;
        }
      }
    });
    if (next !== node) documentChanged = true;
    return next;
  });
  return documentChanged ? { ...doc, nodes } : doc;
}

export function updateVariable(doc: DesignDocument, variableId: string, patch: Partial<VariableDefinition>): DesignDocument {
  return resolveVariables({
    ...doc,
    variables: (doc.variables ?? []).map((variable) => {
      if (variable.id !== variableId) return variable;
      const collection = doc.variableCollections?.find((item) => item.id === variable.collectionId);
      const modePatch = collection && patch.value !== undefined && !patch.modeValues
        ? { modeValues: { ...(variable.modeValues ?? {}), [collection.activeModeId]: patch.value } }
        : {};
      return { ...variable, ...patch, ...modePatch };
    }),
  });
}

export function deleteVariable(doc: DesignDocument, variableId: string): DesignDocument {
  return {
    ...doc,
    variables: (doc.variables ?? []).filter((variable) => variable.id !== variableId),
    nodes: doc.nodes.map((node) => {
      if (!node.variableBindings) return node;
      const variableBindings = Object.fromEntries(Object.entries(node.variableBindings).filter(([, id]) => id !== variableId));
      return { ...node, variableBindings: Object.keys(variableBindings).length > 0 ? variableBindings : undefined };
    }),
  };
}
