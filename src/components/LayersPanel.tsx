import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  MoveRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Columns3,
  Component,
  Diamond,
  Eye,
  EyeOff,
  Frame,
  Group,
  Image as ImageIcon,
  Layers3,
  Lock,
  Minus,
  PenTool,
  Rows3,
  RectangleHorizontal,
  Star as StarIcon,
  Triangle,
  Type,
  Unlock,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import type { EditorNode, NodeType } from '../types';
import { LibraryPanel } from './LibraryPanel';
import { usePageDocument } from '../hooks/usePageDocument';
import { PagesPanel } from './PagesPanel';
import { getAncestors, getNode } from '../utils/document';
import { getActivePageId } from '../utils/pages';
import { flattenLayerRows } from '../utils/layers';
import { LayerContextMenu } from './LayerContextMenu';
import { ProjectControls } from './Topbar';
import { ZoomControls } from './ZoomControls';

const LAYER_ROW_HEIGHT = 31;
const LAYER_OVERSCAN = 6;

const typeIcons: Record<NodeType, typeof Frame> = {
  frame: Frame,
  rectangle: RectangleHorizontal,
  ellipse: Circle,
  line: Minus,
  arrow: MoveRight,
  polygon: Triangle,
  star: StarIcon,
  text: Type,
  image: ImageIcon,
  vector: PenTool,
};

function layerKind(node: EditorNode): { label: string; Icon: typeof Frame; className: string } {
  if (node.component?.role === 'main') return { label: 'Main component', Icon: Component, className: 'is-main-component' };
  if (node.component?.role === 'instance') return { label: 'Instance', Icon: Diamond, className: 'is-instance' };
  if (node.type === 'frame' && node.isGroup) return { label: 'Группа', Icon: Group, className: '' };
  if (node.type === 'frame' && node.autoLayout) {
    return node.autoLayout.direction === 'horizontal'
      ? { label: 'Auto Layout · горизонтальный', Icon: Columns3, className: 'is-auto-layout' }
      : { label: 'Auto Layout · вертикальный', Icon: Rows3, className: 'is-auto-layout' };
  }
  const labels: Record<NodeType, string> = {
    frame: 'Фрейм', rectangle: 'Прямоугольник', ellipse: 'Эллипс', line: 'Линия',
    arrow: 'Стрелка', polygon: 'Многоугольник', star: 'Звезда',
    text: 'Текст', image: 'Изображение', vector: 'Вектор',
  };
  return { label: labels[node.type], Icon: typeIcons[node.type], className: '' };
}

interface LayerRowProps {
  node: EditorNode;
  depth: number;
  hasChildren: boolean;
  collapsed: Set<string>;
  setCollapsed: (collapsed: Set<string>) => void;
  renaming: string | null;
  setRenaming: (id: string | null) => void;
  onOpenContextMenu: (event: ReactMouseEvent<HTMLDivElement>, node: EditorNode) => void;
}

function LayerRowComponent({ node, depth, hasChildren, collapsed, setCollapsed, renaming, setRenaming, onOpenContextMenu }: LayerRowProps) {
  const selection = useEditorStore((state) => state.selection);
  const setSelection = useEditorStore((state) => state.setSelection);
  const updateNode = useEditorStore((state) => state.updateNode);
  const moveLayer = useEditorStore((state) => state.moveLayer);
  const [draftName, setDraftName] = useState(node.name);
  const kind = layerKind(node);
  const Icon = kind.Icon;
  const isExpanded = !collapsed.has(node.id);
  const displayName = node.type === 'text' ? node.text.split('\n')[0] || node.name : node.name;

  const finishRename = () => {
    updateNode(node.id, { name: draftName.trim() || node.name });
    setRenaming(null);
  };

  return (
    <div
      className={`layer-row ${kind.className}${selection.includes(node.id) ? ' is-selected' : ''}${!node.visible ? ' is-hidden' : ''}`}
      data-layer-id={node.id}
      data-node-kind={kind.label}
      title={`${kind.label} · ${displayName}`}
      style={{ paddingLeft: 8 + depth * 16 }}
      draggable={renaming !== node.id}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', node.id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('is-drag-target');
      }}
      onDragLeave={(event) => event.currentTarget.classList.remove('is-drag-target')}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('is-drag-target');
        const rect = event.currentTarget.getBoundingClientRect();
        const offset = (event.clientY - rect.top) / rect.height;
        const position = node.type === 'frame' && offset > 0.25 && offset < 0.75
          ? 'inside' : offset < 0.5 ? 'after' : 'before';
        moveLayer(event.dataTransfer.getData('text/plain'), node.id, position);
      }}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) {
          setSelection(selection.includes(node.id) ? selection.filter((id) => id !== node.id) : [...selection, node.id]);
        } else setSelection([node.id]);
      }}
      onDoubleClick={() => {
        setDraftName(node.name);
        setRenaming(node.id);
      }}
      onContextMenu={(event) => onOpenContextMenu(event, node)}
    >
      {hasChildren ? (
        <button
          className="layer-disclosure"
          aria-label={isExpanded ? 'Свернуть слой' : 'Раскрыть слой'}
          aria-expanded={isExpanded}
          onClick={(event) => {
            event.stopPropagation();
            const next = new Set(collapsed);
            if (isExpanded) next.add(node.id); else next.delete(node.id);
            setCollapsed(next);
          }}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      ) : <span className="layer-disclosure-spacer" />}
      <span className="layer-kind"><Icon size={14} className="layer-type-icon" strokeWidth={1.6} /></span>
      {renaming === node.id ? (
        <input
          className="layer-name-input" value={draftName} autoFocus
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={finishRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setDraftName(node.name);
              setRenaming(null);
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : <span className="layer-name">{displayName}</span>}
      <div className="layer-actions">
        <button
          title={node.locked ? 'Разблокировать' : 'Заблокировать'}
          onClick={(event) => {
            event.stopPropagation();
            updateNode(node.id, { locked: !node.locked });
          }}
        >
          {node.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
        <button
          title={node.visible ? 'Скрыть' : 'Показать'}
          onClick={(event) => {
            event.stopPropagation();
            updateNode(node.id, { visible: !node.visible });
          }}
        >
          {node.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
      </div>
    </div>
  );
}

function sameLayerDisplay(before: EditorNode, after: EditorNode): boolean {
  return before.id === after.id && before.name === after.name && before.type === after.type &&
    before.parentId === after.parentId && before.visible === after.visible && before.locked === after.locked &&
    before.component?.role === after.component?.role &&
    (before.type !== 'frame' || after.type !== 'frame' || (before.autoLayout?.direction === after.autoLayout?.direction && before.isGroup === after.isGroup)) &&
    (before.type !== 'text' || after.type !== 'text' || before.text === after.text);
}

function layerRowPropsEqual(previous: LayerRowProps, next: LayerRowProps): boolean {
  return previous.depth === next.depth && previous.hasChildren === next.hasChildren &&
    previous.setCollapsed === next.setCollapsed && previous.setRenaming === next.setRenaming &&
    previous.onOpenContextMenu === next.onOpenContextMenu && previous.collapsed === next.collapsed &&
    previous.renaming === next.renaming && sameLayerDisplay(previous.node, next.node);
}

const LayerRow = memo(LayerRowComponent, layerRowPropsEqual);

interface LayersPanelProps {
  hidden?: boolean;
  panelsVisible: boolean;
  onTogglePanels: () => void;
}

export function LayersPanel({ hidden = false, panelsVisible, onTogglePanels }: LayersPanelProps) {
  const doc = usePageDocument();
  const selection = useEditorStore((state) => state.selection);
  const reorder = useEditorStore((state) => state.reorder);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [tab, setTab] = useState<'layers' | 'library'>('layers');
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [scrollState, setScrollState] = useState({ top: 0, height: 0 });
  const layersTreeRef = useRef<HTMLDivElement>(null);
  const selectionScrollPendingRef = useRef(true);
  const selectionKey = selection.join('|');
  const activePageId = getActivePageId(doc);
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, EditorNode[]>();
    doc.nodes.forEach((node) => {
      const siblings = map.get(node.parentId) ?? [];
      siblings.push(node);
      map.set(node.parentId, siblings);
    });
    return map;
  }, [doc.nodes]);
  const rows = useMemo(() => flattenLayerRows(childrenByParent, collapsed), [childrenByParent, collapsed]);
  const openLayerContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>, node: EditorNode) => {
    event.preventDefault();
    event.stopPropagation();
    const state = useEditorStore.getState();
    if (!state.selection.includes(node.id)) state.setSelection([node.id]);
    setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    if (doc.preserveSavedGeometry) {
      setCollapsed(new Set(doc.nodes.filter((node) => (childrenByParent.get(node.id)?.length ?? 0) > 0).map((node) => node.id)));
    } else setCollapsed(new Set());
  }, [doc.id, activePageId]);

  useEffect(() => {
    if (!selectionKey) return;
    const node = getNode(doc, selection[selection.length - 1]);
    if (!node) return;
    const ancestorIds = getAncestors(doc, node).map((ancestor) => ancestor.id);
    if (ancestorIds.length === 0) return;
    setCollapsed((current) => {
      if (ancestorIds.every((id) => !current.has(id))) return current;
      const next = new Set(current);
      ancestorIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [selectionKey, activePageId]);

  useEffect(() => {
    const tree = layersTreeRef.current;
    if (!tree) return;
    const updateSize = () => setScrollState((current) => ({ ...current, height: tree.clientHeight }));
    const observer = new ResizeObserver(updateSize);
    observer.observe(tree);
    updateSize();
    return () => observer.disconnect();
  }, [tab]);

  useEffect(() => {
    selectionScrollPendingRef.current = true;
  }, [selectionKey, tab, activePageId]);

  useEffect(() => {
    if (!selectionKey || tab !== 'layers' || !selectionScrollPendingRef.current) return;
    const frame = requestAnimationFrame(() => {
      const tree = layersTreeRef.current;
      if (!tree) return;
      const index = rows.findIndex((row) => row.node.id === selection[selection.length - 1]);
      if (index < 0) return;
      const target = Math.max(0, index * LAYER_ROW_HEIGHT - tree.clientHeight / 2 + LAYER_ROW_HEIGHT / 2);
      tree.scrollTop = target;
      selectionScrollPendingRef.current = false;
      setScrollState({ top: tree.scrollTop, height: tree.clientHeight });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectionKey, collapsed, tab, activePageId]);

  useEffect(() => {
    const tree = layersTreeRef.current;
    if (!tree) return;
    const maximum = Math.max(0, rows.length * LAYER_ROW_HEIGHT - tree.clientHeight);
    if (tree.scrollTop > maximum) {
      tree.scrollTop = maximum;
      setScrollState({ top: maximum, height: tree.clientHeight });
    }
  }, [rows.length]);

  const first = Math.max(0, Math.floor(scrollState.top / LAYER_ROW_HEIGHT) - LAYER_OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((scrollState.top + scrollState.height) / LAYER_ROW_HEIGHT) + LAYER_OVERSCAN);
  const visibleRows = rows.slice(first, last);

  return (
    <aside
      className="layers-panel panel" hidden={hidden}
      onContextMenu={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"]')) return;
        event.preventDefault();
      }}
    >
      <ProjectControls panelsVisible={panelsVisible} onTogglePanels={onTogglePanels} />
      <header className="panel-header layers-panel-header">
        <div className="panel-tabs">
          <button className={tab === 'layers' ? 'is-active' : ''} onClick={() => setTab('layers')}>
            <span>Слои</span>{tab === 'layers' && <span className="count-badge">{doc.nodes.length}</span>}
          </button>
          <button className={tab === 'library' ? 'is-active' : ''} onClick={() => setTab('library')}>Библиотека</button>
        </div>
        {tab === 'layers' && selection.length === 1 && (
          <div className="panel-header-actions">
            <button title="Выше по слою" onClick={() => reorder(selection[0], 'up')}><ChevronUp size={15} /></button>
            <button title="Ниже по слою" onClick={() => reorder(selection[0], 'down')}><ChevronDown size={15} /></button>
          </div>
        )}
      </header>
      {tab === 'layers' && <PagesPanel />}
      {tab === 'layers' ? (
        <div
          className="layers-tree" ref={layersTreeRef} data-layer-count={rows.length}
          onScroll={(event) => setScrollState({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
        >
          {rows.length > 0 ? (
            <div className="layers-virtual-spacer" style={{ height: rows.length * LAYER_ROW_HEIGHT }}>
              {visibleRows.map((row, offset) => (
                <div className="layer-virtual-row" style={{ transform: `translateY(${(first + offset) * LAYER_ROW_HEIGHT}px)` }} key={row.node.id}>
                  <LayerRow
                    node={row.node} depth={row.depth} hasChildren={row.hasChildren}
                    collapsed={collapsed} setCollapsed={setCollapsed}
                    renaming={renaming} setRenaming={setRenaming} onOpenContextMenu={openLayerContextMenu}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="layers-empty">
              <Layers3 size={24} strokeWidth={1.4} />
              <p>Здесь появятся<br />ваши объекты</p>
            </div>
          )}
        </div>
      ) : <LibraryPanel />}
      <footer className="layers-footer">
        <div className="layers-footer-summary">
          <span>{doc.nodes.length} объектов</span>
        </div>
        <ZoomControls />
      </footer>
      {contextMenu && <LayerContextMenu
        {...contextMenu} onClose={() => setContextMenu(null)}
        onRename={() => setRenaming(contextMenu.nodeId)}
      />}
    </aside>
  );
}
