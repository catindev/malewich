import type { DesignDocument, EditorNode, VariableDefinition } from '../types';

function cssName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9а-я]+/gi, '-').replace(/^-+|-+$/g, '') || 'node';
}

function variableCss(doc: DesignDocument, variableId: string | undefined, fallback: string): string {
  if (!variableId) return fallback;
  const variable = doc.variables?.find((item) => item.id === variableId);
  return variable ? `var(--${cssName(variable.name)})` : fallback;
}

export function variableToken(variable: VariableDefinition): string {
  return `--${cssName(variable.name)}: ${variable.value};`;
}

export function nodeToCss(doc: DesignDocument, node: EditorNode): string {
  const lines = [
    `/* ${node.name} */`,
    `.${cssName(node.name)} {`,
    '  position: absolute;',
    `  left: ${node.x}px;`,
    `  top: ${node.y}px;`,
    `  width: ${node.width}px;`,
    `  height: ${node.height}px;`,
    `  opacity: ${node.opacity};`,
  ];
  if (node.rotation) lines.push(`  transform: rotate(${node.rotation}deg);`);
  if ('fill' in node) lines.push(`  background: ${variableCss(doc, node.variableBindings?.fill, node.fill)};`);
  if (node.strokeWidth > 0) lines.push(`  border: ${node.strokeWidth}px solid ${variableCss(doc, node.variableBindings?.stroke, node.stroke)};`);
  if ('cornerRadius' in node) lines.push(`  border-radius: ${variableCss(doc, node.variableBindings?.cornerRadius, `${node.cornerRadius}px`)};`);
  if (node.type === 'frame' && node.autoLayout) {
    const layout = node.autoLayout;
    lines.push(
      '  display: flex;',
      `  flex-direction: ${layout.direction === 'horizontal' ? 'row' : 'column'};`,
      `  gap: ${variableCss(doc, node.variableBindings?.['autoLayout.gap'], `${layout.gap}px`)};`,
      `  padding: ${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px;`,
      `  align-items: ${layout.align === 'start' ? 'flex-start' : layout.align === 'end' ? 'flex-end' : 'center'};`,
      `  justify-content: ${layout.justify === 'start' ? 'flex-start' : layout.justify === 'end' ? 'flex-end' : layout.justify === 'space-between' ? 'space-between' : 'center'};`,
    );
    if (node.clip) lines.push('  overflow: hidden;');
  }
  if (node.type === 'text') {
    lines.push(
      `  font-family: ${node.fontFamily};`,
      `  font-size: ${node.fontSize}px;`,
      `  font-weight: ${node.fontWeight};`,
      `  line-height: ${node.lineHeight};`,
      `  letter-spacing: ${node.letterSpacing}px;`,
      `  text-align: ${node.textAlign};`,
      `  color: ${node.fill};`,
    );
  }
  if (node.component) lines.push(`  /* component: ${node.component.role} · ${node.component.rootId} */`);
  lines.push('}');
  return lines.join('\n');
}

export function documentTokensCss(doc: DesignDocument): string {
  const variables = doc.variables ?? [];
  if (variables.length === 0) return '';
  return `:root {\n${variables.map((variable) => `  ${variableToken(variable)}`).join('\n')}\n}`;
}

export interface CssToken {
  type: 'plain' | 'comment' | 'string' | 'variable' | 'number' | 'color' | 'function' | 'property' | 'selector' | 'punctuation';
  value: string;
}

const cssTokenPattern = /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(--[a-zA-Z0-9_-]+)|(#[0-9a-fA-F]{3,8}\b)|(\b\d+(?:\.\d+)?(?:px|deg|ms|s|%)?\b)|(\bvar(?=\())|([a-zA-Z-]+(?=\s*:))|([.:][a-zA-Z_][\w-]*(?=\s*\{))|([{}:;(),])/g;

export function highlightCss(code: string): CssToken[] {
  const tokens: CssToken[] = [];
  let lastIndex = 0;
  for (const match of code.matchAll(cssTokenPattern)) {
    const index = match.index;
    if (index > lastIndex) tokens.push({ type: 'plain', value: code.slice(lastIndex, index) });
    const types: CssToken['type'][] = ['comment', 'string', 'variable', 'color', 'number', 'function', 'property', 'selector', 'punctuation'];
    const groupIndex = match.slice(1).findIndex((value) => value !== undefined);
    tokens.push({ type: types[groupIndex] ?? 'plain', value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < code.length) tokens.push({ type: 'plain', value: code.slice(lastIndex) });
  return tokens;
}
