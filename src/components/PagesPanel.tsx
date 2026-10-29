import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { getActivePageId, getDocumentPages, getPageNodeIds } from '../utils/pages';

function InlineName({ value, label, onCommit }: { value: string; label: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className="page-name-input" value={draft} aria-label={label} autoFocus
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
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
  const setPageGroup = useEditorStore((state) => state.setPageGroup);
  const addPageGroup = useEditorStore((state) => state.addPageGroup);
  const renamePageGroup = useEditorStore((state) => state.renamePageGroup);
  const deletePageGroup = useEditorStore((state) => state.deletePageGroup);
  const [expanded, setExpanded] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const pages = getDocumentPages(doc);
  const groups = doc.pageGroups ?? [];
  const activePageId = getActivePageId(doc);

  const pageRow = (page: (typeof pages)[number]) => {
    const count = getPageNodeIds(doc, page.id).size;
    return (
      <div
        key={page.id}
        className={`page-row${page.id === activePageId ? ' is-active' : ''}`}
        data-page-id={page.id}
        draggable={renamingId !== page.id}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('application/x-malewich-page', page.id);
        }}
        onClick={() => setActivePage(page.id)}
        onDoubleClick={() => setRenamingId(page.id)}
      >
        <File size={13} className="page-row-icon" />
        {renamingId === page.id ? (
          <InlineName value={page.name} label="Название страницы" onCommit={(name) => {
            renamePage(page.id, name);
            setRenamingId(null);
          }} />
        ) : (
          <div className="page-row-label"><span>{page.name}</span><small>{count} объектов</small></div>
        )}
        <div className="page-row-actions">
          <button title="Дублировать страницу" onClick={(event) => { event.stopPropagation(); duplicatePage(page.id); }}><Copy size={12} /></button>
          <button title="Удалить страницу" disabled={pages.length === 1} onClick={(event) => { event.stopPropagation(); deletePage(page.id); }}><Trash2 size={12} /></button>
        </div>
      </div>
    );
  };

  const dropPage = (event: React.DragEvent, groupId: string | null) => {
    event.preventDefault();
    const pageId = event.dataTransfer.getData('application/x-malewich-page');
    if (pageId) setPageGroup(pageId, groupId);
  };

  return (
    <section className={`pages-panel${expanded ? ' is-expanded' : ''}`}>
      <header className="pages-header">
        <button className="pages-disclosure" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Files size={14} /><span>Страницы</span><span className="page-count-badge">{pages.length}</span>
        </button>
        <div className="pages-header-actions">
          <button title="Новая группа страниц" onClick={() => addPageGroup()}><FolderPlus size={14} /></button>
          <button title="Новая страница" onClick={() => addPage()}><Plus size={15} /></button>
        </div>
      </header>
      {expanded && (
        <div className="pages-list">
          {groups.map((group) => {
            const groupPages = pages.filter((page) => page.groupId === group.id);
            const collapsed = collapsedGroups.has(group.id);
            return (
              <div className="page-group" key={group.id} data-page-group-id={group.id}>
                <div
                  className="page-group-header"
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(event) => dropPage(event, group.id)}
                >
                  <button onClick={() => {
                    const next = new Set(collapsedGroups);
                    if (collapsed) next.delete(group.id); else next.add(group.id);
                    setCollapsedGroups(next);
                  }}>
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    {collapsed ? <Folder size={13} /> : <FolderOpen size={13} />}
                  </button>
                  {renamingId === group.id ? (
                    <InlineName value={group.name} label="Название группы страниц" onCommit={(name) => {
                      renamePageGroup(group.id, name);
                      setRenamingId(null);
                    }} />
                  ) : <span onDoubleClick={() => setRenamingId(group.id)}>{group.name}</span>}
                  <div className="page-row-actions">
                    <button title="Добавить страницу в группу" onClick={() => addPage(undefined, group.id)}><Plus size={12} /></button>
                    <button title="Удалить группу, оставив страницы" onClick={() => deletePageGroup(group.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
                {!collapsed && (
                  <div className="page-group-pages">
                    {groupPages.length ? groupPages.map(pageRow) : <div className="page-group-empty">Перетащите страницу сюда</div>}
                  </div>
                )}
              </div>
            );
          })}
          {groups.length > 0 && pages.some((page) => !page.groupId) && (
            <div
              className="pages-ungrouped-label"
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
              onDrop={(event) => dropPage(event, null)}
            ><Check size={11} /> Без группы</div>
          )}
          {pages.filter((page) => !page.groupId || !groups.some((group) => group.id === page.groupId)).map(pageRow)}
        </div>
      )}
    </section>
  );
}
