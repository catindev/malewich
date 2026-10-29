import { useState } from 'react';
import {
  Circle,
  CircleHelp,
  Frame,
  Hand,
  Image as ImageIcon,
  MousePointer2,
  Square,
  Type,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import type { Tool } from '../types';

const tools: { id: Tool; label: string; shortcut: string; icon: typeof Frame }[] = [
  { id: 'select', label: 'Выделение', shortcut: 'V', icon: MousePointer2 },
  { id: 'hand', label: 'Рука', shortcut: 'H', icon: Hand },
  { id: 'frame', label: 'Фрейм', shortcut: 'F', icon: Frame },
  { id: 'rectangle', label: 'Прямоугольник', shortcut: 'R', icon: Square },
  { id: 'ellipse', label: 'Эллипс', shortcut: 'O', icon: Circle },
  { id: 'text', label: 'Текст', shortcut: 'T', icon: Type },
  { id: 'image', label: 'Изображение', shortcut: 'I', icon: ImageIcon },
];

export function Toolbar() {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <nav className="tool-rail" aria-label="Инструменты">
      <div className="tool-rail-main">
        {tools.map(({ id, label, shortcut, icon: Icon }, index) => (
          <div key={id} className={index === 2 || index === 5 ? 'tool-group-start' : ''}>
            <button
              className={`tool-button${tool === id ? ' is-active' : ''}`}
              onClick={() => setTool(id)}
              title={`${label} (${shortcut})`}
              aria-label={label}
              aria-pressed={tool === id}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span className="tool-tooltip">{label}<kbd>{shortcut}</kbd></span>
            </button>
          </div>
        ))}
      </div>
      <div className="tool-rail-bottom">
        <button className="tool-button" title="Горячие клавиши" onClick={() => setHelpOpen(!helpOpen)}>
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
