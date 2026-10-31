import { materializeFigArchive } from '@open-pencil/fig';
import { imageMimeType } from '@open-pencil/scene-graph';
import type { SceneNode as FigmaSceneNode } from '@open-pencil/scene-graph';
import type {
  AutoLayoutSettings,
  DesignDocument,
  EditorNode,
  GradientFillDefinition,
  VariableCollection,
  VariableDefinition,
  VectorNode,
} from '../types';

const idPart = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-');
const nodeId = (id: string) => `fig-${idPart(id)}`;
const variableId = (id: string) => `fig-variable-${idPart(id)}`;
const collectionId = (id: string) => `fig-collection-${idPart(id)}`;
const modeId = (id: string) => `fig-mode-${idPart(id)}`;

function isColor(value: unknown): value is { r: number; g: number; b: number; a: number } {
  if (!value || typeof value !== 'object') return false;
  const color = value as Record<string, unknown>;
  return ['r', 'g', 'b', 'a'].every((key) => typeof color[key] === 'number');
}

export function figColorToCss(color: { r: number; g: number; b: number; a: number }, opacity = 1): string {
  const r = Math.round(Math.max(0, Math.min(1, color.r)) * 255);
  const g = Math.round(Math.max(0, Math.min(1, color.g)) * 255);
  const b = Math.round(Math.max(0, Math.min(1, color.b)) * 255);
  const alpha = Math.max(0, Math.min(1, color.a * opacity));
  const hex = `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  return alpha >= 0.999 ? hex : `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(4))})`;
}

function visiblePaint(node: FigmaSceneNode, kind: 'fills'): FigmaSceneNode['fills'][number] | undefined;
function visiblePaint(node: FigmaSceneNode, kind: 'strokes'): FigmaSceneNode['strokes'][number] | undefined;
function visiblePaint(node: FigmaSceneNode, kind: 'fills' | 'strokes') {
  return node[kind].find((paint) => paint.visible && paint.type === 'SOLID' && isColor(paint.color));
}

function visibleImagePaint(node: FigmaSceneNode) {
  return node.fills.find((paint) => paint.visible && paint.type === 'IMAGE' && paint.imageHash);
}

function visibleGradientPaint(node: FigmaSceneNode) {
  return node.fills.find((paint) => paint.visible &&
    (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') &&
    paint.gradientStops?.length && paint.gradientTransform);
}

function mapGradient(paint: NonNullable<ReturnType<typeof visibleGradientPaint>>): GradientFillDefinition {
  return {
    type: paint.type === 'GRADIENT_LINEAR' ? 'linear' : 'radial',
    stops: paint.gradientStops!.map((stop) => ({
      color: figColorToCss(stop.color, paint.opacity),
      position: stop.position,
    })),
    transform: { ...paint.gradientTransform! },
  };
}

function pageBackground(page: FigmaSceneNode): string | undefined {
  const fields = page.source.fig.rawNodeFields;
  const paints = Array.isArray(fields.backgroundPaints) ? fields.backgroundPaints : [];
  const paint = paints.find((candidate) => {
    if (!candidate || typeof candidate !== 'object') return false;
    const value = candidate as Record<string, unknown>;
    return value.visible !== false && value.type === 'SOLID' && isColor(value.color);
  }) as Record<string, unknown> | undefined;
  if (paint && isColor(paint.color)) {
    return figColorToCss(paint.color, typeof paint.opacity === 'number' ? paint.opacity : 1);
  }
  return isColor(fields.backgroundColor) ? figColorToCss(fields.backgroundColor) : undefined;
}

/** Convert embedded FIG image bytes without depending on object URLs or network access. */
export function figImageToDataUrl(data: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < data.byteLength; offset += 0x8000) {
    binary += String.fromCharCode(...data.subarray(offset, offset + 0x8000));
  }
  return `data:${imageMimeType(data)};base64,${btoa(binary)}`;
}

/** Decode Figma's command/float32 geometry blobs into editable SVG path data. */
export function decodeGeometryPath(blob: Uint8Array): string {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const commands: string[] = [];
  const number = (value: number) => {
    const rounded = Math.abs(value) < 0.0005 ? 0 : Number(value.toFixed(3));
    return String(rounded);
  };
  const point = (offset: number) => `${number(view.getFloat32(offset, true))} ${number(view.getFloat32(offset + 4, true))}`;
  let offset = 0;
  while (offset < blob.byteLength) {
    const command = blob[offset];
    offset += 1;
    if (command === 0) {
      commands.push('Z');
      continue;
    }
    const coordinatePairs = command === 1 || command === 2 ? 1 : command === 3 ? 2 : command === 4 ? 3 : 0;
    const svgCommand = command === 1 ? 'M' : command === 2 ? 'L' : command === 3 ? 'Q' : command === 4 ? 'C' : '';
    if (!svgCommand || offset + coordinatePairs * 8 > blob.byteLength) break;
    const points: string[] = [];
    for (let index = 0; index < coordinatePairs; index += 1) {
      points.push(point(offset));
      offset += 8;
    }
    commands.push(`${svgCommand}${points.join(' ')}`);
  }
  return commands.join(' ');
}

type FigmaVectorNetwork = NonNullable<FigmaSceneNode['vectorNetwork']>;

/** Convert Figma vertices/segments when derived fill/stroke geometry is absent. */
export function decodeVectorNetwork(network: FigmaVectorNetwork): string {
  const commands: string[] = [];
  const used = new Set<number>();
  const adjacency = new Map<number, number[]>();
  network.segments.forEach((segment, index) => {
    for (const vertex of [segment.start, segment.end]) {
      const indices = adjacency.get(vertex) ?? [];
      indices.push(index);
      adjacency.set(vertex, indices);
    }
  });
  const number = (value: number) => String(Math.abs(value) < 0.0005 ? 0 : Number(value.toFixed(3)));
  const point = (vertex: { x: number; y: number }) => `${number(vertex.x)} ${number(vertex.y)}`;
  const append = (index: number, from: number): number => {
    const segment = network.segments[index];
    const forward = segment.start === from;
    const start = network.vertices[from];
    const endIndex = forward ? segment.end : segment.start;
    const end = network.vertices[endIndex];
    const tangentStart = forward ? segment.tangentStart : segment.tangentEnd;
    const tangentEnd = forward ? segment.tangentEnd : segment.tangentStart;
    const firstControl = { x: start.x + tangentStart.x, y: start.y + tangentStart.y };
    const secondControl = { x: end.x + tangentEnd.x, y: end.y + tangentEnd.y };
    commands.push(tangentStart.x === 0 && tangentStart.y === 0 && tangentEnd.x === 0 && tangentEnd.y === 0
      ? `L${point(end)}`
      : `C${point(firstControl)} ${point(secondControl)} ${point(end)}`);
    used.add(index);
    return endIndex;
  };
  const appendSequence = (indices: number[], close: boolean) => {
    const first = network.segments[indices[0]];
    if (!first) return;
    let start = first.start;
    if (indices.length > 1) {
      const second = network.segments[indices[1]];
      const endConnects = first.end === second.start || first.end === second.end;
      if (!endConnects) start = first.end;
    }
    let current = start;
    commands.push(`M${point(network.vertices[start])}`);
    for (const index of indices) {
      if (network.segments[index].start !== current && network.segments[index].end !== current) break;
      current = append(index, current);
    }
    if (close && current === start) commands.push('Z');
  };

  // Region loops preserve Figma's fill winding and disconnected holes.
  network.regions.forEach((region) => region.loops.forEach((loop) => appendSequence(loop, true)));
  // Open strokes are not regions. Walk their connected segments as one path so
  // line caps/joins are not incorrectly restarted for every segment.
  for (let index = 0; index < network.segments.length; index += 1) {
    if (used.has(index)) continue;
    const first = network.segments[index];
    const startDegree = adjacency.get(first.start)?.filter((candidate) => !used.has(candidate)).length ?? 0;
    const endDegree = adjacency.get(first.end)?.filter((candidate) => !used.has(candidate)).length ?? 0;
    let current = endDegree === 1 && startDegree > 1 ? first.end : first.start;
    const start = current;
    commands.push(`M${point(network.vertices[start])}`);
    let segmentIndex: number | undefined = index;
    while (segmentIndex !== undefined && !used.has(segmentIndex)) {
      current = append(segmentIndex, current);
      if (current === start) {
        commands.push('Z');
        break;
      }
      segmentIndex = adjacency.get(current)?.find((candidate) => !used.has(candidate));
    }
  }
  return commands.join(' ');
}

function mapAutoLayout(node: FigmaSceneNode, children: FigmaSceneNode[]): AutoLayoutSettings | undefined {
  if (node.layoutMode !== 'HORIZONTAL' && node.layoutMode !== 'VERTICAL') return undefined;
  const horizontal = node.layoutMode === 'HORIZONTAL';
  const align = node.counterAxisAlign === 'CENTER' ? 'center' : node.counterAxisAlign === 'MAX' ? 'end' : 'start';
  const justify = node.primaryAxisAlign === 'CENTER'
    ? 'center'
    : node.primaryAxisAlign === 'MAX'
      ? 'end'
      : node.primaryAxisAlign === 'SPACE_BETWEEN' ? 'space-between' : 'start';
  const widthSizing = horizontal ? node.primaryAxisSizing : node.counterAxisSizing;
  const heightSizing = horizontal ? node.counterAxisSizing : node.primaryAxisSizing;
  const border = Math.max(0, ...node.strokes.filter((stroke) => stroke.visible).map((stroke) => stroke.weight));
  const layoutChildren = children.filter((child) => child.visible && child.layoutPositioning !== 'ABSOLUTE');
  const mainOf = (child: FigmaSceneNode) => horizontal ? child.width : child.height;
  const crossOf = (child: FigmaSceneNode) => horizontal ? child.height : child.width;
  const contentMain = layoutChildren.reduce((sum, child) => sum + mainOf(child), 0) + Math.max(0, layoutChildren.length - 1) * node.itemSpacing;
  const contentCross = layoutChildren.length > 0 ? Math.max(...layoutChildren.map(crossOf)) : 0;
  const mainPadding = horizontal
    ? node.paddingLeft + node.paddingRight + border * 2
    : node.paddingTop + node.paddingBottom + border * 2;
  const crossPadding = horizontal
    ? node.paddingTop + node.paddingBottom + border * 2
    : node.paddingLeft + node.paddingRight + border * 2;
  const expectedWidth = (horizontal ? contentMain + mainPadding : contentCross + crossPadding);
  const expectedHeight = (horizontal ? contentCross + crossPadding : contentMain + mainPadding);
  const widthMode = widthSizing === 'HUG' && Math.abs(expectedWidth - node.width) <= 0.05 ? 'hug' : 'fixed';
  const heightMode = heightSizing === 'HUG' && Math.abs(expectedHeight - node.height) <= 0.05 ? 'hug' : 'fixed';
  return {
    direction: horizontal ? 'horizontal' : 'vertical',
    gap: node.itemSpacing,
    padding: {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft,
    },
    align,
    justify,
    hug: false,
    widthMode,
    heightMode,
    minWidth: node.minWidth ?? undefined,
    maxWidth: node.maxWidth ?? undefined,
    minHeight: node.minHeight ?? undefined,
    maxHeight: node.maxHeight ?? undefined,
  };
}

function mapVariableBindings(node: FigmaSceneNode, supportedVariables: Set<string>): Record<string, string> | undefined {
  const bindings: Record<string, string> = {};
  Object.entries(node.boundVariables).forEach(([property, sourceId]) => {
    if (!supportedVariables.has(sourceId)) return;
    const target = property === 'itemSpacing'
      ? 'autoLayout.gap'
      : property.startsWith('padding')
        ? `autoLayout.padding.${property.slice('padding'.length).toLowerCase()}`
        : property === 'fills/0/color'
          ? 'fill'
          : property === 'strokes/0/color'
            ? 'stroke'
            : property.endsWith('Radius') ? 'cornerRadius' : '';
    if (target) bindings[target] = variableId(sourceId);
  });
  return Object.keys(bindings).length > 0 ? bindings : undefined;
}

function equivalent(left: unknown, right: unknown): boolean {
  return left === right || JSON.stringify(left) === JSON.stringify(right);
}

const overrideFields = [
  'name', 'width', 'height', 'rotation', 'flipX', 'flipY', 'opacity', 'visible', 'locked', 'fill', 'stroke', 'strokeWidth',
  'strokeAlign', 'strokeDash', 'strokeCap', 'strokeJoin', 'fillGradient', 'cornerRadius', 'clip', 'autoLayout', 'layout', 'text', 'fontSize', 'fontFamily',
  'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'autoSize', 'path', 'pathWidth', 'pathHeight',
  'fillRule', 'src', 'objectFit', 'clipShape', 'variableBindings',
] as const;

export function importFigmaDocument(buffer: ArrayBuffer, fileName = 'Макет Figma'): DesignDocument {
  const diagnostics = { properties: 0, assignments: 0, components: 0, slots: 0 };
  const { graph } = materializeFigArchive(buffer, {
    // A stale override must not discard every valid page in a large Figma library.
    onUnresolvedProperty: () => { diagnostics.properties += 1; },
    onUnresolvedAssignment: () => { diagnostics.assignments += 1; },
    onMissingComponent: () => { diagnostics.components += 1; },
    onMissingSlotContent: () => { diagnostics.slots += 1; },
  });
  const skipped = Object.values(diagnostics).reduce((sum, count) => sum + count, 0);
  if (skipped > 0) {
    console.warn(`[Figma import] Пропущено устаревших component overrides: ${skipped}`, diagnostics);
  }
  const pages = graph.getPages().filter((page) => !page.internalOnly);
  if (pages.length === 0) throw new Error('В Figma-файле нет доступных страниц.');

  const variableDefinitions: VariableDefinition[] = [];
  const supportedVariables = new Set<string>();
  for (const variable of graph.variables.values()) {
    if (variable.type !== 'COLOR' && variable.type !== 'FLOAT') continue;
    const collection = graph.variableCollections.get(variable.collectionId);
    const activeMode = collection
      ? graph.activeMode.get(collection.id) ?? collection.defaultModeId ?? collection.modes[0]?.modeId
      : undefined;
    const convert = (value: unknown): string | number | undefined => {
      if (variable.type === 'FLOAT') return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
      return isColor(value) ? figColorToCss(value) : undefined;
    };
    const resolved = activeMode ? graph.resolveVariable(variable.id, activeMode) : undefined;
    const value = convert(resolved) ?? convert(Object.values(variable.valuesByMode)[0]);
    if (value === undefined) continue;
    const modeValues: Record<string, string | number> = {};
    for (const mode of collection?.modes ?? []) {
      const modeValue = convert(graph.resolveVariable(variable.id, mode.modeId));
      if (modeValue !== undefined) modeValues[modeId(mode.modeId)] = modeValue;
    }
    const activeRaw = activeMode ? variable.valuesByMode[activeMode] : undefined;
    const aliasOf = activeRaw && typeof activeRaw === 'object' && 'aliasId' in activeRaw && supportedVariables.has(activeRaw.aliasId)
      ? variableId(activeRaw.aliasId)
      : undefined;
    supportedVariables.add(variable.id);
    variableDefinitions.push({
      id: variableId(variable.id),
      name: variable.name,
      type: variable.type === 'COLOR' ? 'color' : 'number',
      value,
      collectionId: collection ? collectionId(collection.id) : undefined,
      modeValues: Object.keys(modeValues).length > 0 ? modeValues : undefined,
      aliasOf,
    });
  }

  const variableCollections: VariableCollection[] = [...graph.variableCollections.values()].map((collection) => ({
    id: collectionId(collection.id),
    name: collection.name,
    modes: collection.modes.map((mode) => ({ id: modeId(mode.modeId), name: mode.name })),
    activeModeId: modeId(graph.activeMode.get(collection.id) ?? collection.defaultModeId ?? collection.modes[0]?.modeId ?? ''),
  })).filter((collection) => collection.modes.length > 0);

  const nodes: EditorNode[] = [];
  const importedByGraphId = new Map<string, EditorNode>();
  const instanceSources = new Map<string, { ownerId: string; sourceId: string }>();

  const visit = (node: FigmaSceneNode, parentId: string | null, offsetX: number, offsetY: number, pageId: string) => {
    // Malewich stores untransformed absolute layout geometry and composes each
    // node's rotation/reflection through its ancestors. getAbsolutePosition()
    // already includes those transforms, so using it here would apply them twice.
    const x = node.x + offsetX;
    const y = node.y + offsetY;
    const fill = visiblePaint(node, 'fills');
    const stroke = visiblePaint(node, 'strokes');
    const gradient = visibleGradientPaint(node);
    const imageFill = visibleImagePaint(node);
    const imageBytes = imageFill?.imageHash ? graph.images.get(imageFill.imageHash) : undefined;
    const imageScaleMode = String(imageFill?.imageScaleMode ?? '');
    const ancestors: FigmaSceneNode[] = [];
    let ancestor = node.parentId ? graph.getNode(node.parentId) : undefined;
    while (ancestor && ancestor.type !== 'CANVAS') {
      ancestors.unshift(ancestor);
      ancestor = ancestor.parentId ? graph.getNode(ancestor.parentId) : undefined;
    }
    const instanceOwner = node.type === 'INSTANCE' ? node : [...ancestors].reverse().find((item) => item.type === 'INSTANCE');
    const mainOwner = node.type === 'COMPONENT' ? node : ancestors.find((item) => item.type === 'COMPONENT');
    const parent = node.parentId ? graph.getNode(node.parentId) : undefined;
    const parentDirection = parent?.layoutMode === 'HORIZONTAL'
      ? 'horizontal'
      : parent?.layoutMode === 'VERTICAL' ? 'vertical' : null;
    const mainFill = parentDirection === 'horizontal' ? 'horizontal' : 'vertical';
    const crossFill = parentDirection === 'horizontal' ? 'vertical' : 'horizontal';
    const layout = parentDirection ? {
      horizontal: (mainFill === 'horizontal' && node.layoutGrow > 0) || (crossFill === 'horizontal' && node.layoutAlignSelf === 'STRETCH') ? 'fill' as const : 'fixed' as const,
      vertical: (mainFill === 'vertical' && node.layoutGrow > 0) || (crossFill === 'vertical' && node.layoutAlignSelf === 'STRETCH') ? 'fill' as const : 'fixed' as const,
      absolute: node.layoutPositioning === 'ABSOLUTE',
      minWidth: node.minWidth ?? undefined,
      maxWidth: node.maxWidth ?? undefined,
      minHeight: node.minHeight ?? undefined,
      maxHeight: node.maxHeight ?? undefined,
    } : undefined;
    const dashPattern = (stroke?.dashPattern ?? node.dashPattern).filter((value) => Number.isFinite(value) && value > 0);
    const strokeCap = stroke?.cap ?? node.strokeCap;
    const strokeJoin = stroke?.join ?? node.strokeJoin;
    const base = {
      id: nodeId(node.id),
      name: node.name || node.text || node.type,
      x,
      y,
      width: Math.max(0, node.width),
      height: Math.max(0, node.height),
      // Figma composes flip → rotation; Malewich composes rotation → flip.
      // Negating a single-axis reflection's angle preserves the same affine matrix.
      rotation: node.flipX !== node.flipY ? -node.rotation : node.rotation,
      flipX: node.flipX || undefined,
      flipY: node.flipY || undefined,
      opacity: node.opacity,
      visible: node.visible,
      locked: node.locked,
      isMask: node.isMask || undefined,
      parentId,
      pageId: parentId === null ? pageId : undefined,
      fill: fill ? figColorToCss(fill.color, fill.opacity) : gradient?.gradientStops?.[0]
        ? figColorToCss(gradient.gradientStops[0].color, gradient.opacity) : 'transparent',
      stroke: stroke ? figColorToCss(stroke.color, stroke.opacity) : 'transparent',
      strokeWidth: stroke?.weight ?? 0,
      strokeAlign: stroke?.align === 'INSIDE' ? 'inside' as const : stroke?.align === 'OUTSIDE' ? 'outside' as const : 'center' as const,
      strokeDash: dashPattern.length > 0 ? dashPattern : undefined,
      strokeCap: stroke ? strokeCap === 'ROUND' ? 'round' as const : strokeCap === 'SQUARE' ? 'square' as const : 'butt' as const : undefined,
      strokeJoin: stroke ? strokeJoin === 'ROUND' ? 'round' as const : strokeJoin === 'BEVEL' ? 'bevel' as const : 'miter' as const : undefined,
      fillGradient: gradient ? mapGradient(gradient) : undefined,
      layout,
      variableBindings: mapVariableBindings(node, supportedVariables),
    };

    let imported: EditorNode;
    const imageShape = node.type === 'FRAME' || node.type === 'RECTANGLE' || node.type === 'ROUNDED_RECTANGLE' || node.type === 'ELLIPSE';
    if (imageFill && imageBytes && imageShape && graph.getChildren(node.id).length === 0 &&
      (imageScaleMode === 'FILL' || imageScaleMode === 'STRETCH')) {
      imported = {
        ...base,
        type: 'image',
        src: figImageToDataUrl(imageBytes),
        cornerRadius: node.independentCorners ? node.topLeftRadius : node.cornerRadius,
        clipShape: node.type === 'ELLIPSE' ? 'ellipse' as const : undefined,
        objectFit: imageScaleMode === 'FILL' ? 'cover' : 'fill',
        opacity: node.opacity * imageFill.opacity,
      };
    } else if (node.type === 'TEXT') {
      imported = {
        ...base,
        type: 'text',
        text: node.text,
        fontSize: node.fontSize,
        fontFamily: node.fontFamily,
        fontWeight: node.fontWeight,
        lineHeight: node.lineHeight ? node.lineHeight / node.fontSize : 1.2,
        letterSpacing: node.letterSpacing,
        textAlign: node.textAlignHorizontal === 'CENTER' ? 'center' : node.textAlignHorizontal === 'RIGHT' ? 'right' : 'left',
        autoSize: node.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'width' : node.textAutoResize === 'HEIGHT' ? 'height' : 'none',
      };
    } else if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'LINE' || node.type === 'POLYGON' || node.type === 'STAR') {
      const fillGeometry = node.fillGeometry[0];
      const strokeGeometry = node.strokeGeometry[0];
      const geometry = fillGeometry ?? strokeGeometry;
      const path = geometry
        ? decodeGeometryPath(geometry.commandsBlob)
        : node.vectorNetwork ? decodeVectorNetwork(node.vectorNetwork) : '';
      // Figma's strokeGeometry is already an expanded outline. Fill that
      // outline with the stroke paint instead of stroking it a second time.
      const bakeStroke = !fillGeometry && !!strokeGeometry && !!stroke;
      const variableBindings = base.variableBindings ? { ...base.variableBindings } : undefined;
      if (bakeStroke && variableBindings?.stroke) {
        variableBindings.fill = variableBindings.stroke;
        delete variableBindings.stroke;
      }
      imported = {
        ...base,
        ...(bakeStroke ? {
          fill: base.stroke,
          stroke: 'transparent',
          strokeWidth: 0,
          variableBindings,
        } : {}),
        type: 'vector',
        path: path || `M0 0H${node.width}V${node.height}H0Z`,
        pathWidth: Math.max(0.01, node.width),
        pathHeight: Math.max(0.01, node.height),
        fillRule: geometry?.windingRule === 'EVENODD' || (!geometry && node.vectorNetwork?.regions.some((region) => region.windingRule === 'EVENODD')) ? 'evenodd' : 'nonzero',
      } satisfies VectorNode;
    } else if (node.type === 'RECTANGLE' || node.type === 'ROUNDED_RECTANGLE') {
      imported = {
        ...base,
        type: 'rectangle',
        cornerRadius: node.independentCorners ? node.topLeftRadius : node.cornerRadius,
      };
    } else if (node.type === 'ELLIPSE') {
      imported = { ...base, type: 'ellipse' };
    } else {
      imported = {
        ...base,
        type: 'frame',
        cornerRadius: node.independentCorners ? node.topLeftRadius : node.cornerRadius,
        clip: node.clipsContent,
        autoLayout: mapAutoLayout(node, graph.getChildren(node.id)),
      };
    }

    if (instanceOwner) {
      const sourceId = node.componentId ?? (node === instanceOwner ? instanceOwner.componentId : null);
      if (sourceId && instanceOwner.componentId) {
        imported.component = { rootId: nodeId(instanceOwner.componentId), sourceId: nodeId(sourceId), role: 'instance' };
        imported.variantKey = nodeId(sourceId);
        instanceSources.set(imported.id, { ownerId: instanceOwner.id, sourceId });
      }
    } else if (mainOwner) {
      imported.component = { rootId: nodeId(mainOwner.id), sourceId: nodeId(node.id), role: 'main' };
      imported.variantKey = nodeId(node.id);
    }

    nodes.push(imported);
    importedByGraphId.set(node.id, imported);
    graph.getChildren(node.id).forEach((child) => visit(child, imported.id, x, y, pageId));
  };

  pages.forEach((page, pageIndex) => {
    const roots = graph.getChildren(page.id);
    // Pages are independent coordinate spaces. Never lay them out side by side:
    // doing so moves a newly selected page thousands of pixels outside the viewport.
    roots.forEach((root) => visit(root, null, 0, 0, `fig-page-${pageIndex}`));
  });

  // Keep source links, but freeze only values that actually differ from the main component.
  for (const [importedId, link] of instanceSources) {
    const imported = nodes.find((node) => node.id === importedId);
    const instanceRoot = importedByGraphId.get(link.ownerId);
    const mainRoot = nodes.find((node) => node.id === instanceRoot?.component?.rootId);
    const main = nodes.find((node) => node.id === imported?.component?.sourceId && node.component?.role === 'main');
    if (!imported || !instanceRoot || !mainRoot || !main) {
      if (imported) {
        imported.component = undefined;
        imported.variantKey = undefined;
      }
      continue;
    }
    const overrides: Record<string, unknown> = {};
    const deltaX = instanceRoot.x - mainRoot.x;
    const deltaY = instanceRoot.y - mainRoot.y;
    if (!equivalent(imported.x, main.x + deltaX)) overrides.x = imported.x;
    if (!equivalent(imported.y, main.y + deltaY)) overrides.y = imported.y;
    const importedRecord = imported as unknown as Record<string, unknown>;
    const mainRecord = main as unknown as Record<string, unknown>;
    overrideFields.forEach((field) => {
      if (!equivalent(importedRecord[field], mainRecord[field])) overrides[field] = importedRecord[field];
    });
    imported.overrides = Object.keys(overrides).length > 0 ? overrides : undefined;
  }

  const now = new Date().toISOString();
  return {
    version: 1,
    preserveSavedGeometry: true,
    id: crypto.randomUUID(),
    name: fileName.replace(/\.fig$/i, '') || 'Макет Figma',
    createdAt: now,
    updatedAt: now,
    nodes,
    pages: pages.map((page, index) => ({
      id: `fig-page-${index}`,
      name: page.name || `Страница ${index + 1}`,
      background: pageBackground(page),
    })),
    activePageId: 'fig-page-0',
    variables: variableDefinitions,
    variableCollections,
  };
}
