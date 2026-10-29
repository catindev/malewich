import type { TextNode } from '../types';

let measureContext: CanvasRenderingContext2D | null | undefined;

function measure(text: string, node: TextNode): number {
  if (typeof document !== 'undefined') {
    if (measureContext === undefined) measureContext = document.createElement('canvas').getContext('2d');
    if (measureContext) {
      measureContext.font = `${node.fontWeight} ${node.fontSize}px ${node.fontFamily}`;
      return measureContext.measureText(text).width + Math.max(0, text.length - 1) * node.letterSpacing;
    }
  }
  return text.length * node.fontSize * 0.55 + Math.max(0, text.length - 1) * node.letterSpacing;
}

function breakLongWord(word: string, width: number, node: TextNode): string[] {
  const parts: string[] = [];
  let current = '';
  for (const character of word) {
    if (current && measure(current + character, node) > width) {
      parts.push(current);
      current = character;
    } else current += character;
  }
  if (current) parts.push(current);
  return parts;
}

function wrapParagraph(paragraph: string, width: number, node: TextNode): string[] {
  if (!paragraph) return [''];
  const result: string[] = [];
  let line = '';
  for (const word of paragraph.split(' ')) {
    if (measure(word, node) > width) {
      if (line) {
        result.push(line);
        line = '';
      }
      const parts = breakLongWord(word, width, node);
      result.push(...parts.slice(0, -1));
      line = parts.at(-1) ?? '';
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate, node) > width) {
      result.push(line);
      line = word;
    } else line = candidate;
  }
  if (line || result.length === 0) result.push(line);
  return result;
}

export function getTextLines(node: TextNode): string[] {
  if (node.autoSize === 'width') return node.text.split('\n');
  return node.text.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, Math.max(1, node.width), node));
}

export function measureAutoText(node: TextNode): Partial<Pick<TextNode, 'width' | 'height'>> {
  if (node.autoSize === 'width') {
    const lines = node.text.split('\n');
    const widest = Math.max(...lines.map((line) => measure(line, node)), 0);
    return {
      width: Math.max(2, Math.ceil(widest) + 2),
      height: Math.max(node.fontSize, Math.ceil(lines.length * node.fontSize * node.lineHeight)),
    };
  }
  if (node.autoSize === 'height') {
    return {
      height: Math.max(node.fontSize, Math.ceil(getTextLines(node).length * node.fontSize * node.lineHeight)),
    };
  }
  return {};
}
