import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  Files,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { getActivePageId, getDocumentPages } from '../utils/pages';

function InlineName({ value, label, onCommit }: { value: string; label: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  return (
    <input
      className="page-name-input" value={draft} aria-label={label} autoFocus
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => { if (!cancelled.current) onCommit(draft); }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          cancelled.current = true;
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

export function PagesPanel() {
  const doc = useEditorStore((state) => state.doc);
  const setActivePage = useEditorStore((state) => state.setActivePage);
  const addPage = useEditorStore((state) => state.addPage);
  const duplicatePage = useEditorStore((state) => state.duplicatePage);
  const renamePage = useEditorStore((state) => state.renamePage);
  const deletePage = useEditorStore((state) => state.deletePage);
  const movePage = useEditorStore((state) => state.movePage);
  const movePageTo = useEditorStore((state) => state.movePageTo);
  const [expanded, setExpanded] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);
  const [pendingPageId, setPendingPageId] = useState<string | null>(null);
  const switchFramesRef = useRef<number[]>([]);
  const pages = getDocumentPages(doc);
  const activePageId = getActivePageId(doc);
  const displayedActivePageId = pendingPageId ?? activePageId;
  const menuPageIndex = menu ? pages.findIndex((page) => page.id === menu.pageId) : -1;

  const selectPage = (pageId: string) => {
    switchFramesRef.current.forEach((frame) => cancelAnimationFrame(frame));
    switchFramesRef.current = [];
    if (pageId === activePageId) {
      setPendingPageId(null);
      return;
    }
    // Paint the selected row before React starts projecting and rendering the
    // destination page. Two frames separate this light UI commit from WebGL work.
    setPendingPageId(pageId);
    const first = requestAnimationFrame(() => {
      const second = requestAnimationFrame(() => setActivePage(pageId));
      switchFramesRef.current = [second];
    });
    switchFramesRef.current = [first];
  };

  const runMenuAction = (action: () => void) => {
    action();
    setMenu(null);
  };

  useEffect(() => setPendingPageId(null), [activePageId]);
  useEffect(() => () => {
    switchFramesRef.current.forEach((frame) => cancelAnimationFrame(frame));
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setMenu(null);
    };
    window.addEventListener('keydown', close, true);
    return () => window.removeEventListener('keydown', close, true);
  }, [menu]);

  return (
    <section className={`pages-panel${expanded ? ' is-expanded' : ''}`}>
      <header className="pages-header">
        <button className="pages-disclosure" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Files size={14} /><span>Страницы</span><span className="page-count-badge">{pages.length}</span>
        </button>
        <div className="pages-header-actions">
          <button title="Новая страница" aria-label="Новая страница" onClick={() => addPage()}><Plus size={15} /></button>
        </div>
      </header>
      {expanded && (
        <div className="pages-list">
          {pages.map((page) => (
            <div
              key={page.id}
              className={`page-row${page.id === displayedActivePageId ? ' is-active' : ''}`}
              data-page-id={page.id}
              aria-current={page.id === displayedActivePageId ? 'page' : undefined}
              draggable={renamingId !== page.id}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('application/x-malewich-page', page.id);
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes('application/x-malewich-page')) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const pageId = event.dataTransfer.getData('application/x-malewich-page');
                if (pageId) movePageTo(pageId, page.id);
              }}
              onClick={() => selectPage(page.id)}
              onDoubleClick={() => setRenamingId(page.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                selectPage(page.id);
                setMenu({
                  pageId: page.id,
                  x: Math.min(event.clientX, window.innerWidth - 238),
                  y: Math.min(event.clientY, window.innerHeight - 270),
                });
              }}
            >
              <File size={13} className="page-row-icon" />
              {renamingId === page.id ? (
                <InlineName value={page.name} label="Название страницы" onCommit={(name) => {
                  renamePage(page.id, name);
                  setRenamingId(null);
                }} />
              ) : <div className="page-row-label"><span>{page.name}</span></div>}
              <div className="page-row-actions">
                <button title="Дублировать страницу" onClick={(event) => { event.stopPropagation(); duplicatePage(page.id); }}><Copy size={12} /></button>
                <button title="Удалить страницу" disabled={pages.length === 1} onClick={(event) => { event.stopPropagation(); deletePage(page.id); }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {menu && (
        <>
          <button className="popover-dismiss" aria-label="Закрыть меню страницы" onPointerDown={() => setMenu(null)} onContextMenu={(event) => event.preventDefault()} />
          <div
            className="canvas-context-menu page-context-menu popover" role="menu"
            style={{ left: menu.x, top: menu.y }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <button onClick={() => runMenuAction(() => setRenamingId(menu.pageId))}><Pencil size={14} /><span>Переименовать</span></button>
            <button onClick={() => runMenuAction(() => duplicatePage(menu.pageId))}><Copy size={14} /><span>Дублировать страницу</span></button>
            <div className="popover-divider" />
            <button disabled={menuPageIndex <= 0} onClick={() => runMenuAction(() => movePage(menu.pageId, 'up'))}><ArrowUp size={14} /><span>Переместить выше</span></button>
            <button disabled={menuPageIndex < 0 || menuPageIndex === pages.length - 1} onClick={() => runMenuAction(() => movePage(menu.pageId, 'down'))}><ArrowDown size={14} /><span>Переместить ниже</span></button>
            <div className="popover-divider" />
            <button className="context-danger" disabled={pages.length === 1} onClick={() => runMenuAction(() => deletePage(menu.pageId))}><Trash2 size={14} /><span>Удалить страницу</span></button>
          </div>
        </>
      )}
    </section>
  );
}
