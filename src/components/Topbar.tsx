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
import { importFigmaFile } from '../utils/figmaImportAsync';
import { PrototypePlayer } from './PrototypePlayer';
import { usePageDocument } from '../hooks/usePageDocument';
import { BrandMark } from './BrandMark';

interface ProjectControlsProps {
  panelsVisible: boolean;
  onTogglePanels: () => void;
}

interface ImportProgress {
  name: string;
  size: number;
}

const LARGE_FIG_SIZE = 8 * 1024 * 1024;
const fileSize = (size: number) => size >= 1024 * 1024
  ? `${(size / (1024 * 1024)).toFixed(1)} МБ`
  : `${Math.max(1, Math.ceil(size / 1024))} КБ`;

export function ProjectControls({ panelsVisible, onTogglePanels }: ProjectControlsProps) {
  // Project actions must use the full document, not the active-page projection.
  // The canvas-facing projection would silently drop all other pages from JSON backup.
  const doc = useEditorStore((state) => state.doc);
  const saveState = useEditorStore((state) => state.saveState);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const newDocument = useEditorStore((state) => state.newDocument);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const [menuOpen, setMenuOpen] = useState(false);
  const [title, setTitle] = useState(doc.name);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const importing = importProgress !== null;
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTitle(doc.name), [doc.name]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const importDocument = async (file: File | undefined) => {
    if (!file || importing) return;
    setImportProgress({ name: file.name, size: file.size });
    setMenuOpen(false);
    try {
      if (file.name.toLowerCase().endsWith('.fig')) {
        loadDocument(await importFigmaFile(file));
      } else {
        const parsed: unknown = JSON.parse(await file.text());
        if (!isDesignDocument(parsed)) throw new Error('Это не проект «Малевич» версии 1.');
        loadDocument(parsed);
      }
      setMenuOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Не удалось открыть файл');
    } finally {
      setImportProgress(null);
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
        ref={importRef} type="file" accept=".fig,.json,.malewich.json" hidden disabled={importing}
        onChange={(event) => {
          void importDocument(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {importProgress && (
        <div className="import-progress-backdrop">
          <div className="import-progress" role="status" aria-live="polite" aria-label={`Импорт ${importProgress.name}`}>
            <LoaderCircle size={28} className="spin" />
            <div className="import-progress-copy">
              <strong>{importProgress.size >= LARGE_FIG_SIZE ? 'Файл большой. Нужно время на загрузку' : 'Открываем документ'}</strong>
              <p>{importProgress.size >= LARGE_FIG_SIZE
                ? 'Декодирование выполняется в фоне. Не закрывайте вкладку.'
                : 'Подготавливаем редактируемые слои.'}</p>
              <span title={importProgress.name}>{importProgress.name} · {fileSize(importProgress.size)}</span>
            </div>
          </div>
        </div>
      )}
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
