import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Clipboard,
  Code2,
  Component,
  Copy,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Frame,
  Group,
  Lock,
  Scissors,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { getNode } from '../utils/document';
import { canOutlineStroke } from '../utils/nodeOperations';
import { getDocumentPages, getPageDocument } from '../utils/pages';
import { documentToSvg } from '../utils/export';
import { nodeToCss } from '../utils/devMode';
import { createAutoLayout } from '../utils/autoLayout';

interface LayerContextMenuProps {
  nodeId: string;
  x: number;
  y: number;
  onClose: () => void;
  onRename?: () => void;
}

type Submenu = 'clipboard' | 'motion' | 'page' | null;

export function LayerContextMenu({ nodeId, x, y, onClose, onRename }: LayerContextMenuProps) {
  const doc = useEditorStore((state) => state.doc);
  const selection = useEditorStore((state) => state.selection);
  const clipboard = useEditorStore((state) => state.clipboard);
  const copySelection = useEditorStore((state) => state.copySelection);
  const pasteClipboard = useEditorStore((state) => state.pasteClipboard);
  const duplicateSelection = useEditorStore((state) => state.duplicateSelection);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);
  const reorder = useEditorStore((state) => state.reorder);
  const reorderToEdge = useEditorStore((state) => state.reorderToEdge);
  const updateNode = useEditorStore((state) => state.updateNode);
  const groupSelection = useEditorStore((state) => state.groupSelection);
  const moveSelectionToPage = useEditorStore((state) => state.moveSelectionToPage);
  const flattenSelection = useEditorStore((state) => state.flattenSelection);
  const outlineSelectionStroke = useEditorStore((state) => state.outlineSelectionStroke);
  const flipSelection = useEditorStore((state) => state.flipSelection);
  const createComponent = useEditorStore((state) => state.createComponent);
  const resetInstance = useEditorStore((state) => state.resetInstance);
  const detachInstance = useEditorStore((state) => state.detachInstance);
  const addPrototypeLink = useEditorStore((state) => state.addPrototypeLink);
  const [submenu, setSubmenu] = useState<Submenu>(null);
  const node = getNode(doc, nodeId);
  const selectedNodes = selection.flatMap((id) => {
    const selected = getNode(doc, id);
    return selected ? [selected] : [];
  });

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', close, true);
    return () => window.removeEventListener('keydown', close, true);
  }, [onClose]);

  if (!node) return null;
  const run = (action: () => void) => {
    action();
    onClose();
  };
  const copyText = (text: string) => run(() => {
    void navigator.clipboard.writeText(text).catch(() => window.alert('Не удалось скопировать в буфер обмена'));
  });
  const selectedParent = selectedNodes[0]?.parentId;
  const canGroup = selectedNodes.length > 0 && selectedNodes.every((selected) => selected.parentId === selectedParent);
  const canFlatten = selectedNodes.some((selected) => selected.type === 'rectangle' || selected.type === 'ellipse');
  const canOutline = selectedNodes.some(canOutlineStroke);
  const targetFrames = doc.nodes.filter((candidate) => candidate.type === 'frame' && candidate.parentId === null && candidate.id !== nodeId);
  const openSubmenu = (next: Submenu) => setSubmenu(submenu === next ? null : next);

  return (
    <>
      <button className="popover-dismiss" aria-label="Закрыть меню слоя" onPointerDown={onClose} onContextMenu={(event) => event.preventDefault()} />
      <div
        className={`canvas-context-menu layer-context-menu popover${x > window.innerWidth - 540 ? ' opens-left' : ''}`} role="menu"
        style={{ left: Math.max(8, Math.min(x, window.innerWidth - 272)), top: Math.max(8, Math.min(y, window.innerHeight - 700)) }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <button onClick={() => run(() => copySelection())}><Copy size={14} /><span>Копировать</span><kbd>⌘C</kbd></button>
        <button disabled={!clipboard} onClick={() => run(() => pasteClipboard(true))}><Clipboard size={14} /><span>Вставить с заменой</span><kbd>⇧⌘R</kbd></button>
        <div className="context-submenu-wrap">
          <button aria-expanded={submenu === 'clipboard'} onClick={() => openSubmenu('clipboard')}><Copy size={14} /><span>Копирование и вставка</span><ChevronRight size={13} /></button>
          {submenu === 'clipboard' && <div className="context-submenu popover" role="menu">
            <button onClick={() => run(() => copySelection(true))}><Scissors size={14} /><span>Вырезать</span><kbd>⌘X</kbd></button>
            <button disabled={!clipboard} onClick={() => run(() => pasteClipboard())}><Clipboard size={14} /><span>Вставить</span><kbd>⌘V</kbd></button>
            <button onClick={() => run(duplicateSelection)}><Copy size={14} /><span>Дублировать</span><kbd>⌘D</kbd></button>
            <button onClick={() => copyText(documentToSvg(getPageDocument(doc), selection).svg)}><Code2 size={14} /><span>Копировать как SVG</span></button>
          </div>}
        </div>
        <button onClick={() => copyText(selectedNodes.map((selected) => nodeToCss(doc, selected)).join('\n\n'))}><Code2 size={14} /><span>Скопировать CSS</span></button>
        {node.type === 'frame' && <div className="context-submenu-wrap">
          <button aria-expanded={submenu === 'motion'} onClick={() => openSubmenu('motion')}><Frame size={14} /><span>Добавить переход</span><ChevronRight size={13} /></button>
          {submenu === 'motion' && <div className="context-submenu popover" role="menu">
            {targetFrames.length ? targetFrames.map((target) => <button key={target.id} onClick={() => run(() => addPrototypeLink(nodeId, target.id))}><Frame size={14} /><span>{target.name}</span></button>) : <div className="context-menu-empty">Нет другого корневого фрейма</div>}
          </div>}
        </div>}
        <div className="popover-divider" />
        <div className="context-submenu-wrap">
          <button aria-expanded={submenu === 'page'} onClick={() => openSubmenu('page')}><Frame size={14} /><span>Перенести на страницу</span><ChevronRight size={13} /></button>
          {submenu === 'page' && <div className="context-submenu popover" role="menu">
            {getDocumentPages(doc).map((page) => <button key={page.id} onClick={() => run(() => moveSelectionToPage(page.id))}><span>{page.name}</span></button>)}
          </div>}
        </div>
        <button onClick={() => run(() => reorderToEdge(nodeId, 'front'))}><ArrowUp size={14} /><span>На передний план</span><kbd>]</kbd></button>
        <button onClick={() => run(() => reorderToEdge(nodeId, 'back'))}><ArrowDown size={14} /><span>На задний план</span><kbd>[</kbd></button>
        <button onClick={() => run(() => reorder(nodeId, 'up'))}><ArrowUp size={14} /><span>Выше по слою</span></button>
        <button onClick={() => run(() => reorder(nodeId, 'down'))}><ArrowDown size={14} /><span>Ниже по слою</span></button>
        <div className="popover-divider" />
        <button disabled={!canGroup} onClick={() => run(() => groupSelection(false))}><Group size={14} /><span>Сгруппировать</span><kbd>⌘G</kbd></button>
        <button disabled={!canGroup} onClick={() => run(() => groupSelection(true))}><Frame size={14} /><span>Выделить во фрейм</span><kbd>⇧⌘G</kbd></button>
        <button onClick={() => run(() => {
          if (onRename) onRename();
          else requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.selected-node-heading input')?.select());
        })}><Copy size={14} /><span>Переименовать</span></button>
        <button disabled={!canFlatten} onClick={() => run(flattenSelection)}><Group size={14} /><span>Преобразовать в вектор</span></button>
        <button disabled={!canOutline} onClick={() => run(outlineSelectionStroke)}><Group size={14} /><span>Обвести контур</span></button>
        <button disabled title="Полное смешивание масок пока не поддерживается"><Group size={14} /><span>Использовать как маску</span><small>Импорт</small></button>
        <div className="popover-divider" />
        {node.type === 'frame' && <button onClick={() => run(() => updateNode(nodeId, { autoLayout: node.autoLayout ? undefined : createAutoLayout() }))}><Group size={14} /><span>{node.autoLayout ? 'Удалить Auto Layout' : 'Добавить Auto Layout'}</span></button>}
        {!node.component && <button onClick={() => run(() => createComponent(nodeId))}><Component size={14} /><span>Создать компонент</span></button>}
        {node.component?.role === 'instance' && <>
          <button onClick={() => run(() => resetInstance(nodeId))}><Component size={14} /><span>Сбросить overrides</span></button>
          <button onClick={() => run(() => detachInstance(nodeId))}><Component size={14} /><span>Отсоединить instance</span></button>
        </>}
        <div className="popover-divider" />
        <button onClick={() => run(() => updateNode(nodeId, { visible: !node.visible }))}>
          {node.visible ? <EyeOff size={14} /> : <Eye size={14} />}<span>{node.visible ? 'Скрыть слой' : 'Показать слой'}</span>
        </button>
        <button onClick={() => run(() => updateNode(nodeId, { locked: !node.locked }))}>
          {node.locked ? <Unlock size={14} /> : <Lock size={14} />}<span>{node.locked ? 'Разблокировать' : 'Заблокировать'}</span>
        </button>
        <button onClick={() => run(() => flipSelection('horizontal'))}><FlipHorizontal2 size={14} /><span>Отразить по горизонтали</span></button>
        <button onClick={() => run(() => flipSelection('vertical'))}><FlipVertical2 size={14} /><span>Отразить по вертикали</span></button>
        <div className="popover-divider" />
        <button className="context-danger" onClick={() => run(deleteSelection)}><Trash2 size={14} /><span>Удалить</span><kbd>⌫</kbd></button>
      </div>
    </>
  );
}
