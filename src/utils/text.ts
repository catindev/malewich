import type { TextNode } from '../types';

let measureContext: CanvasRenderingContext2D | null | undefined;
let fontGeneration = 0;
let measuredFont = '';
const widthCache = new Map<string, number>();
const linesCache = new Map<string, string[]>();
const MAX_WIDTH_ENTRIES = 4096;
const MAX_LINES_ENTRIES = 512;

function cacheValue<T>(cache: Map<string, T>, key: string, maximum: number, compute: () => T): T {
  const existing = cache.get(key);
  if (existing !== undefined) {
    // Refresh insertion order for the small LRU cache.
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const value = compute();
  cache.set(key, value);
  while (cache.size > maximum) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return value;
}

export function textLayoutGeneration(): number {
  return fontGeneration;
}

/** Font arrival changes glyph metrics, so both layout and retained renders must invalidate. */
export function invalidateTextLayoutCaches(): void {
  fontGeneration += 1;
  widthCache.clear();
  linesCache.clear();
}

/** Keep the source family first, then use Figma-like local Inter and system fallbacks. */
export function fontFamilyWithFallback(fontFamily: string): string {
  const families = fontFamily.split(',').map((family) => family.trim()).filter(Boolean);
  if (families.length === 0) families.push('Inter');
  const generic = /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i;
  if (families.some((family) => generic.test(family.replace(/["']/g, '')))) return families.join(', ');
  const normalized = new Set(families.map((family) => family.replace(/["']/g, '').toLowerCase()));
  for (const fallback of ['Inter', 'Arial', 'sans-serif']) {
    if (!normalized.has(fallback.toLowerCase())) families.push(fallback);
  }
  return families.join(', ');
}

function styleKey(node: TextNode): string {
  return `${fontGeneration}\0${fontFamilyWithFallback(node.fontFamily)}\0${node.fontWeight}\0${node.fontSize}\0${node.letterSpacing}`;
}

function measure(text: string, node: TextNode): number {
  const key = `${styleKey(node)}\0${text}`;
  return cacheValue(widthCache, key, MAX_WIDTH_ENTRIES, () => {
    if (typeof document !== 'undefined') {
      if (measureContext === undefined) measureContext = document.createElement('canvas').getContext('2d');
      if (measureContext) {
        const font = `${node.fontWeight} ${node.fontSize}px ${fontFamilyWithFallback(node.fontFamily)}`;
        if (measuredFont !== font) {
          measureContext.font = font;
          measuredFont = font;
        }
        return measureContext.measureText(text).width + Math.max(0, text.length - 1) * node.letterSpacing;
      }
    }
    return text.length * node.fontSize * 0.55 + Math.max(0, text.length - 1) * node.letterSpacing;
  });
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
  const key = `${styleKey(node)}\0${node.autoSize}\0${node.width}\0${node.text}`;
  return cacheValue(linesCache, key, MAX_LINES_ENTRIES, () => {
    if (node.autoSize === 'width') return node.text.split('\n');
    return node.text.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, Math.max(1, node.width), node));
  });
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
