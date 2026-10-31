import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Circle,
  CircleHelp,
  Frame,
  Hand,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  Square,
  Star as StarIcon,
  Triangle,
  Type,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import type { Tool } from '../types';

interface ToolDefinition {
  id: Tool;
  label: string;
  shortcut?: string;
  menuLabel?: string;
  menuShortcut?: string;
  icon: typeof Frame;
}

const primaryTools: ToolDefinition[] = [
  { id: 'select', label: 'Выделение', shortcut: 'V', icon: MousePointer2 },
  { id: 'hand', label: 'Рука', shortcut: 'H', icon: Hand },
  { id: 'frame', label: 'Фрейм', shortcut: 'F', icon: Frame },
];

const shapeTools: ToolDefinition[] = [
  { id: 'rectangle', label: 'Прямоугольник', shortcut: 'R', icon: Square },
  { id: 'line', label: 'Линия', shortcut: 'L', icon: Minus },
  { id: 'arrow', label: 'Стрелка', shortcut: '⇧L', icon: ArrowUpRight },
  { id: 'ellipse', label: 'Эллипс', shortcut: 'O', icon: Circle },
  { id: 'polygon', label: 'Многоугольник', icon: Triangle },
  { id: 'star', label: 'Звезда', icon: StarIcon },
  { id: 'image', label: 'Изображение', menuLabel: 'Изображение…', shortcut: 'I', menuShortcut: '⇧⌘K', icon: ImageIcon },
];

const secondaryTools: ToolDefinition[] = [
  { id: 'text', label: 'Текст', shortcut: 'T', icon: Type },
];

export function Toolbar({ hidden = false }: { hidden?: boolean }) {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [lastShapeId, setLastShapeId] = useState<Tool>('rectangle');
  const selectedShape = shapeTools.find((candidate) => candidate.id === tool);
  const currentShape = shapeTools.find((candidate) => candidate.id === lastShapeId) ?? shapeTools[0];
  const CurrentShapeIcon = currentShape.icon;

  useEffect(() => {
    if (selectedShape) setLastShapeId(selectedShape.id);
  }, [selectedShape]);

  useEffect(() => {
    if (!helpOpen && !shapeMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setHelpOpen(false);
      setShapeMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [helpOpen, shapeMenuOpen]);

  const renderTool = ({ id, label, shortcut, icon: Icon }: ToolDefinition) => (
    <button
      key={id}
      className={`tool-button${tool === id ? ' is-active' : ''}`}
      onClick={() => setTool(id)}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={tool === id}
    >
      <Icon size={19} strokeWidth={1.7} />
      <span className="tool-tooltip">{label}{shortcut && <kbd>{shortcut}</kbd>}</span>
    </button>
  );

  return (
    <nav className="tool-rail" aria-label="Инструменты" hidden={hidden}>
      <div className="tool-rail-main">
        {primaryTools.map(renderTool)}
        <div className="tool-group-start shape-tool-wrap">
          <button
            className={`tool-button${tool === currentShape.id ? ' is-active' : ''}`}
            onClick={() => setTool(currentShape.id)}
            title={currentShape.shortcut ? `${currentShape.label} (${currentShape.shortcut})` : currentShape.label}
            aria-label={currentShape.label}
            aria-pressed={tool === currentShape.id}
          >
            <CurrentShapeIcon size={19} strokeWidth={1.7} />
            <span className="tool-tooltip">
              {currentShape.label}{currentShape.shortcut && <kbd>{currentShape.shortcut}</kbd>}
            </span>
          </button>
          <button
            className="shape-menu-toggle" aria-label="Выбрать фигуру" title="Другие фигуры"
            aria-expanded={shapeMenuOpen}
            onClick={() => { setShapeMenuOpen(!shapeMenuOpen); setHelpOpen(false); }}
          ><ChevronDown size={10} /></button>
          {shapeMenuOpen && (
            <>
              <button className="popover-dismiss" aria-label="Закрыть" onClick={() => setShapeMenuOpen(false)} />
              <div className="shape-tools-popover popover" role="menu" aria-label="Фигуры">
                {shapeTools.map(({ id, label, menuLabel, shortcut, menuShortcut, icon: Icon }) => (
                  <button
                    key={id} role="menuitemradio" aria-checked={tool === id}
                    onClick={() => { setTool(id); setShapeMenuOpen(false); }}
                  >
                    <Icon size={16} strokeWidth={1.7} /><span>{menuLabel ?? label}</span>
                    {(menuShortcut ?? shortcut) && <kbd>{menuShortcut ?? shortcut}</kbd>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {secondaryTools.map(renderTool)}
      </div>
      <div className="tool-rail-bottom">
        <button className="tool-button" title="Горячие клавиши" onClick={() => { setHelpOpen(!helpOpen); setShapeMenuOpen(false); }}>
          <CircleHelp size={19} strokeWidth={1.7} />
        </button>
        {helpOpen && (
          <>
            <button className="popover-dismiss" aria-label="Закрыть" onClick={() => setHelpOpen(false)} />
            <div className="shortcuts-popover popover">
              <div className="popover-title">Горячие клавиши</div>
              <div><span>Отменить / повторить</span><span><kbd>⌘ Z</kbd> <kbd>⇧⌘ Z</kbd></span></div>
              <div><span>Дублировать</span><kbd>⌘ D</kbd></div>
              <div><span>Копировать / вставить</span><span><kbd>⌘ C</kbd> <kbd>⌘ V</kbd></span></div>
              <div><span>Переместить объект</span><span><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></span></div>
              <div><span>Удалить</span><kbd>Delete</kbd></div>
              <div><span>Переместить холст</span><kbd>Space</kbd></div>
              <div><span>Пропорции / ось</span><kbd>Shift</kbd></div>
              <div><span>Вписать в экран / выделение</span><span><kbd>⇧ 1</kbd><kbd>⇧ 2</kbd></span></div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
