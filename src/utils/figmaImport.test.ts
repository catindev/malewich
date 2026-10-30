import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { syncComponents } from './components';
import { decodeGeometryPath, decodeVectorNetwork, figColorToCss, importFigmaDocument } from './figmaImport';
import { applyMatrix, multiplyMatrix, nodeMatrix } from './geometry';
import { resolveVariables } from './library';
import { isDesignDocument } from './storage';

function fixtureBuffer(): ArrayBuffer {
  const bytes = readFileSync(new URL('../../e2e/fixtures/TCB.PAY.fig', import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function importFixture() {
  return importFigmaDocument(fixtureBuffer(), 'TCB.PAY.fig');
}

function importSmzFixture() {
  const bytes = readFileSync(new URL('../../e2e/fixtures/TCB.PAY.SMZ.fig', import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return importFigmaDocument(buffer, 'TCB.PAY.SMZ.fig');
}

function importCommunityFixture(name: string) {
  const bytes = readFileSync(new URL(`../../e2e/fixtures/${name}`, import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return importFigmaDocument(buffer, name);
}

describe('Figma geometry and colors', () => {
  it('decodes move, line, cubic and close commands', () => {
    const blob = new Uint8Array(44);
    const view = new DataView(blob.buffer);
    blob[0] = 1;
    view.setFloat32(1, 1.25, true);
    view.setFloat32(5, 2.5, true);
    blob[9] = 2;
    view.setFloat32(10, 10, true);
    view.setFloat32(14, 20, true);
    blob[18] = 4;
    [0, 0, 5, 5, 10, 10].forEach((value, index) => view.setFloat32(19 + index * 4, value, true));
    blob[43] = 0;
    expect(decodeGeometryPath(blob)).toBe('M1.25 2.5 L10 20 C0 0 5 5 10 10 Z');
  });

  it('decodes closed vector regions and open stroke segments without rectangle fallbacks', () => {
    expect(decodeVectorNetwork({
      vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 20 }, { x: 30, y: 20 }],
      segments: [
        { start: 0, end: 1, tangentStart: { x: 0, y: -5 }, tangentEnd: { x: -2, y: 0 } },
        { start: 1, end: 0, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
        { start: 2, end: 3, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      ],
      regions: [{ windingRule: 'NONZERO', loops: [[0, 1]] }],
    })).toBe('M0 0 C0 -5 8 0 10 0 L0 0 Z M20 20 L30 20');
  });

  it('converts opaque and translucent Figma colors', () => {
    expect(figColorToCss({ r: 1, g: 0.5, b: 0, a: 1 })).toBe('#ff8000');
    expect(figColorToCss({ r: 0, g: 0, b: 0, a: 0.5 }, 0.5)).toBe('rgba(0, 0, 0, 0.25)');
  });
});

describe('TCB.PAY import', () => {
  it('materializes every visible layer as editable document nodes', () => {
    const doc = importFixture();
    expect(doc.name).toBe('TCB.PAY');
    expect(doc.nodes).toHaveLength(2325);
    expect(doc.nodes.filter((node) => node.type === 'text')).toHaveLength(599);
    expect(doc.nodes.filter((node) => node.type === 'vector')).toHaveLength(671);
    expect(doc.nodes.filter((node) => node.type === 'rectangle')).toHaveLength(17);
    expect(doc.nodes.filter((node) => node.type === 'frame')).toHaveLength(1038);
    expect(doc.variables).toHaveLength(122);
    expect(doc.variableCollections).toHaveLength(6);
    expect(doc.pages?.length).toBeGreaterThan(0);
    expect(doc.pages?.some((page) => page.id === doc.activePageId)).toBe(true);
    expect(doc.nodes.filter((node) => node.parentId === null).every((node) =>
      doc.pages?.some((page) => page.id === node.pageId),
    )).toBe(true);
    expect(isDesignDocument(JSON.parse(JSON.stringify(doc)))).toBe(true);
  });

  it('preserves screen geometry, text, Auto Layout and vector paths', () => {
    const doc = importFixture();
    const screen = doc.nodes.find((node) => node.id === 'fig-0-253');
    expect(screen).toMatchObject({ type: 'frame', name: '00. Текущий экран', x: 200, y: 482, width: 1440, height: 1000 });
    const title = doc.nodes.find((node) => node.id === 'fig-0-248');
    expect(title).toMatchObject({ type: 'text', text: 'Справки. Новые состояния экрана', x: 200, y: 138, fontFamily: 'Manrope' });
    const content = doc.nodes.find((node) => node.id === 'fig-0-254');
    expect(content).toMatchObject({ parentId: 'fig-0-253', x: 432, y: 482 });
    const cardText = doc.nodes.find((node) => node.id === 'fig-0-266');
    expect(cardText).toMatchObject({ parentId: 'fig-0-260', x: 750, y: 770, width: 266, height: 72 });
    const vector = doc.nodes.find((node) => node.type === 'vector');
    expect(vector?.type === 'vector' && vector.path).toMatch(/^M/);
    expect(vector?.type === 'vector' && vector.path).not.toContain('NaN');
    const expandedStroke = doc.nodes.find((node) => node.id === 'fig-0-80');
    expect(expandedStroke).toMatchObject({
      type: 'vector', fill: '#4c5c64', stroke: 'transparent', strokeWidth: 0,
    });
    expect(doc.nodes.filter((node) => node.type === 'frame' && node.autoLayout)).toHaveLength(691);
  });

  it('retains component links and survives the editor normalization pipeline', () => {
    const doc = importFixture();
    expect(doc.nodes.filter((node) => node.component?.role === 'main' && node.id === node.component.rootId)).toHaveLength(26);
    expect(doc.nodes.filter((node) => node.component?.role === 'instance' && node.component.sourceId === node.component.rootId)).toHaveLength(176);

    const normalized = syncComponents(resolveVariables(doc));
    expect(normalized.nodes).toHaveLength(doc.nodes.length);
    expect(normalized.nodes.find((node) => node.id === 'fig-0-253')).toMatchObject({ x: 200, y: 482, width: 1440, height: 1000 });
    expect(normalized.nodes.find((node) => node.id === 'fig-0-248')).toMatchObject({ x: 200, y: 138 });
    const differences: unknown[] = [];
    doc.nodes.forEach((source) => {
      const normalizedNode = normalized.nodes.find((node) => node.id === source.id);
      if (!normalizedNode) {
        differences.push({ id: source.id, missing: true });
        return;
      }
      const delta = Object.fromEntries((['x', 'y', 'width', 'height'] as const).map((field) => [field, Math.abs(source[field] - normalizedNode[field])]));
      if (Object.values(delta).some((value) => value > 0.05)) differences.push({ id: source.id, name: source.name, delta });
    });
    expect(differences, JSON.stringify(differences.slice(0, 12), null, 2)).toHaveLength(0);
  });

  it('keeps both SMZ pages populated in their original coordinate spaces', () => {
    const doc = importSmzFixture();
    expect(doc.pages).toEqual([
      { id: 'fig-page-0', name: 'Справки' },
      { id: 'fig-page-1', name: 'Уведомления' },
    ]);
    expect(doc.nodes).toHaveLength(4477);
    expect(doc.nodes.find((node) => node.id === 'fig-0-253')).toMatchObject({ pageId: 'fig-page-0', x: 200, y: 482 });
    expect(doc.nodes.find((node) => node.id === 'fig-0-993')).toMatchObject({ pageId: 'fig-page-1', x: 168, y: 482, width: 1440, height: 1000 });
    expect(doc.nodes.find((node) => node.id === 'fig-0-842')).toMatchObject({ pageId: 'fig-page-1', x: 1688, y: 482 });
  });

  it('imports SMZ bell curves and identifies logo mask containers', () => {
    const doc = importSmzFixture();
    const bell = doc.nodes.find((node) => node.id === 'fig-0-2179');
    expect(bell).toMatchObject({
      type: 'vector', fill: 'transparent', stroke: '#02807c', strokeWidth: 1.274999976158142,
    });
    expect(bell?.type === 'vector' && bell.path).toContain('C');
    expect(bell?.type === 'vector' && bell.path).toContain('M7.5 15.75 L10.5 15.75');
    expect(bell?.type === 'vector' && bell.path).not.toBe('M0 0H18V18H0Z');
    expect(doc.nodes.find((node) => node.id === 'fig-0-2344')).toMatchObject({
      type: 'frame', name: 'clip0_10_4104', isMask: true,
    });
  });
});

describe('Community FIG regressions', () => {
  it('materializes an embedded image fill instead of a transparent cover', () => {
    const doc = importCommunityFixture('UI Prep.Cover.fig');
    const cover = doc.nodes.find((node) => node.id === 'fig-0-4');
    expect(cover).toMatchObject({
      type: 'image', name: 'Cover', width: 1920, height: 960, objectFit: 'cover',
    });
    expect(cover?.type === 'image' && cover.src.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('preserves Figma world transforms without applying reflected geometry twice', () => {
    const doc = importCommunityFixture('Globbb.Pages.fig');
    expect(doc.nodes).toHaveLength(95);
    expect(doc.nodes.find((node) => node.id === 'fig-0-45')).toMatchObject({
      type: 'frame', name: 'Picture', x: 1083, y: 155, flipX: true, clip: true,
    });
    expect(doc.nodes.find((node) => node.id === 'fig-0-98')).toMatchObject({
      type: 'vector', flipX: true, rotation: 35.52297501957209,
    });

    const worldOrigin = (id: string) => {
      const node = doc.nodes.find((candidate) => candidate.id === id)!;
      let matrix = nodeMatrix(node);
      let parentId = node.parentId;
      while (parentId) {
        const parent = doc.nodes.find((candidate) => candidate.id === parentId)!;
        matrix = multiplyMatrix(nodeMatrix(parent), matrix);
        parentId = parent.parentId;
      }
      return applyMatrix(matrix, node);
    };
    const picture = worldOrigin('fig-0-45');
    expect(picture.x).toBeCloseTo(1957, 6);
    expect(picture.y).toBeCloseTo(155, 6);
    const brain = worldOrigin('fig-0-47');
    expect(brain.x).toBeCloseTo(1760.2060546875, 6);
    expect(brain.y).toBeCloseTo(164.1639099121094, 6);
    const arm = worldOrigin('fig-0-98');
    expect(arm.x).toBeCloseTo(495.875732421875, 6);
    expect(arm.y).toBeCloseTo(371.39723205566406, 6);
  });

  it('retains the source font and supports stretched embedded image paints', () => {
    const doc = importCommunityFixture('UI Prep.Buttons.fig');
    expect(doc.nodes.find((node) => node.id === 'fig-0-6')).toMatchObject({
      type: 'text', fontFamily: 'SF Pro Text',
    });
    const image = doc.nodes.find((node) => node.id === 'fig-0-85');
    expect(image).toMatchObject({ type: 'image', objectFit: 'fill' });
    expect(image?.type === 'image' && image.src.startsWith('data:image/png;base64,')).toBe(true);
  });
});
