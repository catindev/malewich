import type { Bounds, DesignDocument, EditorNode } from '../types';
import {
  flattenDocument,
  getDescendantIds,
  getNode,
  getNodeBounds,
  getWorldMatrix,
  isDescendant,
} from './document';
import { matrixToString, mergeBounds, nodeMatrix, round } from './geometry';
import { fontFamilyWithFallback, getTextLines } from './text';

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}

function renderNode(doc: DesignDocument, node: EditorNode, root = false): string {
  if (!node.visible) return '';
  const transform = matrixToString(root ? getWorldMatrix(doc, node) : nodeMatrix(node));
  const fill = 'fill' in node ? node.fill : '#ffffff';
  const common = `fill="${escapeXml(fill)}" stroke="${escapeXml(node.stroke)}" stroke-width="${node.strokeWidth * (node.strokeAlign === 'inside' ? 2 : 1)}"`;
  const insideStroke = node.strokeAlign === 'inside' ? ` clip-path="url(#export-stroke-clip-${node.id})"` : '';
  const children = doc.nodes.filter((candidate) => candidate.parentId === node.id);
  let content = '';

  if (node.type === 'frame') {
    content += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.cornerRadius}" ${common}${insideStroke}/>`;
    content += `<defs><clipPath id="export-clip-${node.id}"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.cornerRadius}"/></clipPath>${insideStroke ? `<clipPath id="export-stroke-clip-${node.id}"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.cornerRadius}"/></clipPath>` : ''}</defs>`;
  } else if (node.type === 'rectangle') {
    content += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.cornerRadius}" ${common}${insideStroke}/>`;
    if (insideStroke) content += `<defs><clipPath id="export-stroke-clip-${node.id}"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.cornerRadius}"/></clipPath></defs>`;
  } else if (node.type === 'ellipse') {
    content += `<ellipse cx="${node.x + node.width / 2}" cy="${node.y + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" ${common}${insideStroke}/>`;
    if (insideStroke) content += `<defs><clipPath id="export-stroke-clip-${node.id}"><ellipse cx="${node.x + node.width / 2}" cy="${node.y + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}"/></clipPath></defs>`;
  } else if (node.type === 'vector') {
    content += `<g transform="translate(${node.x} ${node.y}) scale(${node.width / node.pathWidth} ${node.height / node.pathHeight})"><path d="${escapeXml(node.path)}" fill="${escapeXml(node.fill)}" fill-rule="${node.fillRule ?? 'nonzero'}" stroke="${escapeXml(node.stroke)}" stroke-width="${node.strokeWidth}"/></g>`;
  } else if (node.type === 'text') {
    const x = node.textAlign === 'center' ? node.x + node.width / 2 : node.textAlign === 'right' ? node.x + node.width : node.x;
    const anchor = node.textAlign === 'center' ? 'middle' : node.textAlign === 'right' ? 'end' : 'start';
    const lines = getTextLines(node).map((line, index) =>
      `<tspan x="${x}" y="${node.y + index * node.fontSize * node.lineHeight}" dominant-baseline="text-before-edge">${escapeXml(line || ' ')}</tspan>`,
    ).join('');
    const clipId = `export-text-clip-${node.id}`;
    if (node.autoSize === 'none') {
      content += `<defs><clipPath id="${clipId}"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"/></clipPath></defs>`;
    }
    content += `<g${node.autoSize === 'none' ? ` clip-path="url(#${clipId})"` : ''}><text fill="${escapeXml(node.fill)}" font-size="${node.fontSize}" font-family="${escapeXml(fontFamilyWithFallback(node.fontFamily))}" font-weight="${node.fontWeight}" letter-spacing="${node.letterSpacing}" text-anchor="${anchor}">${lines}</text></g>`;
  } else if (node.type === 'image') {
    content += `<defs><clipPath id="export-clip-${node.id}"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.cornerRadius}"/></clipPath></defs>`;
    if (node.src) content += `<image href="${escapeXml(node.src)}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" preserveAspectRatio="${node.objectFit === 'fill' ? 'none' : 'xMidYMid slice'}" clip-path="url(#export-clip-${node.id})"/>`;
  }

  if (children.length > 0) {
    const clip = node.type === 'frame' && node.clip ? ` clip-path="url(#export-clip-${node.id})"` : '';
    content += `<g${clip}>${children.map((child) => renderNode(doc, child)).join('')}</g>`;
  }
  return `<g transform="${transform}" opacity="${node.opacity}">${content}</g>`;
}

function getExportRoots(doc: DesignDocument, selection: string[]): EditorNode[] {
  const selected = selection.flatMap((id) => {
    const node = getNode(doc, id);
    return node ? [node] : [];
  }).filter((node) => !selection.some((id) => id !== node.id && isDescendant(doc, node.id, id)));
  return selected.length > 0 ? selected : doc.nodes.filter((node) => node.parentId === null);
}

export function getExportBounds(doc: DesignDocument, selection: string[]): Bounds {
  const roots = getExportRoots(doc, selection);
  if (roots.length === 1 && roots[0].type === 'frame') return getNodeBounds(doc, roots[0]);
  const ids = new Set(roots.flatMap((node) => [node.id, ...getDescendantIds(doc, node.id)]));
  const nodes = flattenDocument(doc).filter((node) => ids.has(node.id) && node.visible);
  return mergeBounds(nodes.map((node) => getNodeBounds(doc, node)));
}

export function documentToSvg(doc: DesignDocument, selection: string[] = []): { svg: string; bounds: Bounds } {
  const roots = getExportRoots(doc, selection);
  const bounds = getExportBounds(doc, selection);
  const width = Math.max(1, round(bounds.width));
  const height = Math.max(1, round(bounds.height));
  const content = roots.map((node) => renderNode(doc, node, true)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="${bounds.x} ${bounds.y} ${width} ${height}"><title>${escapeXml(doc.name)}</title>${content}</svg>`;
  return { svg, bounds };
}

function safeFileName(name: string): string {
  return name.trim().replace(/[^a-zA-Zа-яА-Я0-9-_ ]/g, '').replace(/\s+/g, '-') || 'malewich-project';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSvg(doc: DesignDocument, selection: string[], name = doc.name): void {
  const { svg } = documentToSvg(doc, selection);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeFileName(name)}.svg`);
}

export function exportJson(doc: DesignDocument): void {
  downloadBlob(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), `${safeFileName(doc.name)}.malewich.json`);
}

interface PngExportOptions {
  scale?: number;
  name?: string;
}

export async function exportPng(doc: DesignDocument, selection: string[], options: PngExportOptions = {}): Promise<void> {
  const { svg, bounds } = documentToSvg(doc, selection);
  const requestedScale = Math.max(0.01, options.scale ?? 3);
  const scale = Math.min(requestedScale, 8192 / Math.max(bounds.width, bounds.height, 1));
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Не удалось подготовить PNG'));
      image.src = url;
    });
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas недоступен');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Не удалось экспортировать PNG')), 'image/png');
    });
    const scaleLabel = String(Math.round(scale * 100) / 100);
    downloadBlob(png, `${safeFileName(options.name ?? doc.name)}@${scaleLabel}x.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
