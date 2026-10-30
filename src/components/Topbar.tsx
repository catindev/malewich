import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  FileJson,
  FilePlus2,
  FolderOpen,
  HardDrive,
  LoaderCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Redo2,
  Sun,
  Undo2,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { exportJson } from '../utils/export';
import { getNode, getNodeBounds } from '../utils/document';
import { isDesignDocument } from '../utils/storage';
import { PrototypePlayer } from './PrototypePlayer';
import { usePageDocument } from '../hooks/usePageDocument';
import { BrandMark } from './BrandMark';

interface ProjectControlsProps {
  panelsVisible: boolean;
  onTogglePanels: () => void;
}

export function ProjectControls({ panelsVisible, onTogglePanels }: ProjectControlsProps) {
  const doc = usePageDocument();
  const saveState = useEditorStore((state) => state.saveState);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const newDocument = useEditorStore((state) => state.newDocument);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const [menuOpen, setMenuOpen] = useState(false);
  const [title, setTitle] = useState(doc.name);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTitle(doc.name), [doc.name]);

  const importDocument = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      if (file.name.toLowerCase().endsWith('.fig')) {
        const { importFigmaDocument } = await import('../utils/figmaImport');
        loadDocument(importFigmaDocument(await file.arrayBuffer(), file.name));
      } else {
        const parsed: unknown = JSON.parse(await file.text());
        if (!isDesignDocument(parsed)) throw new Error('Это не проект «Малевич» версии 1.');
        loadDocument(parsed);
      }
      setMenuOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Не удалось открыть файл');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="project-controls">
      <div className="project-controls-main">
        <div className="file-menu-wrap">
          <button className="brand" onClick={() => setMenuOpen(!menuOpen)} aria-label="Меню проекта">
            <BrandMark />
            <span className="brand-name">Малевич</span>
            <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <div className="topbar-menu popover">
              <button onClick={() => {
                if (doc.nodes.length === 0 || window.confirm('Создать новый проект? Текущий проект сохранён только в этом браузере — при необходимости сначала экспортируйте JSON.')) {
                  newDocument();
                  setMenuOpen(false);
                }
              }}><FilePlus2 size={16} /><span>Новый проект</span></button>
              <button disabled={importing} onClick={() => importRef.current?.click()}><FolderOpen size={16} /><span>{importing ? 'Импорт Figma…' : 'Открыть .fig / JSON…'}</span></button>
              <div className="popover-divider" />
              <button onClick={() => { exportJson(doc); setMenuOpen(false); }}><FileJson size={16} /><span>Сохранить копию</span></button>
            </div>
          )}
        </div>
        <button
          className="topbar-icon-button project-panel-toggle"
          title={panelsVisible ? 'Скрыть панели (⌘\\)' : 'Показать панели (⌘\\)'}
          aria-pressed={!panelsVisible} onClick={onTogglePanels}
        >{panelsVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}</button>
      </div>
      <div className="project-title-row">
        <input
          className="document-title" value={title} aria-label="Название проекта"
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => renameDocument(title)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setTitle(doc.name);
              event.currentTarget.blur();
            }
          }}
        />
        <div className={`save-indicator is-${saveState}`}>
          {saveState === 'saving' ? <LoaderCircle size={12} className="spin" /> : saveState === 'saved' ? <Check size={12} /> : <HardDrive size={12} />}
          <span>{saveState === 'saving' ? 'Сохранение…' : saveState === 'saved' ? 'Сохранено локально' : 'Не удалось сохранить'}</span>
        </div>
      </div>
      {menuOpen && <button className="popover-dismiss" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню" />}
      <input
        ref={importRef} type="file" accept=".fig,.json,.malewich.json" hidden
        onChange={(event) => {
          void importDocument(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}

interface ActionControlsProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function ActionControls({ theme, onToggleTheme }: ActionControlsProps) {
  const doc = usePageDocument();
  const selection = useEditorStore((state) => state.selection);
  const viewport = useEditorStore((state) => state.viewport);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const [previewFrameId, setPreviewFrameId] = useState<string | null>(null);

  const rootFrames = doc.nodes.filter((node) => node.type === 'frame' && node.parentId === null);
  const openPreview = () => {
    let selectedFrame: string | undefined;
    for (const id of selection) {
      let current = getNode(doc, id);
      while (current) {
        if (current.type === 'frame' && current.parentId === null) {
          selectedFrame = current.id;
          break;
        }
        current = getNode(doc, current.parentId);
      }
      if (selectedFrame) break;
    }
    const canvasRect = document.querySelector('.canvas-viewport')?.getBoundingClientRect();
    let visibleFrame: { id: string; area: number } | undefined;
    if (canvasRect) {
      const left = -viewport.x / viewport.zoom;
      const top = -viewport.y / viewport.zoom;
      const right = left + canvasRect.width / viewport.zoom;
      const bottom = top + canvasRect.height / viewport.zoom;
      for (const frame of rootFrames) {
        const bounds = getNodeBounds(doc, frame);
        const area = Math.max(0, Math.min(right, bounds.x + bounds.width) - Math.max(left, bounds.x)) *
          Math.max(0, Math.min(bottom, bounds.y + bounds.height) - Math.max(top, bounds.y));
        if (area > (visibleFrame?.area ?? 0)) visibleFrame = { id: frame.id, area };
      }
    }
    const frameId = selectedFrame ?? visibleFrame?.id ?? rootFrames[0]?.id;
    if (frameId) setPreviewFrameId(frameId);
  };

  return (
    <div className="action-controls">
      <button className="preview-button" disabled={rootFrames.length === 0} onClick={openPreview}><Play size={14} fill="currentColor" /> Презентация</button>
      <div className="action-controls-icons">
        <div className="history-controls">
          <button title="Отменить (⌘Z)" disabled={past.length === 0} onClick={undo}><Undo2 size={16} /></button>
          <button title="Повторить (⇧⌘Z)" disabled={future.length === 0} onClick={redo}><Redo2 size={16} /></button>
        </div>
        <button
          className="topbar-icon-button" title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          aria-pressed={theme === 'dark'} onClick={onToggleTheme}
        >{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
      </div>
      {previewFrameId && <PrototypePlayer doc={doc} initialFrameId={previewFrameId} onClose={() => setPreviewFrameId(null)} />}
    </div>
  );
}
