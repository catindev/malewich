import {
  ArrowDown,
  ArrowUp,
  Clipboard,
  Copy,
  Frame,
  Maximize2,
  Scissors,
  SquareDashed,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onFitSelection: () => void;
  onCreateFrame: () => void;
}

export function CanvasContextMenu({ x, y, onClose, onFitSelection, onCreateFrame }: CanvasContextMenuProps) {
  const selection = useEditorStore((state) => state.selection);
  const clipboard = useEditorStore((state) => state.clipboard);
  const copySelection = useEditorStore((state) => state.copySelection);
  const pasteClipboard = useEditorStore((state) => state.pasteClipboard);
  const duplicateSelection = useEditorStore((state) => state.duplicateSelection);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);
  const reorder = useEditorStore((state) => state.reorder);
  const setSelection = useEditorStore((state) => state.setSelection);
  const doc = useEditorStore((state) => state.doc);
  const hasSelection = selection.length > 0;

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      <button className="popover-dismiss" aria-label="Закрыть контекстное меню" onPointerDown={onClose} onContextMenu={(event) => event.preventDefault()} />
      <div className="canvas-context-menu popover" role="menu" style={{ left: x, top: y }} onContextMenu={(event) => event.preventDefault()}>
        <button disabled={!hasSelection} onClick={() => run(() => copySelection())}><Copy size={14} /><span>Копировать</span><kbd>⌘C</kbd></button>
        <button disabled={!hasSelection} onClick={() => run(() => copySelection(true))}><Scissors size={14} /><span>Вырезать</span><kbd>⌘X</kbd></button>
        <button disabled={!clipboard} onClick={() => run(pasteClipboard)}><Clipboard size={14} /><span>Вставить</span><kbd>⌘V</kbd></button>
        <button disabled={!hasSelection} onClick={() => run(duplicateSelection)}><Copy size={14} /><span>Дублировать</span><kbd>⌘D</kbd></button>
        <div className="popover-divider" />
        <button disabled={selection.length !== 1} onClick={() => run(() => reorder(selection[0], 'up'))}><ArrowUp size={14} /><span>Выше по слою</span><kbd>]</kbd></button>
        <button disabled={selection.length !== 1} onClick={() => run(() => reorder(selection[0], 'down'))}><ArrowDown size={14} /><span>Ниже по слою</span><kbd>[</kbd></button>
        <div className="popover-divider" />
        <button onClick={() => run(() => setSelection(doc.nodes.filter((node) => node.parentId === null && node.visible).map((node) => node.id)))}>
          <SquareDashed size={14} /><span>Выбрать всё</span><kbd>⌘A</kbd>
        </button>
        <button disabled={!hasSelection} onClick={() => run(onFitSelection)}><Maximize2 size={14} /><span>Вписать выделение</span><kbd>⇧2</kbd></button>
        <button onClick={() => run(onCreateFrame)}><Frame size={14} /><span>Создать фрейм здесь</span><kbd>F</kbd></button>
        <div className="popover-divider" />
        <button className="context-danger" disabled={!hasSelection} onClick={() => run(deleteSelection)}><Trash2 size={14} /><span>Удалить</span><kbd>⌫</kbd></button>
      </div>
    </>
  );
}
