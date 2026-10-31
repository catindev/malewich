import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type DragEvent as ReactDragEvent,
  type CSSProperties,
} from 'react';
import { Check, Frame, Hand, MousePointer2, Plus } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import type {
  Bounds,
  DesignDocument,
  EditorNode,
  LinearNode,
  NodeType,
  Point,
  TextNode,
  Viewport,
} from '../types';
import {
  createNode,
  findFrameAtPoint,
  flattenDocument,
  getChildren,
  getDescendantIds,
  getNode,
  getNodeBounds,
  getParentWorldMatrix,
  getWorldMatrix,
  getWorldRotation,
  isDescendant,
  isNodeLocked,
  pointInParentCoordinates,
  uniqueNodeName,
} from '../utils/document';
import {
  applyMatrix,
  clamp,
  invertMatrix,
  matrixToString,
  nodeMatrix,
  normalizeRect,
  round,
} from '../utils/geometry';
import { resizeSelection, rotateSelection } from '../utils/groupTransform';
import { getSelectionTarget } from '../utils/selection';
import { snapMovingBounds, snapResizingBounds, type SnapGuide } from '../utils/snapping';
import { measureAutoText } from '../utils/text';
import { hitTestNode } from '../utils/hitTest';
import { CanvasContextMenu } from './CanvasContextMenu';
import { HitLayer } from './HitLayer';
import { PixiScene } from './PixiScene';
import { SceneNode } from './SceneNode';
import { SelectionOverlay, type LineEndpoint, type ResizeHandle } from './SelectionOverlay';
import { constrainedEndpoint, linearEndpoints, linearNodePatch } from '../utils/shapes';
import { TextEditor } from './TextEditor';
import { usePageDocument } from '../hooks/usePageDocument';
import { getActivePageId, getDocumentPages, getPageDocument } from '../utils/pages';
import { fitViewportToContent, fitViewportToSelection, zoomViewportAt } from '../utils/viewport';

type Interaction =
  | { kind: 'pan'; pointerId: number; startClient: Point; startViewport: Viewport }
  | { kind: 'marquee'; pointerId: number; startWorld: Point; additive: boolean; baseSelection: string[] }
  | { kind: 'draw'; pointerId: number; nodeId: string; parentId: string | null; startLocal: Point; startDoc: DesignDocument }
  | { kind: 'move'; pointerId: number; startWorld: Point; startDoc: DesignDocument; ids: string[]; rootIds: string[]; targetId: string; additive: boolean; moved: boolean; snapBounds: Bounds[]; deferDocument: boolean; lastDelta: Point }
  | { kind: 'resize'; pointerId: number; startWorld: Point; startDoc: DesignDocument; node: EditorNode; handle: ResizeHandle }
  | { kind: 'rotate'; pointerId: number; startDoc: DesignDocument; node: EditorNode; center: Point; startAngle: number }
  | { kind: 'lineEndpoint'; pointerId: number; startDoc: DesignDocument; node: LinearNode; endpoint: LineEndpoint }
  | { kind: 'groupResize'; pointerId: number; startWorld: Point; startDoc: DesignDocument; ids: string[]; startBounds: Bounds; handle: ResizeHandle }
  | { kind: 'groupRotate'; pointerId: number; startDoc: DesignDocument; ids: string[]; center: Point; startAngle: number };

const drawingTools: NodeType[] = ['frame', 'rectangle', 'ellipse', 'line', 'arrow', 'polygon', 'star'];

function transformVector(matrix: { a: number; b: number; c: number; d: number }, vector: Point): Point {
  return {
    x: matrix.a * vector.x + matrix.c * vector.y,
    y: matrix.b * vector.x + matrix.d * vector.y,
  };
}

function translatedDocumentNodes(startDoc: DesignDocument, rootIds: string[], delta: Point): EditorNode[] {
  let nodes = startDoc.nodes;
  rootIds.forEach((id) => {
    const node = getNode(startDoc, id);
    if (!node) return;
    const inverseParent = invertMatrix(getParentWorldMatrix(startDoc, node));
    const localDelta = transformVector(inverseParent, delta);
    const treeIds = new Set([id, ...getDescendantIds(startDoc, id)]);
    nodes = nodes.map((candidate) => treeIds.has(candidate.id) ? {
      ...candidate, x: round(candidate.x + localDelta.x), y: round(candidate.y + localDelta.y),
    } : candidate);
  });
  return nodes;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

export function EditorCanvas() {
  const doc = usePageDocument();
  const change = useEditorStore((state) => state.change);
  const selection = useEditorStore((state) => state.selection);
  const tool = useEditorStore((state) => state.tool);
  const viewport = useEditorStore((state) => state.viewport);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setSelection = useEditorStore((state) => state.setSelection);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const pendingImagePoint = useRef<Point>({ x: 0, y: 0 });
  const editSnapshotRef = useRef<DesignDocument | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectAllOnEdit, setSelectAllOnEdit] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [activeMoveIds, setActiveMoveIds] = useState<string[]>([]);
  const [deferredMoveDelta, setDeferredMoveDelta] = useState<Point | null>(null);
  const [panning, setPanning] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; world: Point } | null>(null);
  const [webglFailed, setWebglFailed] = useState(() => new URLSearchParams(window.location.search).get('renderer') === 'svg');
  const handleRendererFallback = useCallback(() => setWebglFailed(true), []);
  const showHitLayer = useMemo(() => new URLSearchParams(window.location.search).has('hitLayer'), []);

  const screenToWorld = useCallback((clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    const currentViewport = useEditorStore.getState().viewport;
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left - currentViewport.x) / currentViewport.zoom,
      y: (clientY - rect.top - currentViewport.y) / currentViewport.zoom,
    };
  }, []);

  const fitToContent = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setViewport(fitViewportToContent(useEditorStore.getState().doc, rect));
  }, [setViewport]);

  const fitSelection = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const state = useEditorStore.getState();
    setViewport(fitViewportToSelection(state.doc, state.selection, rect));
  }, [setViewport]);

  const zoomTo = useCallback((nextZoom: number, clientPoint?: Point) => {
    const current = useEditorStore.getState().viewport;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPoint = clientPoint ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setViewport(zoomViewportAt(current, nextZoom, {
      x: screenPoint.x - rect.left,
      y: screenPoint.y - rect.top,
    }));
  }, [setViewport]);

  const activePageId = getActivePageId(doc);
  const activePage = getDocumentPages(doc).find((page) => page.id === activePageId);
  const previousPageIdRef = useRef(activePageId);
  const [isPageSwitching, setIsPageSwitching] = useState(false);

  useEffect(() => {
    if (previousPageIdRef.current === activePageId) return;
    previousPageIdRef.current = activePageId;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Start only after the destination commit. A timeline started before a
    // heavy WebGL build can finish before the browser presents its first frame.
    setIsPageSwitching(true);
  }, [activePageId]);

  useEffect(() => {
    if (!isPageSwitching) return;
    let timeout = 0;
    // Let the blurred commit reach a real frame before starting the exit timer.
    const frame = requestAnimationFrame(() => {
      timeout = window.setTimeout(() => setIsPageSwitching(false), 120);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [isPageSwitching]);

  useLayoutEffect(() => {
    // Fit before the renderer's passive effects. A newly loaded document can
    // reuse the same activePageId, so page identity alone is not sufficient.
    fitToContent();
  }, [doc.id, activePageId, fitToContent]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const state = useEditorStore.getState();
      if (event.ctrlKey || event.metaKey) {
        zoomTo(state.viewport.zoom * Math.exp(-event.deltaY * 0.01), { x: event.clientX, y: event.clientY });
      } else {
        const horizontalDelta = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
        const verticalDelta = event.shiftKey && event.deltaX === 0 ? 0 : event.deltaY;
        setViewport({
          ...state.viewport,
          x: state.viewport.x - horizontalDelta,
          y: state.viewport.y - verticalDelta,
        });
      }
    };
    const preventBrowserGesture = (event: Event) => event.preventDefault();
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('gesturestart', preventBrowserGesture);
    container.addEventListener('gesturechange', preventBrowserGesture);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('gesturestart', preventBrowserGesture);
      container.removeEventListener('gesturechange', preventBrowserGesture);
    };
  }, [setViewport, zoomTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setSpacePressed(true);
      }
      if (isTypingTarget(event.target)) return;
      if (event.code === 'Equal' || event.code === 'NumpadAdd' || event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomTo(useEditorStore.getState().viewport.zoom * 1.2);
      } else if (event.code === 'Minus' || event.code === 'NumpadSubtract' || event.key === '-') {
        event.preventDefault();
        zoomTo(useEditorStore.getState().viewport.zoom / 1.2);
      } else if (event.code === 'Digit0' || event.code === 'Numpad0' || event.key === '0') {
        event.preventDefault();
        zoomTo(1);
      } else if ((event.code === 'Digit1' || event.code === 'Numpad1' || event.key === '1' || event.key === '!') && event.shiftKey) {
        event.preventDefault();
        fitToContent();
      } else if ((event.code === 'Digit2' || event.code === 'Numpad2' || event.key === '2' || event.key === '@') && event.shiftKey) {
        event.preventDefault();
        fitSelection();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePressed(false);
    };
    const onBlur = () => setSpacePressed(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [fitSelection, fitToContent, zoomTo]);

  useEffect(() => {
    const cancelInteraction = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const interaction = interactionRef.current;
      if (interaction?.kind !== 'draw' && interaction?.kind !== 'lineEndpoint') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const state = useEditorStore.getState();
      state.transient(() => interaction.startDoc);
      if (interaction.kind === 'draw') {
        state.setSelection([]);
        state.setTool('select');
      }
      if (svgRef.current?.hasPointerCapture(interaction.pointerId)) {
        svgRef.current.releasePointerCapture(interaction.pointerId);
      }
      interactionRef.current = null;
    };
    window.addEventListener('keydown', cancelInteraction);
    return () => window.removeEventListener('keydown', cancelInteraction);
  }, []);

  const createText = (world: Point) => {
    const state = useEditorStore.getState();
    const pageDoc = getPageDocument(state.doc);
    const frame = findFrameAtPoint(pageDoc, world);
    const local = pointInParentCoordinates(pageDoc, frame?.id ?? null, world);
    const node = createNode('text', local.x, local.y, 240, 58) as TextNode;
    node.parentId = frame?.id ?? null;
    node.name = uniqueNodeName(state.doc, 'text');
    state.addNode(node);
    state.setTool('select');
    editSnapshotRef.current = useEditorStore.getState().doc;
    setSelectAllOnEdit(true);
    setEditingId(node.id);
  };

  const handlePointerDown = (event: ReactPointerEvent<Element>, node?: EditorNode) => {
    if (event.button !== 0 && event.button !== 1) return;
    const state = useEditorStore.getState();
    const pageDoc = getPageDocument(state.doc);
    if (editingId && !(event.target instanceof HTMLTextAreaElement)) {
      setEditingId(null);
      if (editSnapshotRef.current) state.recordSnapshot(editSnapshotRef.current);
      editSnapshotRef.current = null;
    }
    const world = screenToWorld(event.clientX, event.clientY);
    const shouldPan = event.button === 1 || state.tool === 'hand' || spacePressed;
    if (shouldPan) {
      event.preventDefault();
      setPanning(true);
      interactionRef.current = {
        kind: 'pan', pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY }, startViewport: state.viewport,
      };
      svgRef.current?.setPointerCapture(event.pointerId);
      return;
    }
    if (state.tool === 'text') {
      event.preventDefault();
      createText(world);
      return;
    }
    if (state.tool === 'image') {
      event.preventDefault();
      pendingImagePoint.current = world;
      fileInputRef.current?.click();
      return;
    }
    if (drawingTools.includes(state.tool as NodeType)) {
      event.preventDefault();
      const type = state.tool as NodeType;
      const frame = type === 'frame' ? null : findFrameAtPoint(pageDoc, world);
      const parentId = frame?.id ?? null;
      const startLocal = pointInParentCoordinates(pageDoc, parentId, world);
      const newNode = createNode(type, startLocal.x, startLocal.y, 0.01, 0.01);
      newNode.parentId = parentId;
      newNode.name = uniqueNodeName(state.doc, type);
      state.setSelection([newNode.id]);
      state.transient((current) => ({ ...current, nodes: [...current.nodes, newNode] }));
      interactionRef.current = {
        kind: 'draw', pointerId: event.pointerId, nodeId: newNode.id,
        parentId, startLocal, startDoc: state.doc,
      };
      svgRef.current?.setPointerCapture(event.pointerId);
      return;
    }
    if (!node) {
      event.preventDefault();
      const additive = event.shiftKey;
      interactionRef.current = {
        kind: 'marquee', pointerId: event.pointerId, startWorld: world,
        additive, baseSelection: additive ? state.selection : [],
      };
      setMarquee({ start: world, current: world });
      if (!additive) setSelection([]);
      svgRef.current?.setPointerCapture(event.pointerId);
      return;
    }
    const targetId = getSelectionTarget(
      state.doc, node, state.selection, event.metaKey || event.ctrlKey,
    );
    let ids = state.selection;
    if (event.shiftKey) {
      ids = ids.includes(targetId) ? ids.filter((id) => id !== targetId) : [...ids, targetId];
      setSelection(ids);
      if (!ids.includes(targetId)) return;
    } else {
      ids = ids.includes(targetId) ? ids : [targetId];
      setSelection(ids);
    }
    if (event.detail > 1) {
      setSelection([node.id]);
      return;
    }
    const targetNode = getNode(state.doc, targetId);
    if (!targetNode || isNodeLocked(state.doc, targetNode)) return;
    let movableIds = ids.filter((id) => {
      const selectedNode = getNode(state.doc, id);
      return selectedNode && !isNodeLocked(state.doc, selectedNode);
    });
    if (movableIds.length === 0) return;
    let startDoc = state.doc;
    if (event.altKey && !event.shiftKey) {
      state.duplicateSelection();
      const duplicatedState = useEditorStore.getState();
      startDoc = duplicatedState.doc;
      movableIds = duplicatedState.selection;
    }
    const movableRootIds = movableIds.filter((id) => !movableIds.some(
      (otherId) => otherId !== id && isDescendant(startDoc, id, otherId),
    ));
    const pageStartDoc = getPageDocument(startDoc);
    const snapBounds = movableRootIds.length === 1 && !event.altKey
      ? (() => {
        const excludedIds = new Set(movableIds.flatMap((id) => [
          id, ...getDescendantIds(startDoc, id),
        ]));
        return flattenDocument(pageStartDoc)
          .filter((candidate) => candidate.visible && !excludedIds.has(candidate.id))
          .map((candidate) => getNodeBounds(pageStartDoc, candidate));
      })()
      : [];
    const deferDocument = movableRootIds.length > 0 && movableRootIds.every((id) => {
      const movingNode = getNode(startDoc, id);
      return movingNode?.type === 'frame' && movingNode.parentId === null;
    });
    interactionRef.current = {
      kind: 'move', pointerId: event.pointerId, startWorld: world,
      startDoc, ids: movableIds, rootIds: movableRootIds, targetId, additive: event.shiftKey, moved: false, snapBounds,
      deferDocument, lastDelta: { x: 0, y: 0 },
    };
  };

  const handleResize = (event: ReactPointerEvent<SVGGElement>, node: EditorNode, handle: ResizeHandle) => {
    event.preventDefault();
    event.stopPropagation();
    const state = useEditorStore.getState();
    interactionRef.current = {
      kind: 'resize', pointerId: event.pointerId,
      startWorld: screenToWorld(event.clientX, event.clientY),
      startDoc: state.doc, node: { ...node }, handle,
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleRotate = (event: ReactPointerEvent<SVGGElement>, node: EditorNode) => {
    event.preventDefault();
    event.stopPropagation();
    const state = useEditorStore.getState();
    const parentMatrix = getParentWorldMatrix(state.doc, node);
    const center = applyMatrix(parentMatrix, {
      x: node.x + node.width / 2, y: node.y + node.height / 2,
    });
    const world = screenToWorld(event.clientX, event.clientY);
    interactionRef.current = {
      kind: 'rotate', pointerId: event.pointerId, startDoc: state.doc,
      node: { ...node }, center,
      startAngle: Math.atan2(world.y - center.y, world.x - center.x),
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleEndpointDown = (event: ReactPointerEvent<SVGGElement>, node: LinearNode, endpoint: LineEndpoint) => {
    event.preventDefault();
    event.stopPropagation();
    const state = useEditorStore.getState();
    interactionRef.current = {
      kind: 'lineEndpoint', pointerId: event.pointerId, startDoc: state.doc, node: { ...node }, endpoint,
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const getTransformIds = (stateDoc: DesignDocument, ids: string[]) => ids.filter((id) => {
    const node = getNode(stateDoc, id);
    return node && !isNodeLocked(stateDoc, node) && !ids.some(
      (otherId) => otherId !== id && isDescendant(stateDoc, id, otherId),
    );
  });

  const handleGroupResize = (event: ReactPointerEvent<SVGGElement>, bounds: Bounds, handle: ResizeHandle) => {
    event.preventDefault();
    event.stopPropagation();
    const state = useEditorStore.getState();
    interactionRef.current = {
      kind: 'groupResize', pointerId: event.pointerId,
      startWorld: screenToWorld(event.clientX, event.clientY), startDoc: state.doc,
      ids: getTransformIds(state.doc, state.selection), startBounds: bounds, handle,
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleGroupRotate = (event: ReactPointerEvent<SVGGElement>, bounds: Bounds) => {
    event.preventDefault();
    event.stopPropagation();
    const state = useEditorStore.getState();
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const world = screenToWorld(event.clientX, event.clientY);
    interactionRef.current = {
      kind: 'groupRotate', pointerId: event.pointerId, startDoc: state.doc,
      ids: getTransformIds(state.doc, state.selection), center,
      startAngle: Math.atan2(world.y - center.y, world.x - center.x),
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const state = useEditorStore.getState();
    if (interaction.kind === 'pan') {
      setViewport({
        ...interaction.startViewport,
        x: interaction.startViewport.x + event.clientX - interaction.startClient.x,
        y: interaction.startViewport.y + event.clientY - interaction.startClient.y,
      });
      return;
    }
    if (interaction.kind === 'move' && Math.hypot(
      (event.clientX - (interaction.startWorld.x * state.viewport.zoom + state.viewport.x + (svgRef.current?.getBoundingClientRect().left ?? 0))),
      (event.clientY - (interaction.startWorld.y * state.viewport.zoom + state.viewport.y + (svgRef.current?.getBoundingClientRect().top ?? 0))),
    ) > 2) interaction.moved = true;
    if (interaction.kind === 'move' && interaction.moved && !svgRef.current?.hasPointerCapture(event.pointerId)) {
      setActiveMoveIds(interaction.rootIds);
      svgRef.current?.setPointerCapture(event.pointerId);
    }
    const world = screenToWorld(event.clientX, event.clientY);
    if (interaction.kind === 'move' && !interaction.moved) return;
    if (interaction.kind === 'lineEndpoint') {
      const current = pointInParentCoordinates(interaction.startDoc, interaction.node.parentId, world);
      const endpoints = linearEndpoints(interaction.node);
      const fixed = interaction.endpoint === 'start' ? endpoints.end : endpoints.start;
      const moving = constrainedEndpoint(fixed, current, event.shiftKey);
      const patch = interaction.endpoint === 'start'
        ? linearNodePatch(moving, fixed) : linearNodePatch(fixed, moving);
      state.transient((currentDoc) => ({
        ...currentDoc,
        nodes: currentDoc.nodes.map((node) => node.id === interaction.node.id
          ? { ...node, ...patch } as EditorNode : node),
      }));
      return;
    }
    if (interaction.kind === 'marquee') {
      setMarquee({ start: interaction.startWorld, current: world });
      const bounds = normalizeRect(interaction.startWorld, world);
      const pageDoc = getPageDocument(state.doc);
      const hits = getChildren(pageDoc, null).filter((node) => {
        if (!node.visible) return false;
        const nodeBounds = getNodeBounds(pageDoc, node);
        return nodeBounds.x <= bounds.x + bounds.width &&
          nodeBounds.x + nodeBounds.width >= bounds.x &&
          nodeBounds.y <= bounds.y + bounds.height &&
          nodeBounds.y + nodeBounds.height >= bounds.y;
      }).map((node) => node.id);
      setSelection([...new Set([...interaction.baseSelection, ...hits])]);
      return;
    }
    if (interaction.kind === 'draw') {
      const current = pointInParentCoordinates(state.doc, interaction.parentId, world);
      const drawingNode = getNode(state.doc, interaction.nodeId);
      if (drawingNode?.type === 'line' || drawingNode?.type === 'arrow') {
        const end = constrainedEndpoint(interaction.startLocal, current, event.shiftKey);
        const patch = linearNodePatch(interaction.startLocal, end);
        state.transient((currentDoc) => ({
          ...currentDoc,
          nodes: currentDoc.nodes.map((node) => node.id === interaction.nodeId
            ? { ...node, ...patch } as EditorNode : node),
        }));
        return;
      }
      let bounds = normalizeRect(interaction.startLocal, current);
      if (event.shiftKey) {
        const size = Math.max(bounds.width, bounds.height);
        bounds = {
          x: interaction.startLocal.x + (current.x < interaction.startLocal.x ? -size : 0),
          y: interaction.startLocal.y + (current.y < interaction.startLocal.y ? -size : 0),
          width: size, height: size,
        };
      }
      state.transient((currentDoc) => ({
        ...currentDoc,
        nodes: currentDoc.nodes.map((node) => node.id === interaction.nodeId
          ? { ...node, ...bounds } as EditorNode : node),
      }));
      return;
    }
    if (interaction.kind === 'move') {
      let delta = { x: world.x - interaction.startWorld.x, y: world.y - interaction.startWorld.y };
      if (event.shiftKey) {
        if (Math.abs(delta.x) > Math.abs(delta.y)) delta.y = 0;
        else delta.x = 0;
      }
      const { rootIds } = interaction;
      if (rootIds.length === 1 && !event.altKey) {
        const movingNode = getNode(interaction.startDoc, rootIds[0]);
        if (movingNode) {
          const snapped = snapMovingBounds(
            getNodeBounds(interaction.startDoc, movingNode), delta,
            interaction.snapBounds,
            6 / state.viewport.zoom,
          );
          delta = snapped.delta;
          setSnapGuides(snapped.guides);
        }
      } else {
        setSnapGuides([]);
      }
      interaction.lastDelta = delta;
      if (interaction.deferDocument) {
        // Root frames already have a retained Pixi preview. Keep the document
        // immutable during the gesture and commit this delta once on release.
        setDeferredMoveDelta(delta);
        return;
      }
      const preserveRelativeGeometry = rootIds.every((id) => {
        const node = getNode(interaction.startDoc, id);
        const parent = getNode(interaction.startDoc, node?.parentId ?? null);
        return parent?.type !== 'frame' || !parent.autoLayout;
      });
      const nodes = translatedDocumentNodes(interaction.startDoc, rootIds, delta);
      state.transient((current) => ({ ...current, nodes }), { preserveRelativeGeometry });
      return;
    }
    if (interaction.kind === 'groupResize') {
      const start = interaction.startBounds;
      const delta = { x: world.x - interaction.startWorld.x, y: world.y - interaction.startWorld.y };
      const next = { ...start };
      if (interaction.handle.includes('e')) next.width = start.width + delta.x;
      if (interaction.handle.includes('w')) {
        next.x = start.x + delta.x;
        next.width = start.width - delta.x;
      }
      if (interaction.handle.includes('s')) next.height = start.height + delta.y;
      if (interaction.handle.includes('n')) {
        next.y = start.y + delta.y;
        next.height = start.height - delta.y;
      }
      if (event.shiftKey && interaction.handle.length === 2) {
        const ratio = start.width / Math.max(start.height, 0.0001);
        if (Math.abs(next.width / start.width) > Math.abs(next.height / start.height)) next.height = next.width / ratio;
        else next.width = next.height * ratio;
        next.x = interaction.handle.includes('w') ? start.x + start.width - next.width : start.x;
        next.y = interaction.handle.includes('n') ? start.y + start.height - next.height : start.y;
      }
      if (next.width < 1) {
        if (interaction.handle.includes('w')) next.x = start.x + start.width - 1;
        next.width = 1;
      }
      if (next.height < 1) {
        if (interaction.handle.includes('n')) next.y = start.y + start.height - 1;
        next.height = 1;
      }
      state.transient((current) => ({
        ...current,
        nodes: resizeSelection(interaction.startDoc, interaction.ids, start, next),
      }));
      return;
    }
    if (interaction.kind === 'groupRotate') {
      const angle = Math.atan2(world.y - interaction.center.y, world.x - interaction.center.x);
      let rotation = ((angle - interaction.startAngle) * 180) / Math.PI;
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      state.transient((current) => ({
        ...current,
        nodes: rotateSelection(interaction.startDoc, interaction.ids, interaction.center, round(rotation, 1)),
      }));
      return;
    }
    if (interaction.kind === 'resize') {
      const start = interaction.node;
      const inverseParent = invertMatrix(getParentWorldMatrix(interaction.startDoc, start));
      const parentDelta = transformVector(inverseParent, {
        x: world.x - interaction.startWorld.x, y: world.y - interaction.startWorld.y,
      });
      const angle = (-start.rotation * Math.PI) / 180;
      const delta = {
        x: Math.cos(angle) * parentDelta.x - Math.sin(angle) * parentDelta.y,
        y: Math.sin(angle) * parentDelta.x + Math.cos(angle) * parentDelta.y,
      };
      const handle = interaction.handle;
      let x = start.x;
      let y = start.y;
      let width = start.width;
      let height = start.height;
      if (handle.includes('e')) width = start.width + delta.x;
      if (handle.includes('w')) {
        width = start.width - delta.x;
        x = start.x + delta.x;
      }
      if (handle.includes('s')) height = start.height + delta.y;
      if (handle.includes('n')) {
        height = start.height - delta.y;
        y = start.y + delta.y;
      }
      if (event.shiftKey && handle.length === 2) {
        const aspectRatio = start.width / Math.max(start.height, 0.0001);
        if (Math.abs(width / start.width) > Math.abs(height / start.height)) {
          height = width / aspectRatio;
        } else {
          width = height * aspectRatio;
        }
        x = handle.includes('w') ? start.x + start.width - width : start.x;
        y = handle.includes('n') ? start.y + start.height - height : start.y;
      }
      if (width < 1) {
        if (handle.includes('w')) x = start.x + start.width - 1;
        width = 1;
      }
      if (height < 1) {
        if (handle.includes('n')) y = start.y + start.height - 1;
        height = 1;
      }
      if (!event.shiftKey) {
        const resizedNode = { ...start, x, y, width, height } as EditorNode;
        const resizedDoc = {
          ...interaction.startDoc,
          nodes: interaction.startDoc.nodes.map((node) => node.id === start.id ? resizedNode : node),
        };
        const initialBounds = getNodeBounds(resizedDoc, resizedNode);
        const excludedIds = new Set([start.id, ...getDescendantIds(interaction.startDoc, start.id)]);
        const pageStartDoc = getPageDocument(interaction.startDoc);
        const candidates = flattenDocument(pageStartDoc).filter((node) => node.visible && !excludedIds.has(node.id));
        const snapped = snapResizingBounds(
          initialBounds, handle,
          candidates.map((node) => getNodeBounds(pageStartDoc, node)),
          6 / state.viewport.zoom,
        );
        const correction = {
          x: handle.includes('e')
            ? snapped.bounds.x + snapped.bounds.width - initialBounds.x - initialBounds.width
            : handle.includes('w') ? snapped.bounds.x - initialBounds.x : 0,
          y: handle.includes('s')
            ? snapped.bounds.y + snapped.bounds.height - initialBounds.y - initialBounds.height
            : handle.includes('n') ? snapped.bounds.y - initialBounds.y : 0,
        };
        const parentCorrection = transformVector(inverseParent, correction);
        const localCorrection = {
          x: Math.cos(angle) * parentCorrection.x - Math.sin(angle) * parentCorrection.y,
          y: Math.sin(angle) * parentCorrection.x + Math.cos(angle) * parentCorrection.y,
        };
        if (handle.includes('e')) width += localCorrection.x;
        if (handle.includes('w')) {
          width -= localCorrection.x;
          x += localCorrection.x;
        }
        if (handle.includes('s')) height += localCorrection.y;
        if (handle.includes('n')) {
          height -= localCorrection.y;
          y += localCorrection.y;
        }
        setSnapGuides(snapped.guides);
      } else {
        setSnapGuides([]);
      }
      state.transient((current) => ({
        ...current,
        nodes: current.nodes.map((node) => node.id === start.id ? {
          ...node, x: round(x), y: round(y), width: round(width), height: round(height),
          ...(node.type === 'text' ? { autoSize: 'none' as const } : {}),
          ...(node.type === 'frame' && node.autoLayout && (node.autoLayout.hug || node.autoLayout.widthMode === 'hug' || node.autoLayout.heightMode === 'hug')
            ? { autoLayout: { ...node.autoLayout, hug: false, widthMode: 'fixed' as const, heightMode: 'fixed' as const } }
            : {}),
        } : node),
      }));
      return;
    }
    if (interaction.kind === 'rotate') {
      const angle = Math.atan2(world.y - interaction.center.y, world.x - interaction.center.x);
      let rotation = interaction.node.rotation + ((angle - interaction.startAngle) * 180) / Math.PI;
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      rotation = ((rotation + 180) % 360 + 360) % 360 - 180;
      state.transient((current) => ({
        ...current,
        nodes: current.nodes.map((node) => node.id === interaction.node.id
          ? { ...node, rotation: round(rotation, 1) } : node),
      }));
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const state = useEditorStore.getState();
    if (interaction.kind === 'move' && !interaction.moved && !interaction.additive && interaction.ids.length > 1) {
      state.setSelection([interaction.targetId]);
    }
    if (interaction.kind === 'move' && interaction.deferDocument && interaction.moved) {
      const nodes = translatedDocumentNodes(interaction.startDoc, interaction.rootIds, interaction.lastDelta);
      state.transient((current) => ({ ...current, nodes }), { preserveRelativeGeometry: true });
    }
    if (interaction.kind === 'move' && interaction.ids.length === 1) {
      const movingNode = getNode(state.doc, interaction.ids[0]);
      const pageDoc = getPageDocument(state.doc);
      if (movingNode && movingNode.type !== 'frame') {
        const bounds = getNodeBounds(pageDoc, movingNode);
        const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        const targetFrame = findFrameAtPoint(pageDoc, center);
        const newParentId = targetFrame && !isNodeLocked(pageDoc, targetFrame) ? targetFrame.id : null;
        if (newParentId !== movingNode.parentId) {
          const localCenter = pointInParentCoordinates(pageDoc, newParentId, center);
          const worldRotation = getWorldRotation(pageDoc, movingNode);
          const parentRotation = targetFrame ? getWorldRotation(pageDoc, targetFrame) : 0;
          state.transient((current) => ({
            ...current,
            nodes: current.nodes.map((node) => node.id === movingNode.id ? {
              ...node,
              parentId: newParentId,
              pageId: newParentId ? movingNode.pageId : pageDoc.activePageId,
              x: round(localCenter.x - node.width / 2),
              y: round(localCenter.y - node.height / 2),
              rotation: round(worldRotation - parentRotation, 1),
            } : node),
          }));
        }
      }
    }
    if (interaction.kind === 'draw') {
      const node = getNode(state.doc, interaction.nodeId);
      if (node?.type === 'line' || node?.type === 'arrow') {
        if (node.width < 4) {
          state.transient((current) => ({ ...current, nodes: current.nodes.filter((candidate) => candidate.id !== node.id) }));
          state.setSelection([]);
        }
      } else if (node && node.width < 4 && node.height < 4) {
        const isFrame = node.type === 'frame';
        const width = isFrame ? 800 : 160;
        const height = isFrame ? 600 : 120;
        state.transient((current) => ({
          ...current,
          nodes: current.nodes.map((candidate) => candidate.id === node.id
            ? { ...candidate, width, height } as EditorNode : candidate),
        }));
      }
      state.setTool('select');
    }
    if (interaction.kind === 'marquee') setMarquee(null);
    setSnapGuides([]);
    setActiveMoveIds([]);
    setDeferredMoveDelta(null);
    if (interaction.kind !== 'pan' && interaction.kind !== 'marquee') {
      state.recordSnapshot(interaction.startDoc);
    }
    if (interaction.kind === 'pan') setPanning(false);
    interactionRef.current = null;
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };

  const handleTextDoubleClick = (event: ReactMouseEvent<Element>, node: EditorNode) => {
    if (node.type !== 'text' || isNodeLocked(doc, node)) return;
    event.stopPropagation();
    setSelection([node.id]);
    editSnapshotRef.current = useEditorStore.getState().doc;
    setSelectAllOnEdit(false);
    setEditingId(node.id);
  };

  const openContextMenu = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContextMenu({
      x: clamp(clientX - rect.left, 8, Math.max(8, rect.width - 240)),
      y: clamp(clientY - rect.top, 8, Math.max(8, rect.height - 390)),
      world: screenToWorld(clientX, clientY),
    });
  };

  const handleNodeContextMenu = (event: ReactMouseEvent<Element>, node: EditorNode) => {
    event.preventDefault();
    event.stopPropagation();
    // Cmd/Ctrl+primary click is deep-select, not a request for the context menu.
    // A modified secondary click still opens our menu instead of the browser's.
    if ((event.ctrlKey || event.metaKey) && event.button === 0) return;
    const state = useEditorStore.getState();
    const targetId = getSelectionTarget(state.doc, node, state.selection);
    if (!state.selection.includes(targetId)) setSelection([targetId]);
    openContextMenu(event.clientX, event.clientY);
  };

  const handleBackgroundContextMenu = (event: ReactMouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    if ((event.ctrlKey || event.metaKey) && event.button === 0) return;
    setSelection([]);
    openContextMenu(event.clientX, event.clientY);
  };

  const handleComponentDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const componentId = event.dataTransfer.getData('application/x-malewich-component');
    if (!componentId) return;
    event.preventDefault();
    const state = useEditorStore.getState();
    const world = screenToWorld(event.clientX, event.clientY);
    const pageDoc = getPageDocument(state.doc);
    const frame = findFrameAtPoint(pageDoc, world);
    const local = pointInParentCoordinates(pageDoc, frame?.id ?? null, world);
    state.createInstance(componentId, { x: local.x, y: local.y, parentId: frame?.id ?? null });
  };

  const handleImageFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const state = useEditorStore.getState();
        const world = pendingImagePoint.current;
        const pageDoc = getPageDocument(state.doc);
        const frame = findFrameAtPoint(pageDoc, world);
        const local = pointInParentCoordinates(pageDoc, frame?.id ?? null, world);
        const scale = Math.min(1, 480 / image.naturalWidth, 360 / image.naturalHeight);
        const node = createNode('image', local.x, local.y,
          Math.max(1, image.naturalWidth * scale), Math.max(1, image.naturalHeight * scale));
        if (node.type !== 'image') return;
        node.src = src;
        node.parentId = frame?.id ?? null;
        node.name = file.name.replace(/\.[^.]+$/, '') || uniqueNodeName(state.doc, 'image');
        state.addNode(node);
        state.setTool('select');
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  };

  const selectionKey = selection.join('|');
  const selectedNodes = useMemo(() => selection.flatMap((id) => {
    const node = getNode(doc, id);
    return node ? [node] : [];
  }), [doc, selectionKey]);
  const editingNode = editingId ? getNode(doc, editingId) : undefined;
  const rootNodes = getChildren(doc, null);
  const activeMoveNodes = useMemo(() => activeMoveIds.flatMap((id) => {
    const node = getNode(doc, id);
    return node && node.type !== 'frame' ? [node] : [];
  }), [activeMoveIds, doc]);
  const suppressedMoveIds = useMemo(() => new Set(activeMoveNodes.map((node) => node.id)), [activeMoveNodes]);
  const compositorMoveIds = useMemo(() => activeMoveIds.filter((id) => {
    const node = getNode(doc, id);
    // Top-level frames have no ancestor clip or transform to preserve in the overlay.
    return node?.type === 'frame' && node.parentId === null;
  }), [activeMoveIds, doc]);
  const isHand = tool === 'hand' || spacePressed;
  const pointerNode = (event: { target: EventTarget | null; clientX: number; clientY: number }) => {
    const id = event.target instanceof Element
      ? event.target.closest('[data-node-id]')?.getAttribute('data-node-id')
      : null;
    return (id ? getNode(doc, id) : undefined) ?? hitTestNode(doc, screenToWorld(event.clientX, event.clientY));
  };

  return (
    <section
      className="canvas-column"
      style={activePage?.background ? { '--page-background': activePage.background } as CSSProperties : undefined}
    >
      <div
        ref={containerRef}
        className={`canvas-viewport${isHand ? ' is-hand' : ''}${tool !== 'select' && tool !== 'hand' ? ' is-drawing' : ''}${isPageSwitching ? ' is-page-switching' : ''}`}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes('application/x-malewich-component')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={handleComponentDrop}
      >
        <svg className="canvas-grid" aria-hidden="true">
          <defs>
            <pattern
              id="canvas-grid" width="24" height="24" patternUnits="userSpaceOnUse"
              patternTransform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}
            >
              <circle cx="1" cy="1" r={0.65 / viewport.zoom} fill="rgba(76, 92, 100, 0.28)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#canvas-grid)" />
        </svg>
        {!webglFailed && (
          <PixiScene
            doc={doc} change={change} viewport={viewport} editingId={editingId} panning={panning}
            movingIds={compositorMoveIds} moveDelta={deferredMoveDelta}
            suppressedIds={suppressedMoveIds} onFallback={handleRendererFallback}
          />
        )}
        <svg
          ref={svgRef}
          className="editor-svg"
          onPointerDown={(event) => handlePointerDown(event, pointerNode(event) ?? undefined)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={(event) => {
            const target = pointerNode(event);
            if (target) handleTextDoubleClick(event, target);
          }}
          onContextMenu={(event) => {
            const target = pointerNode(event);
            if (target) handleNodeContextMenu(event, target);
            else handleBackgroundContextMenu(event);
          }}
        >
          <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
            {webglFailed && rootNodes.map((node) => (
              <SceneNode
                key={node.id} doc={doc} node={node} editingId={editingId}
                suppressedIds={suppressedMoveIds}
                onNodePointerDown={(event, target) => {
                  event.stopPropagation();
                  handlePointerDown(event, target);
                }}
                onTextDoubleClick={handleTextDoubleClick}
                onNodeContextMenu={handleNodeContextMenu}
              />
            ))}
            {!webglFailed && showHitLayer && <HitLayer doc={doc} />}
            {activeMoveNodes.map((node) => (
              <SceneNode
                key={`drag-${node.id}`} doc={doc} node={node} editingId={editingId}
                worldTransform={getWorldMatrix(doc, node)}
                onNodePointerDown={(event, target) => {
                  event.stopPropagation();
                  handlePointerDown(event, target);
                }}
                onTextDoubleClick={handleTextDoubleClick}
                onNodeContextMenu={handleNodeContextMenu}
              />
            ))}
            {rootNodes.filter((node) => node.type === 'frame' && node.visible && (viewport.zoom >= 0.2 || selection.includes(node.id))).map((frame) => (
              <g
                key={`label-${frame.id}`}
                transform={`${deferredMoveDelta && compositorMoveIds.includes(frame.id) ? `translate(${deferredMoveDelta.x} ${deferredMoveDelta.y}) ` : ''}${matrixToString(nodeMatrix(frame))}`}
              >
                <text
                  data-frame-label-id={frame.id}
                  className={`frame-label${selection.includes(frame.id) ? ' is-selected' : ''}`}
                  x={frame.x} y={frame.y - 10 / viewport.zoom}
                  fontSize={12 / viewport.zoom}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    handlePointerDown(event, frame);
                  }}
                >
                  {frame.name}
                </text>
              </g>
            ))}
            {snapGuides.map((guide, index) => (
              <line
                key={`${guide.axis}-${index}`} className="smart-guide"
                x1={guide.axis === 'x' ? guide.value : guide.start}
                y1={guide.axis === 'y' ? guide.value : guide.start}
                x2={guide.axis === 'x' ? guide.value : guide.end}
                y2={guide.axis === 'y' ? guide.value : guide.end}
                stroke="#ff4f9a" strokeWidth={1 / viewport.zoom} pointerEvents="none"
              />
            ))}
            {marquee && (
              <rect
                className="marquee-selection" pointerEvents="none"
                x={Math.min(marquee.start.x, marquee.current.x)}
                y={Math.min(marquee.start.y, marquee.current.y)}
                width={Math.abs(marquee.current.x - marquee.start.x)}
                height={Math.abs(marquee.current.y - marquee.start.y)}
                fill="rgba(115, 87, 255, .08)" stroke="#7357ff" strokeWidth={1 / viewport.zoom}
              />
            )}
            <g transform={deferredMoveDelta ? `translate(${deferredMoveDelta.x} ${deferredMoveDelta.y})` : undefined}>
              <SelectionOverlay
                doc={doc} nodes={editingId ? [] : selectedNodes} zoom={viewport.zoom}
                onResize={handleResize} onRotate={handleRotate} onEndpointDown={handleEndpointDown}
                onGroupResize={handleGroupResize} onGroupRotate={handleGroupRotate}
              />
            </g>
            {editingNode?.type === 'text' && (
              <TextEditor
                doc={doc} node={editingNode} selectAll={selectAllOnEdit}
                onChange={(text) => {
                  const nextNode = { ...editingNode, text };
                  useEditorStore.getState().updateNode(editingNode.id, {
                    text, ...measureAutoText(nextNode),
                  }, false);
                }}
                onFinish={() => {
                  setEditingId(null);
                  if (editSnapshotRef.current) useEditorStore.getState().recordSnapshot(editSnapshotRef.current);
                  editSnapshotRef.current = null;
                }}
              />
            )}
          </g>
        </svg>
        {contextMenu && (
          <CanvasContextMenu
            x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}
            onFitSelection={fitSelection}
            onCreateFrame={() => {
              const state = useEditorStore.getState();
              const node = createNode('frame', contextMenu.world.x, contextMenu.world.y, 800, 600);
              node.name = uniqueNodeName(state.doc, 'frame');
              state.addNode(node);
              setContextMenu(null);
            }}
          />
        )}
        {doc.nodes.length === 0 && (
          <div className="canvas-empty-state">
            <div className="empty-state-icon"><Frame size={24} /></div>
            <h2>Начните с фрейма</h2>
            <p>Фрейм — это холст для вашего макета.<br />Потяните на полотне или создайте фрейм одним кликом.</p>
            <button onClick={() => {
              const state = useEditorStore.getState();
              const node = createNode('frame', 0, 0, 920, 600);
              node.name = uniqueNodeName(state.doc, 'frame');
              state.addNode(node);
              requestAnimationFrame(fitToContent);
            }}><Plus size={16} /> Создать фрейм</button>
          </div>
        )}
        <div className="canvas-mode-hint">
          {isHand ? <Hand size={14} /> : tool === 'select' ? <MousePointer2 size={14} /> : <Check size={14} />}
          <span>{isHand ? 'Потяните, чтобы переместить холст' : tool === 'select' ? 'V — выделение · H — рука' : 'Потяните на холсте, чтобы создать объект'}</span>
        </div>
      </div>
      <input
        ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        hidden onChange={(event) => {
          handleImageFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </section>
  );
}
