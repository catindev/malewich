import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  FileImage,
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
import { exportJson, exportPng, exportSvg } from '../utils/export';
import { getNode, getNodeBounds } from '../utils/document';
import { isDesignDocument } from '../utils/storage';
import { PrototypePlayer } from './PrototypePlayer';
import { usePageDocument } from '../hooks/usePageDocument';

interface TopbarProps {
  theme: 'light' | 'dark';
  panelsVisible: boolean;
  onToggleTheme: () => void;
  onTogglePanels: () => void;
}

export function Topbar({ theme, panelsVisible, onToggleTheme, onTogglePanels }: TopbarProps) {
  const doc = usePageDocument();
  const selection = useEditorStore((state) => state.selection);
  const viewport = useEditorStore((state) => state.viewport);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const saveState = useEditorStore((state) => state.saveState);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const newDocument = useEditorStore((state) => state.newDocument);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const [menu, setMenu] = useState<'file' | 'export' | null>(null);
  const [title, setTitle] = useState(doc.name);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewFrameId, setPreviewFrameId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTitle(doc.name), [doc.name]);

  const runPngExport = async () => {
    setExporting(true);
    setMenu(null);
    try {
      await exportPng(doc, selection);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Не удалось экспортировать PNG');
    } finally {
      setExporting(false);
    }
  };

  const importDocument = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      if (file.name.toLowerCase().endsWith('.fig')) {
        const { importFigmaDocument } = await import('../utils/figmaImport');
        loadDocument(importFigmaDocument(await file.arrayBuffer(), file.name));
      } else {
        const parsed: unknown = JSON.parse(await file.text());
        if (!isDesignDocument(parsed)) throw new Error('Это не проект Malewich версии 1.');
        loadDocument(parsed);
      }
      setMenu(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Не удалось открыть файл');
    } finally {
      setImporting(false);
    }
  };

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
    <header className="topbar">
      <div className="topbar-left">
        <div className="file-menu-wrap">
          <button className="brand" onClick={() => setMenu(menu === 'file' ? null : 'file')} aria-label="Меню проекта">
            <span className="brand-mark"><i /><i /><i /></span>
            <span className="brand-name">malewich</span>
            <ChevronDown size={13} />
          </button>
          {menu === 'file' && (
            <div className="topbar-menu popover">
              <button onClick={() => {
                if (doc.nodes.length === 0 || window.confirm('Создать новый проект? Текущий проект сохранён только в этом браузере — при необходимости сначала экспортируйте JSON.')) {
                  newDocument();
                  setMenu(null);
                }
              }}><FilePlus2 size={16} /><span>Новый проект</span></button>
              <button disabled={importing} onClick={() => importRef.current?.click()}><FolderOpen size={16} /><span>{importing ? 'Импорт Figma…' : 'Открыть .fig / JSON…'}</span></button>
              <div className="popover-divider" />
              <button onClick={() => { exportJson(doc); setMenu(null); }}><FileJson size={16} /><span>Сохранить копию</span></button>
            </div>
          )}
        </div>
        <span className="topbar-divider" />
        <div className="document-title-wrap">
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
      </div>
      <div className="history-controls">
        <button title="Отменить (⌘Z)" disabled={past.length === 0} onClick={undo}><Undo2 size={17} /></button>
        <button title="Повторить (⇧⌘Z)" disabled={future.length === 0} onClick={redo}><Redo2 size={17} /></button>
      </div>
      <div className="topbar-right">
        <button
          className="topbar-icon-button" title={panelsVisible ? 'Скрыть панели (⌘\\)' : 'Показать панели (⌘\\)'}
          aria-pressed={!panelsVisible} onClick={onTogglePanels}
        >{panelsVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}</button>
        <button
          className="topbar-icon-button" title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          aria-pressed={theme === 'dark'} onClick={onToggleTheme}
        >{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button className="preview-button" disabled={rootFrames.length === 0} onClick={openPreview}><Play size={14} fill="currentColor" /> Презентация</button>
        <span className="local-badge"><HardDrive size={13} /> Локальный MVP</span>
        <div className="export-menu-wrap">
          <button className="export-button" disabled={exporting || doc.nodes.length === 0} onClick={() => setMenu(menu === 'export' ? null : 'export')}>
            {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
            <span>Экспорт</span><ChevronDown size={13} />
          </button>
          {menu === 'export' && (
            <div className="topbar-menu export-menu popover">
              <div className="popover-title">{selection.length ? 'Экспорт выбранного' : 'Экспорт всего макета'}</div>
              <button onClick={runPngExport}><FileImage size={16} /><span>PNG</span><small>до 3×</small></button>
              <button onClick={() => { exportSvg(doc, selection); setMenu(null); }}><FileImage size={16} /><span>SVG</span><small>вектор</small></button>
              <div className="popover-divider" />
              <button onClick={() => { exportJson(doc); setMenu(null); }}><FileJson size={16} /><span>Проект JSON</span></button>
            </div>
          )}
        </div>
      </div>
      {menu && <button className="popover-dismiss" onClick={() => setMenu(null)} aria-label="Закрыть меню" />}
      <input
        ref={importRef} type="file" accept=".fig,.json,.forma.json,.malewich.json" hidden
        onChange={(event) => {
          void importDocument(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {previewFrameId && <PrototypePlayer doc={doc} initialFrameId={previewFrameId} onClose={() => setPreviewFrameId(null)} />}
    </header>
  );
}
