import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { DesignDocument, EditorNode, TextNode, Viewport } from '../types';
import { getTextLines } from '../utils/text';

interface PixiSceneProps {
  doc: DesignDocument;
  viewport: Viewport;
  editingId: string | null;
  panning: boolean;
  movingIds: string[];
  suppressedIds: Set<string>;
  onFallback: () => void;
}

interface NodeView {
  source: EditorNode;
  container: Container;
  visual: Container | null;
  mask: Graphics | null;
  cleanup: (() => void) | null;
  invalidate: () => void;
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

function createTextVisual(node: TextNode): Text {
  const anchor = node.textAlign === 'center' ? 0.5 : node.textAlign === 'right' ? 1 : 0;
  const x = node.textAlign === 'center'
    ? node.x + node.width / 2
    : node.textAlign === 'right' ? node.x + node.width : node.x;
  const text = new Text({
    text: getTextLines(node).join('\n'),
    style: {
      fill: paint(node.fill).color,
      fontFamily: node.fontFamily,
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
  text.anchor.set(anchor, 0);
  text.position.set(x, node.y);
  text.resolution = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  return text;
}

function createVectorVisual(node: Extract<EditorNode, { type: 'vector' }>): Container {
  // Keep paint attributes on the SVG path itself. Calling fill()/stroke() after
  // Graphics.svg() adds another path style and leaves the parser's default
  // black fill in place for transparent vectors.
  const graphics = new Graphics().svg(
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${node.path}" fill="${node.fill}" fill-rule="${node.fillRule ?? 'nonzero'}" stroke="${node.stroke}" stroke-width="${node.strokeWidth}"/></svg>`,
  );
  graphics.position.set(node.x, node.y);
  graphics.scale.set(node.width / node.pathWidth, node.height / node.pathHeight);
  return graphics;
}

function createImageVisual(node: Extract<EditorNode, { type: 'image' }>, view: NodeView): Container {
  if (!node.src) {
    return new Graphics().rect(node.x, node.y, node.width, node.height)
      .fill('#e8e8e8').stroke({ color: '#c8c8c8', width: 1 });
  }
  const image = new Image();
  const sprite = new Sprite(Texture.EMPTY);
  sprite.scale.set(node.width, node.height);
  sprite.position.set(node.x, node.y);
  let texture: Texture | null = null;
  const resize = () => {
    if (!texture || view.source.type !== 'image') return;
    const current = view.source;
    const width = Math.max(1, texture.width);
    const height = Math.max(1, texture.height);
    const scale = Math.max(current.width / width, current.height / height);
    sprite.scale.set(scale);
    sprite.position.set(current.x + (current.width - width * scale) / 2, current.y + (current.height - height * scale) / 2);
  };
  image.onload = () => {
    // Texture.from(string) only reads Pixi's Assets cache. Passing the loaded
    // HTMLImageElement creates a real texture without a separate Assets call.
    texture = Texture.from(image);
    sprite.texture = texture;
    resize();
    view.invalidate();
  };
  image.onerror = () => { sprite.visible = false; };
  image.src = node.src;
  view.cleanup = () => {
    image.onload = null;
    image.onerror = null;
    texture?.destroy(true);
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

function createView(node: EditorNode, invalidate: () => void): NodeView {
  const container = new Container({ label: node.id });
  container.cullable = true;
  const view: NodeView = { source: node, container, visual: null, mask: null, cleanup: null, invalidate };
  updateView(view, node, { forceRebuild: true });
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
  { forceRebuild = false }: { forceRebuild?: boolean } = {},
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
  const { container } = view;
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  container.position.set(centerX, centerY);
  container.pivot.set(centerX, centerY);
  container.rotation = node.rotation * Math.PI / 180;
  container.alpha = node.opacity;
  container.label = node.id;

  if (node.type === 'text') view.visual = createTextVisual(node);
  else if (node.type === 'vector') view.visual = createVectorVisual(node);
  else if (node.type === 'image') view.visual = createImageVisual(node, view);
  else view.visual = createShapeVisual(node);
  container.addChildAt(view.visual, 0);

  if (needsMask(node)) {
    view.mask = createMask(node);
    container.addChildAt(view.mask, 1);
    container.mask = view.mask;
  }
}

export function PixiScene({ doc, viewport, editingId, panning, movingIds, suppressedIds, onFallback }: PixiSceneProps) {
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
  const renderedViewportRef = useRef(viewport);
  const [ready, setReady] = useState(false);
  const movingSignature = movingIds.join('|');
  const fontSignature = [...new Set(doc.nodes.flatMap((node) => node.type === 'text'
    ? [`${node.fontWeight} ${node.fontSize}px ${node.fontFamily}`]
    : []))].sort().join('|');
  const [loadedFontSignature, setLoadedFontSignature] = useState<string | null>(null);

  const renderNow = (
    app: Application,
    world: Container,
    nextViewport: Viewport,
    targetCanvas: HTMLCanvasElement | null = canvasRef.current,
  ) => {
    const canvas = targetCanvas;
    if (canvas) canvas.style.transform = '';
    world.position.set(nextViewport.x, nextViewport.y);
    world.scale.set(nextViewport.zoom);
    renderedViewportRef.current = nextViewport;
    const started = performance.now();
    app.render();
    if (canvas) canvas.dataset.renderMs = String(Math.round(performance.now() - started));
  };

  useEffect(() => {
    let cancelled = false;
    const loads = fontSignature ? fontSignature.split('|').map((font) =>
      document.fonts.load(font, 'Malewich Подтверждение 0123').catch(() => []),
    ) : [];
    void Promise.all(loads).then(() => {
      if (!cancelled) setLoadedFontSignature(fontSignature);
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
      worldRef.current = null;
      dragWorldRef.current = null;
      appRef.current = null;
      dragAppRef.current = null;
      if (app.renderer) app.destroy(false, { children: true, texture: true, context: true });
      if (dragApp.renderer) dragApp.destroy(false, { children: true, texture: true, context: true });
    };
  }, [onFallback]);

  useEffect(() => {
    const app = appRef.current;
    const dragApp = dragAppRef.current;
    const world = worldRef.current;
    const dragWorld = dragWorldRef.current;
    const dragCanvas = dragCanvasRef.current;
    if (!ready || !app || !dragApp || !world || !dragWorld || !dragCanvas || loadedFontSignature !== fontSignature) return;
    const views = viewsRef.current;
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

    const nextIds = new Set(doc.nodes.map((node) => node.id));
    const siblingIndexes = new Map<string, number>();
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
    if (startingPreview && preview) {
      for (const id of preview.ids) {
        const view = views.get(id);
        if (!view) continue;
        preview.starts.set(id, view.container.getGlobalPosition());
        dragWorld.addChild(view.container);
      }
      for (const [id, view] of views) {
        view.container.visible = view.source.visible && !suppressedIds.has(id) && !(editingId === id && view.source.type === 'text');
      }
      dragCanvas.style.visibility = 'visible';
      dragCanvas.style.transform = '';
      renderNow(app, world, viewport);
      renderNow(dragApp, dragWorld, viewport, dragCanvas);
    }

    const invalidate = () => {
      if (appRef.current === app && !previewRef.current) app.render();
    };
    for (const node of doc.nodes) {
      let view = views.get(node.id);
      if (!view) {
        view = createView(node, invalidate);
        views.set(node.id, view);
      } else if (view.source !== node) {
        updateView(view, node);
      }
      const parent = preview?.ids.has(node.id)
        ? dragWorld
        : node.parentId ? views.get(node.parentId)?.container : world;
      if (parent && view.container.parent !== parent) {
        parent.addChild(view.container);
      }
    }
    for (const node of preview ? [] : doc.nodes) {
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
      view.container.visible = view.source.visible && !suppressedIds.has(id) && !(editingId === id && view.source.type === 'text');
    }
    if (preview) {
      const id = previewIds.find((candidate) => preview.starts.has(candidate) && views.has(candidate));
      const start = id ? preview.starts.get(id) : undefined;
      const current = id ? views.get(id)?.container.getGlobalPosition() : undefined;
      if (start && current) {
        dragCanvas.style.transform = `translate3d(${current.x - start.x}px, ${current.y - start.y}px, 0px)`;
      }
      return;
    }
    renderNow(app, world, viewport);
  }, [doc, fontSignature, loadedFontSignature, movingSignature, ready]);

  useEffect(() => {
    const app = appRef.current;
    const world = worldRef.current;
    if (!ready || !app || !world || loadedFontSignature !== fontSignature || previewRef.current) return;
    if (panning) {
      const canvas = canvasRef.current;
      const rendered = renderedViewportRef.current;
      if (canvas) {
        canvas.style.transform = `translate3d(${viewport.x - rendered.x}px, ${viewport.y - rendered.y}px, 0px)`;
      }
      return;
    }
    renderNow(app, world, viewport);
  }, [fontSignature, loadedFontSignature, panning, ready, viewport]);

  useEffect(() => {
    const app = appRef.current;
    if (!ready || !app) return;
    for (const [id, view] of viewsRef.current) {
      view.container.visible = view.source.visible && !suppressedIds.has(id) && !(editingId === id && view.source.type === 'text');
    }
    if (!previewRef.current) app.render();
  }, [editingId, ready, suppressedIds]);

  return (
    <>
      <canvas ref={canvasRef} className="pixi-scene" data-renderer={ready ? 'webgl' : 'pending'} aria-hidden="true" />
      <canvas ref={dragCanvasRef} className="pixi-drag-scene" style={{ visibility: 'hidden' }} aria-hidden="true" />
    </>
  );
}
