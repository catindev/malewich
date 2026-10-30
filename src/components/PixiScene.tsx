import { useEffect, useMemo, useRef, useState } from 'react';
import { Application, CanvasTextMetrics, Container, Graphics, GraphicsPath, Sprite, Text, Texture } from 'pixi.js';
import type { DesignDocument, EditorNode, Point, TextNode, Viewport } from '../types';
import { fontFamilyWithFallback, getTextLines, invalidateTextLayoutCaches } from '../utils/text';
import { measurePixiText } from '../utils/pixiTextCache';
import { getActivePageId } from '../utils/pages';
import { previewOverscan, textResolutionForZoom, vectorFillPaths } from '../utils/rendering';
import { acquireImageTexture, imageBucketForSize, imageTextureCacheStats } from '../utils/imageTextures';
import type { DocumentChange } from '../utils/documentChanges';

interface PixiSceneProps {
  doc: DesignDocument;
  change: DocumentChange;
  viewport: Viewport;
  editingId: string | null;
  panning: boolean;
  movingIds: string[];
  moveDelta: Point | null;
  suppressedIds: Set<string>;
  onFallback: () => void;
}

interface TextChunk {
  view: Text;
  resolution: number;
}

interface TextVisualState {
  base: Text;
  greek: Graphics;
  chunks: Container;
  items: TextChunk[];
  chunkKey: string | null;
  measured: CanvasTextMetrics;
}

interface NodeView {
  source: EditorNode;
  container: Container;
  visual: Container | null;
  text: TextVisualState | null;
  mask: Graphics | null;
  image: { bucket: number; key: string; release: () => void } | null;
  cleanup: (() => void) | null;
  invalidate: () => void;
}

interface PageScene {
  world: Container;
  views: Map<string, NodeView>;
}

function paint(value: string): { color: number; alpha: number } {
  if (value === 'transparent') return { color: 0xffffff, alpha: 0 };
  const rgba = value.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
  if (rgba) {
    return {
      color: (Number(rgba[1]) << 16) + (Number(rgba[2]) << 8) + Number(rgba[3]),
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  const hex = value.replace('#', '');
  return { color: Number.parseInt(hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex, 16), alpha: 1 };
}

function roundedRect(graphics: Graphics, node: Extract<EditorNode, { cornerRadius: number }>) {
  if (node.cornerRadius > 0) return graphics.roundRect(node.x, node.y, node.width, node.height, node.cornerRadius);
  return graphics.rect(node.x, node.y, node.width, node.height);
}

function shapePath(graphics: Graphics, node: EditorNode) {
  if (node.type === 'ellipse') return graphics.ellipse(node.x + node.width / 2, node.y + node.height / 2, node.width / 2, node.height / 2);
  if ('cornerRadius' in node) return roundedRect(graphics, node);
  return graphics.rect(node.x, node.y, node.width, node.height);
}

function createShapeVisual(node: EditorNode): Container {
  const group = new Container();
  const fillPaint = 'fill' in node ? paint(node.fill) : paint('#ffffff');
  const strokePaint = paint(node.stroke);
  const fill = shapePath(new Graphics(), node).fill(fillPaint);
  group.addChild(fill);
  if (node.strokeWidth > 0 && strokePaint.alpha > 0) {
    const stroke = shapePath(new Graphics(), node).stroke({
      ...strokePaint,
      width: node.strokeWidth * (node.strokeAlign === 'inside' ? 2 : 1),
    });
    if (node.strokeAlign === 'inside') {
      const mask = shapePath(new Graphics(), node).fill(0xffffff);
      stroke.mask = mask;
      group.addChild(mask);
    }
    group.addChild(stroke);
  }
  return group;
}

function createGreekText(node: TextNode, base: Text, measured: CanvasTextMetrics): Graphics {
  const greek = new Graphics();
  const baseLeft = base.x - base.anchor.x * measured.width;
  const fill = paint(node.fill);
  measured.lines.forEach((line, lineIndex) => {
    const width = measured.lineWidths[lineIndex];
    if (!line || width <= 0) return;
    const alignOffset = base.style.align === 'center'
      ? (measured.maxLineWidth - width) / 2
      : base.style.align === 'right' ? measured.maxLineWidth - width : 0;
    greek.rect(
      baseLeft + alignOffset,
      base.y + lineIndex * measured.lineHeight + node.fontSize * 0.35,
      width,
      Math.max(0.5, node.fontSize * 0.55),
    );
  });
  greek.fill({ color: fill.color, alpha: fill.alpha * 0.35 });
  greek.visible = false;
  return greek;
}

function createTextVisual(node: TextNode): { visual: Container; state: TextVisualState } {
  const anchor = node.textAlign === 'center' ? 0.5 : node.textAlign === 'right' ? 1 : 0;
  const x = node.textAlign === 'center'
    ? node.x + node.width / 2
    : node.textAlign === 'right' ? node.x + node.width : node.x;
  const base = new Text({
    text: getTextLines(node).join('\n'),
    style: {
      fill: paint(node.fill).color,
      fontFamily: fontFamilyWithFallback(node.fontFamily),
      fontSize: node.fontSize,
      fontWeight: String(node.fontWeight) as Text['style']['fontWeight'],
      lineHeight: node.fontSize * node.lineHeight,
      letterSpacing: node.letterSpacing,
      align: node.textAlign,
      // CanvasTextGenerator positions an alphabetic baseline at the measured ascent.
      // Using a top baseline here applies that ascent twice and clips every line.
      padding: 4,
    },
  });
  base.anchor.set(anchor, 0);
  base.position.set(x, node.y);
  base.resolution = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const chunks = new Container({ label: `text-tiles:${node.id}` });
  chunks.visible = false;
  const measured = CanvasTextMetrics.measureText(base.text, base.style);
  const greek = createGreekText(node, base, measured);
  const visual = new Container();
  visual.addChild(base, greek, chunks);
  return {
    visual,
    state: {
      base,
      greek,
      chunks,
      items: [],
      chunkKey: null,
      measured,
    },
  };
}

function clearTextChunks(state: TextVisualState): void {
  for (const child of state.chunks.removeChildren()) child.destroy();
  state.items = [];
  state.chunkKey = null;
}

function buildTextChunks(state: TextVisualState, desiredResolution: number, textureLimit: number): void {
  const key = `${desiredResolution}:${textureLimit}`;
  if (state.chunkKey === key) return;
  clearTextChunks(state);
  const { base, measured } = state;
  const padding = base.style.padding;
  const baseLeft = base.x - base.anchor.x * measured.width;
  const initialResolution = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

  measured.lines.forEach((line, lineIndex) => {
    if (!line) return;
    const lineResolution = Math.max(1, Math.min(
      desiredResolution,
      Math.floor(textureLimit / Math.max(1, Math.ceil(measured.lineHeight + padding * 2))),
    ));
    const maxChunkWidth = Math.max(1, Math.floor(textureLimit / lineResolution - padding * 2));
    const alignOffset = base.style.align === 'center'
      ? (measured.maxLineWidth - measured.lineWidths[lineIndex]) / 2
      : base.style.align === 'right' ? measured.maxLineWidth - measured.lineWidths[lineIndex] : 0;
    const lineStart = baseLeft + alignOffset;
    const graphemes = CanvasTextMetrics.graphemeSegmenter(line);
    let start = 0;
    let current = '';

    const append = (text: string, startIndex: number) => {
      if (!text) return;
      const style = base.style.clone();
      style.align = 'left';
      const view = new Text({ text, style, resolution: initialResolution });
      view.anchor.set(0, 0);
      const prefix = line.slice(0, startIndex);
      const offset = prefix ? measurePixiText(prefix, base.style) : 0;
      view.position.set(lineStart + offset, base.y + lineIndex * measured.lineHeight);
      view.cullable = true;
      state.chunks.addChild(view);
      state.items.push({ view, resolution: lineResolution });
    };

    graphemes.forEach((grapheme, index) => {
      const candidate = current + grapheme;
      if (current && measurePixiText(candidate, base.style) > maxChunkWidth) {
        append(current, start);
        start = index;
        current = grapheme;
      } else current = candidate;
    });
    append(current, start);
  });
  state.chunkKey = key;
}

function createVectorVisual(node: Extract<EditorNode, { type: 'vector' }>): Container {
  const graphics = new Graphics();
  const fillPaint = paint(node.fill);
  const strokePaint = paint(node.stroke);
  if (fillPaint.alpha > 0) {
    // Pixi's SVG parser drops holes in nonzero paths. Build outer+hole groups
    // explicitly from the editable path instead of rasterizing the vector.
    for (const data of vectorFillPaths(node.path, node.fillRule)) {
      graphics.path(new GraphicsPath(data, true)).fill(fillPaint);
    }
  }
  if (strokePaint.alpha > 0 && node.strokeWidth > 0) {
    graphics.path(new GraphicsPath(node.path)).stroke({ ...strokePaint, width: node.strokeWidth });
  }
  graphics.position.set(node.x, node.y);
  graphics.scale.set(node.width / node.pathWidth, node.height / node.pathHeight);
  return graphics;
}

function bindImageTexture(
  view: NodeView,
  sprite: Sprite,
  src: string,
  bucket: number,
): void {
  view.image?.release();
  const lease = acquireImageTexture(src, bucket);
  view.image = { bucket, key: lease.key, release: lease.release };
  void lease.ready.then((loaded) => {
    if (view.image?.key !== lease.key) return;
    if (!loaded) {
      sprite.visible = false;
      view.invalidate();
      return;
    }
    sprite.texture = loaded.texture;
    if (view.source.type !== 'image') return;
    const current = view.source;
    const scaleX = current.width / loaded.width;
    const scaleY = current.height / loaded.height;
    if (current.objectFit === 'fill') {
      sprite.scale.set(scaleX, scaleY);
      sprite.position.set(current.x, current.y);
    } else {
      const scale = Math.max(scaleX, scaleY);
      sprite.scale.set(scale);
      sprite.position.set(
        current.x + (current.width - loaded.width * scale) / 2,
        current.y + (current.height - loaded.height * scale) / 2,
      );
    }
    view.invalidate();
  });
}

function createImageVisual(node: Extract<EditorNode, { type: 'image' }>, view: NodeView, zoom: number): Container {
  if (!node.src) {
    return new Graphics().rect(node.x, node.y, node.width, node.height)
      .fill('#e8e8e8').stroke({ color: '#c8c8c8', width: 1 });
  }
  const sprite = new Sprite(Texture.EMPTY);
  sprite.scale.set(node.width, node.height);
  sprite.position.set(node.x, node.y);
  bindImageTexture(view, sprite, node.src, imageBucketForSize(node.width, node.height, zoom, window.devicePixelRatio || 1));
  view.cleanup = () => {
    view.image?.release();
    view.image = null;
  };
  return sprite;
}

function needsMask(node: EditorNode): boolean {
  return (node.type === 'frame' && node.clip) || node.type === 'image' || (node.type === 'text' && node.autoSize === 'none');
}

function createMask(node: EditorNode): Graphics {
  const graphics = new Graphics();
  if ('cornerRadius' in node) roundedRect(graphics, node).fill(0xffffff);
  else graphics.rect(node.x, node.y, node.width, node.height).fill(0xffffff);
  return graphics;
}

function createView(node: EditorNode, invalidate: () => void, viewport: Viewport): NodeView {
  const container = new Container({ label: node.id });
  container.cullable = true;
  const view: NodeView = { source: node, container, visual: null, text: null, mask: null, image: null, cleanup: null, invalidate };
  updateView(view, node, { forceRebuild: true, viewport });
  return view;
}

function isPureTranslation(previous: EditorNode, next: EditorNode): boolean {
  if (previous.type !== next.type) return false;
  for (const key in previous) {
    if (key === 'x' || key === 'y') continue;
    if (!Object.is(
      previous[key as keyof EditorNode],
      next[key as keyof EditorNode],
    )) return false;
  }
  for (const key in next) {
    if (key !== 'x' && key !== 'y' && !(key in previous)) return false;
  }
  return true;
}

function updateView(
  view: NodeView,
  node: EditorNode,
  { forceRebuild = false, viewport }: { forceRebuild?: boolean; viewport?: Viewport } = {},
): void {
  if (!forceRebuild && isPureTranslation(view.source, node)) {
    const dx = node.x - view.source.x;
    const dy = node.y - view.source.y;
    view.source = node;
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    view.container.position.set(centerX, centerY);
    view.container.pivot.set(centerX, centerY);
    // Every node stores absolute page geometry. Move its retained visuals too,
    // keeping every container transform normalized so nested deltas apply once.
    if (view.visual) view.visual.position.set(view.visual.position.x + dx, view.visual.position.y + dy);
    if (view.mask) view.mask.position.set(view.mask.position.x + dx, view.mask.position.y + dy);
    return;
  }
  view.cleanup?.();
  view.cleanup = null;
  if (view.visual) {
    // Pixi shares managed text textures between equal text/style pairs.
    view.visual.destroy({ children: true });
    view.visual = null;
  }
  if (view.mask) {
    view.container.mask = null;
    view.mask.destroy();
    view.mask = null;
  }
  view.source = node;
  view.text = null;
  const { container } = view;
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  container.position.set(centerX, centerY);
  container.pivot.set(centerX, centerY);
  container.rotation = node.rotation * Math.PI / 180;
  container.scale.set(node.flipX ? -1 : 1, node.flipY ? -1 : 1);
  container.alpha = node.opacity;
  container.label = node.id;

  if (node.type === 'text') {
    const { visual, state } = createTextVisual(node);
    view.visual = visual;
    view.text = state;
  } else if (node.type === 'vector') view.visual = createVectorVisual(node);
  else if (node.type === 'image') view.visual = createImageVisual(node, view, viewport?.zoom ?? 1);
  else view.visual = createShapeVisual(node);
  container.addChildAt(view.visual, 0);

  if (needsMask(node)) {
    view.mask = createMask(node);
    container.addChildAt(view.mask, 1);
    container.mask = view.mask;
  }
}

const textureLimits = new WeakMap<HTMLCanvasElement, number>();

function textTextureLimit(canvas: HTMLCanvasElement | null): number {
  if (!canvas) return 8192;
  const cached = textureLimits.get(canvas);
  if (cached) return cached;
  const gl = canvas.getContext('webgl2');
  const reported = gl ? Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 8192;
  const limit = Math.max(1024, Math.min(8192, reported || 8192));
  textureLimits.set(canvas, limit);
  return limit;
}

export function PixiScene({ doc, change, viewport, editingId, panning, movingIds, moveDelta, suppressedIds, onFallback }: PixiSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragCanvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const dragAppRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const dragWorldRef = useRef<Container | null>(null);
  const previewRef = useRef<{
    signature: string;
    ids: Set<string>;
    starts: Map<string, { x: number; y: number }>;
  } | null>(null);
  const viewsRef = useRef(new Map<string, NodeView>());
  const pageScenesRef = useRef(new Map<string, PageScene>());
  const sceneDocumentIdRef = useRef<string | null>(null);
  const renderedViewportRef = useRef(viewport);
  const latestViewportRef = useRef(viewport);
  latestViewportRef.current = viewport;
  const zoomTimerRef = useRef(0);
  const renderFrameRef = useRef(0);
  const [ready, setReady] = useState(false);
  const movingSignature = movingIds.join('|');
  const fontSignature = useMemo(() => [...new Set(doc.nodes.flatMap((node) => node.type === 'text'
    ? [`${node.fontWeight} ${node.fontSize}px ${fontFamilyWithFallback(node.fontFamily)}`]
    : []))].sort().join('|'), [doc.nodes]);
  const [loadedFontSignature, setLoadedFontSignature] = useState<string | null>(null);

  const renderNow = (
    app: Application,
    world: Container,
    nextViewport: Viewport,
    targetCanvas: HTMLCanvasElement | null = canvasRef.current,
    previewLod = false,
  ) => {
    window.clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = 0;
    const canvas = targetCanvas;
    if (canvas) {
      canvas.style.transform = '';
      delete canvas.dataset.zoomPreview;
    }
    world.position.set(nextViewport.x, nextViewport.y);
    world.scale.set(nextViewport.zoom);
    const textResolution = textResolutionForZoom(nextViewport.zoom, window.devicePixelRatio || 1);
    const screenWidth = canvas?.clientWidth ?? app.screen.width;
    const screenHeight = canvas?.clientHeight ?? app.screen.height;
    const textureLimit = textTextureLimit(canvas);
    const overscan = previewOverscan(screenWidth, screenHeight);
    let rasterizedTextCount = 0;
    let chunkedTextCount = 0;
    let culledTextCount = 0;
    let lodTextCount = 0;
    for (const view of viewsRef.current.values()) {
      if (view.source.type === 'image' && view.image && view.visual instanceof Sprite) {
        const bucket = imageBucketForSize(view.source.width, view.source.height, nextViewport.zoom, window.devicePixelRatio || 1);
        if (bucket !== view.image.bucket) bindImageTexture(view, view.visual, view.source.src, bucket);
      }
      if (!view.text) continue;
      // A conservative screen-space circle includes every rotation. Offscreen
      // text keeps its old texture until it actually enters the viewport.
      const source = view.source;
      const centerX = (source.x + source.width / 2) * nextViewport.zoom + nextViewport.x;
      const centerY = (source.y + source.height / 2) * nextViewport.zoom + nextViewport.y;
      const radius = Math.hypot(source.width, source.height) * nextViewport.zoom / 2 + overscan;
      if (centerX + radius < 0 || centerX - radius > screenWidth || centerY + radius < 0 || centerY - radius > screenHeight) {
        culledTextCount += 1;
        continue;
      }
      let current: Container | null = view.container;
      let displayed = true;
      while (current) {
        if (!current.visible) { displayed = false; break; }
        if (current === world) break;
        current = current.parent;
      }
      if (!displayed) continue;

      const state = view.text;
      if (previewLod && nextViewport.zoom <= 0.5) {
        // LOD is limited to the transient drag preview. The next full render
        // restores editable high-resolution text and never touches export.
        state.greek.visible = true;
        state.base.visible = false;
        state.chunks.visible = false;
        lodTextCount += 1;
        continue;
      }
      state.greek.visible = false;
      const padding = state.base.style.padding * 2;
      const fullWidth = Math.ceil(state.measured.width + padding);
      const fullHeight = Math.ceil(state.measured.height + padding);
      const needsChunks = fullWidth * textResolution > textureLimit || fullHeight * textResolution > textureLimit;
      if (!needsChunks) {
        state.base.visible = true;
        state.chunks.visible = false;
        if (state.base.resolution !== textResolution) {
          state.base.resolution = textResolution;
          rasterizedTextCount += 1;
        }
        continue;
      }

      // A single high-resolution texture for a long text node can exceed the
      // GPU limit. Tile the editable text into retained line fragments instead
      // of stretching an artificially capped 8x texture over the whole zoom.
      buildTextChunks(state, textResolution, textureLimit);
      state.base.visible = false;
      state.chunks.visible = true;
      chunkedTextCount += 1;
      for (const item of state.items) {
        if (item.view.resolution === item.resolution) continue;
        const bounds = item.view.getBounds();
        if (bounds.maxX < 0 || bounds.minX > screenWidth || bounds.maxY < 0 || bounds.minY > screenHeight) continue;
        item.view.resolution = item.resolution;
        rasterizedTextCount += 1;
      }
    }
    if (canvas) {
      canvas.dataset.textResolution = String(textResolution);
      canvas.dataset.rasterizedText = String(rasterizedTextCount);
      canvas.dataset.chunkedText = String(chunkedTextCount);
      canvas.dataset.culledText = String(culledTextCount);
      canvas.dataset.lodText = String(lodTextCount);
      const imageStats = imageTextureCacheStats();
      canvas.dataset.imageCacheEntries = String(imageStats.entries);
      canvas.dataset.imageCacheBytes = String(imageStats.bytes);
      canvas.dataset.imageBuckets = [...new Set([...viewsRef.current.values()]
        .filter((view) => view.image).map((view) => view.image!.bucket))].join(',');
    }
    renderedViewportRef.current = nextViewport;
    const started = performance.now();
    app.render();
    if (canvas) canvas.dataset.renderMs = String(Math.round(performance.now() - started));
  };

  const scheduleRender = () => {
    if (renderFrameRef.current) return;
    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = 0;
      const currentApp = appRef.current;
      const currentWorld = worldRef.current;
      if (currentApp && currentWorld && !previewRef.current) {
        renderNow(currentApp, currentWorld, latestViewportRef.current);
      }
    });
  };

  useEffect(() => {
    let cancelled = false;
    const loads = fontSignature ? fontSignature.split('|').map((font) =>
      document.fonts.load(font, 'Malewich Подтверждение 0123').catch(() => []),
    ) : [];
    void Promise.all(loads).then(() => {
      if (!cancelled) {
        invalidateTextLayoutCaches();
        setLoadedFontSignature(fontSignature);
      }
    });
    return () => { cancelled = true; };
  }, [fontSignature]);

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    const dragApp = new Application();
    const options = {
      resizeTo: canvasRef.current!.parentElement!,
      preference: 'webgl' as const,
      powerPreference: 'high-performance' as const,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoStart: false,
      sharedTicker: false,
    };
    void (async () => {
      await app.init({ ...options, canvas: canvasRef.current! });
      await dragApp.init({ ...options, canvas: dragCanvasRef.current! });
      if (cancelled) {
        app.destroy(false, { children: true, context: true });
        dragApp.destroy(false, { children: true, context: true });
        return;
      }
      const world = new Container({ label: 'document' });
      const dragWorld = new Container({ label: 'move-preview' });
      app.stage.addChild(world);
      dragApp.stage.addChild(dragWorld);
      appRef.current = app;
      dragAppRef.current = dragApp;
      worldRef.current = world;
      dragWorldRef.current = dragWorld;
      setReady(true);
    })().catch(() => {
      if (!cancelled) onFallback();
    });
    return () => {
      cancelled = true;
      previewRef.current = null;
      viewsRef.current.clear();
      pageScenesRef.current.clear();
      sceneDocumentIdRef.current = null;
      worldRef.current = null;
      dragWorldRef.current = null;
      appRef.current = null;
      dragAppRef.current = null;
      if (app.renderer) app.destroy(false, { children: true, texture: true, context: true });
      if (dragApp.renderer) dragApp.destroy(false, { children: true, texture: true, context: true });
    };
  }, [onFallback]);

  useEffect(() => {
    const parent = canvasRef.current?.parentElement;
    if (!ready || !parent) return;
    const observer = new ResizeObserver(() => {
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      const app = appRef.current;
      const dragApp = dragAppRef.current;
      // Pixi's ResizePlugin observes window.resize only. Flex/layout changes
      // require explicitly resizing both drawing buffers to their container.
      if (app && (app.screen.width !== width || app.screen.height !== height)) app.renderer.resize(width, height);
      if (dragApp && (dragApp.screen.width !== width || dragApp.screen.height !== height)) dragApp.renderer.resize(width, height);
      if (previewRef.current && app && dragApp && worldRef.current && dragWorldRef.current) {
        const dragCanvas = dragCanvasRef.current;
        const transform = dragCanvas?.style.transform ?? '';
        renderNow(app, worldRef.current, latestViewportRef.current, canvasRef.current, true);
        renderNow(dragApp, dragWorldRef.current, latestViewportRef.current, dragCanvas, true);
        if (dragCanvas) dragCanvas.style.transform = transform;
      } else {
        // Resizing clears WebGL. Coalesce it with other async invalidations.
        scheduleRender();
      }
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    const app = appRef.current;
    const dragApp = dragAppRef.current;
    let world = worldRef.current;
    const dragWorld = dragWorldRef.current;
    const dragCanvas = dragCanvasRef.current;
    if (!ready || !app || !dragApp || !world || !dragWorld || !dragCanvas || loadedFontSignature !== fontSignature) return;
    if (sceneDocumentIdRef.current !== null && sceneDocumentIdRef.current !== doc.id) {
      for (const cached of pageScenesRef.current.values()) {
        for (const view of cached.views.values()) view.cleanup?.();
        cached.world.destroy({ children: true });
      }
      pageScenesRef.current.clear();
      world = new Container({ label: 'document' });
      app.stage.addChild(world);
      worldRef.current = world;
      viewsRef.current = new Map();
    }
    sceneDocumentIdRef.current = doc.id;
    const pageId = getActivePageId(doc);
    const pageScenes = pageScenesRef.current;
    let pageScene = pageScenes.get(pageId);
    const structureChanged = change.full || change.structureChanged || !pageScene;
    if (!pageScene) {
      // Keep each visited page as a retained scene. Returning to a page must not
      // recreate thousands of Graphics and text textures; no bitmap root cache
      // or continuous renderer is involved.
      const cachedWorld = pageScenes.size === 0 ? world : new Container({ label: `page:${pageId}` });
      if (!cachedWorld.parent) app.stage.addChild(cachedWorld);
      pageScene = { world: cachedWorld, views: pageScenes.size === 0 ? viewsRef.current : new Map() };
      pageScenes.set(pageId, pageScene);
    }
    for (const cached of pageScenes.values()) cached.world.visible = cached === pageScene;
    worldRef.current = pageScene.world;
    world = pageScene.world;
    viewsRef.current = pageScene.views;
    const views = pageScene.views;
    const previewIds = movingSignature ? movingSignature.split('|') : [];
    const previousPreview = previewRef.current;
    let preview = previousPreview?.signature === movingSignature ? previousPreview : null;
    const startingPreview = previewIds.length > 0 && !preview;
    if (previewIds.length > 0 && !preview) {
      preview = { signature: movingSignature, ids: new Set(previewIds), starts: new Map() };
      previewRef.current = preview;
    } else if (previewIds.length === 0 && previousPreview) {
      previewRef.current = null;
      dragCanvas.style.visibility = 'hidden';
      dragCanvas.style.transform = '';
    }

    const siblingIndexes = new Map<string, number>();
    if (structureChanged) {
      const nextIds = new Set(doc.nodes.map((node) => node.id));
      const siblingCounts = new Map<string | null, number>();
      for (const node of doc.nodes) {
        const index = siblingCounts.get(node.parentId) ?? 0;
        siblingIndexes.set(node.id, index);
        siblingCounts.set(node.parentId, index + 1);
      }
      for (const [id, view] of views) {
        if (!nextIds.has(id)) {
          view.cleanup?.();
          view.container.destroy({ children: true });
          views.delete(id);
        }
      }
    } else {
      for (const id of change.deletedIds) {
        const view = views.get(id);
        if (!view) continue;
        view.cleanup?.();
        view.container.destroy({ children: true });
        views.delete(id);
      }
    }
    if (startingPreview && preview) {
      for (const id of preview.ids) {
        const view = views.get(id);
        if (!view) continue;
        preview.starts.set(id, view.container.getGlobalPosition());
        dragWorld.addChild(view.container);
      }
      for (const [id, view] of views) {
        view.container.visible = view.source.visible && !view.source.isMask && !suppressedIds.has(id) && !(editingId === id && view.source.type === 'text');
      }
      dragCanvas.style.visibility = 'visible';
      dragCanvas.style.transform = '';
      renderNow(app, world, viewport, canvasRef.current, true);
      renderNow(dragApp, dragWorld, viewport, dragCanvas, true);
    }

    const invalidate = () => {
      if (appRef.current === app && !previewRef.current) scheduleRender();
    };
    for (const node of doc.nodes) {
      let view = views.get(node.id);
      if (!view) {
        view = createView(node, invalidate, viewport);
        views.set(node.id, view);
      } else if (view.source !== node && (structureChanged || change.changedIds.has(node.id))) {
        updateView(view, node, { viewport });
      }
      const parent = preview?.ids.has(node.id)
        ? dragWorld
        : node.parentId ? views.get(node.parentId)?.container : world;
      if (parent && view.container.parent !== parent) {
        parent.addChild(view.container);
      }
    }
    for (const node of preview || !structureChanged ? [] : doc.nodes) {
      const view = views.get(node.id);
      const parentView = node.parentId ? views.get(node.parentId) : undefined;
      const parent = parentView?.container ?? world;
      if (!view || view.container.parent !== parent) continue;
      const ownVisuals = (parentView?.visual ? 1 : 0) + (parentView?.mask ? 1 : 0);
      const targetIndex = ownVisuals + (siblingIndexes.get(node.id) ?? 0);
      if (parent.getChildIndex(view.container) !== targetIndex) {
        parent.setChildIndex(view.container, targetIndex);
      }
    }
    for (const [id, view] of views) {
      view.container.visible = view.source.visible && !view.source.isMask && !suppressedIds.has(id) && !(editingId === id && view.source.type === 'text');
    }
    if (preview) {
      const id = previewIds.find((candidate) => preview.starts.has(candidate) && views.has(candidate));
      const start = id ? preview.starts.get(id) : undefined;
      const current = id ? views.get(id)?.container.getGlobalPosition() : undefined;
      if (start && current) {
        const x = moveDelta ? moveDelta.x * viewport.zoom : current.x - start.x;
        const y = moveDelta ? moveDelta.y * viewport.zoom : current.y - start.y;
        dragCanvas.style.transform = `translate3d(${x}px, ${y}px, 0px)`;
      }
      return;
    }
    renderNow(app, world, viewport);
    if (canvasRef.current) canvasRef.current.dataset.scenePage = pageId;
  }, [doc, change, fontSignature, loadedFontSignature, movingSignature, ready]);

  useEffect(() => {
    const dragCanvas = dragCanvasRef.current;
    if (!moveDelta || !previewRef.current || !dragCanvas) return;
    // Deferred root moves update only the compositor, not the document scene.
    dragCanvas.style.transform = `translate3d(${moveDelta.x * viewport.zoom}px, ${moveDelta.y * viewport.zoom}px, 0px)`;
  }, [moveDelta, viewport.zoom]);

  useEffect(() => {
    const app = appRef.current;
    const world = worldRef.current;
    if (!ready || !app || !world || loadedFontSignature !== fontSignature || previewRef.current) return;
    const rendered = renderedViewportRef.current;
    window.clearTimeout(zoomTimerRef.current);
    const canvas = canvasRef.current;
    if (panning) {
      if (canvas) {
        canvas.style.transform = `translate3d(${viewport.x - rendered.x}px, ${viewport.y - rendered.y}px, 0px)`;
      }
      return;
    }
    if (rendered.x === viewport.x && rendered.y === viewport.y && rendered.zoom === viewport.zoom) return;
    if (canvas) {
      // Keep wheel/pinch zoom on the compositor. Rebuilding every text texture
      // and drawing the full WebGL scene per wheel event made Retina zoom lag.
      const scale = viewport.zoom / rendered.zoom;
      const x = viewport.x - rendered.x * scale;
      const y = viewport.y - rendered.y * scale;
      canvas.style.transform = `translate3d(${x}px, ${y}px, 0px) scale(${scale})`;
      canvas.dataset.zoomPreview = 'true';
    }
    zoomTimerRef.current = window.setTimeout(() => {
      const currentApp = appRef.current;
      const currentWorld = worldRef.current;
      if (currentApp && currentWorld && !previewRef.current) {
        renderNow(currentApp, currentWorld, latestViewportRef.current);
      }
    }, 90);
    return () => window.clearTimeout(zoomTimerRef.current);
  }, [fontSignature, loadedFontSignature, panning, ready, viewport]);

  useEffect(() => () => {
    window.clearTimeout(zoomTimerRef.current);
    cancelAnimationFrame(renderFrameRef.current);
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!ready || !app) return;
    for (const [id, view] of viewsRef.current) {
      view.container.visible = view.source.visible && !view.source.isMask && !suppressedIds.has(id) && !(editingId === id && view.source.type === 'text');
    }
    if (!previewRef.current) scheduleRender();
  }, [editingId, ready]);

  return (
    <>
      <canvas ref={canvasRef} className="pixi-scene" data-renderer={ready ? 'webgl' : 'pending'} aria-hidden="true" />
      <canvas ref={dragCanvasRef} className="pixi-drag-scene" style={{ visibility: 'hidden' }} aria-hidden="true" />
    </>
  );
}
