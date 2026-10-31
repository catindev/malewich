import { useEffect, useRef, useState } from 'react';
import { EditorCanvas } from './components/EditorCanvas';
import { Inspector } from './components/Inspector';
import { LayersPanel } from './components/LayersPanel';
import { Toolbar } from './components/Toolbar';
import { useEditorStore } from './store/editorStore';
import type { Tool } from './types';
import { hydrateStoredDocument, saveDocument } from './utils/storage';
import { getPageRoots } from './utils/pages';

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

const toolShortcuts: Record<string, Tool> = {
  v: 'select', h: 'hand', f: 'frame', r: 'rectangle', o: 'ellipse', l: 'line', t: 'text', i: 'image',
};

export default function App() {
  const doc = useEditorStore((state) => state.doc);
  const setSaveState = useEditorStore((state) => state.setSaveState);
  const initialDocRef = useRef(doc);
  const [storageReady, setStorageReady] = useState(false);
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('malewich:theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      ?.setAttribute('href', theme === 'dark' ? '/favicon-dark.svg' : '/favicon.svg');
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#202021' : '#ffffff');
    localStorage.setItem('malewich:theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    void hydrateStoredDocument().then((stored) => {
      if (!active) return;
      if (stored && useEditorStore.getState().doc.updatedAt === initialDocRef.current.updatedAt) {
        useEditorStore.getState().loadDocument(stored);
      }
      setStorageReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    let active = true;
    setSaveState('saving');
    const timeout = window.setTimeout(() => {
      void saveDocument(doc).then((success) => {
        if (active) setSaveState(success ? 'saved' : 'error');
      });
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [doc, setSaveState, storageReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || document.querySelector('.prototype-overlay')) return;
      const state = useEditorStore.getState();
      const command = event.metaKey || event.ctrlKey;
      if (command && (event.code === 'Backslash' || event.key === '\\')) {
        event.preventDefault();
        setPanelsVisible((visible) => !visible);
        return;
      }
      const key = event.code.startsWith('Key')
        ? event.code.slice(3).toLowerCase()
        : event.key.toLowerCase();
      if (command && event.shiftKey && key === 'k') {
        event.preventDefault();
        state.setTool('image');
        return;
      }
      if (command && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) state.redo(); else state.undo();
        return;
      }
      if (command && key === 'y') {
        event.preventDefault();
        state.redo();
        return;
      }
      if (command && key === 'g') {
        event.preventDefault();
        state.groupSelection(event.shiftKey);
        return;
      }
      if (command && event.shiftKey && key === 'r') {
        event.preventDefault();
        state.pasteClipboard(true);
        return;
      }
      if (command && key === 'd') {
        event.preventDefault();
        state.duplicateSelection();
        return;
      }
      if (command && key === 'c') {
        event.preventDefault();
        state.copySelection();
        return;
      }
      if (command && key === 'x') {
        event.preventDefault();
        state.copySelection(true);
        return;
      }
      if (command && key === 'v') {
        event.preventDefault();
        state.pasteClipboard();
        return;
      }
      if (command && key === 'a') {
        event.preventDefault();
        state.setSelection(getPageRoots(state.doc).filter((node) => node.visible).map((node) => node.id));
        return;
      }
      if (!command && !event.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const distance = event.shiftKey ? 10 : 1;
        if (event.key === 'ArrowLeft') state.nudgeSelection(-distance, 0);
        if (event.key === 'ArrowRight') state.nudgeSelection(distance, 0);
        if (event.key === 'ArrowUp') state.nudgeSelection(0, -distance);
        if (event.key === 'ArrowDown') state.nudgeSelection(0, distance);
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        state.deleteSelection();
        return;
      }
      if (event.key === 'Escape') {
        // Let the topmost temporary UI layer consume Escape first. Its own
        // window listener closes it and returns focus without deselecting the canvas.
        if (document.querySelector('.popover, .canvas-context-menu')) return;
        state.setSelection([]);
        state.setTool('select');
        return;
      }
      if (!command && !event.altKey && selectionIsSingle(state.selection)) {
        if (event.code === 'BracketRight' || event.key === ']') {
          event.preventDefault();
          state.reorder(state.selection[0], 'up');
          return;
        }
        if (event.code === 'BracketLeft' || event.key === '[') {
          event.preventDefault();
          state.reorder(state.selection[0], 'down');
          return;
        }
      }
      if (!command && !event.altKey && event.shiftKey && key === 'l') {
        event.preventDefault();
        state.setTool('arrow');
        return;
      }
      if (!command && !event.altKey && toolShortcuts[key]) {
        event.preventDefault();
        state.setTool(toolShortcuts[key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <main className={`workspace${panelsVisible ? '' : ' is-panel-hidden'}`}>
        <Toolbar hidden={!panelsVisible} />
        <LayersPanel
          hidden={!panelsVisible} panelsVisible={panelsVisible}
          onTogglePanels={() => setPanelsVisible((visible) => !visible)}
        />
        <EditorCanvas />
        <Inspector
          hidden={!panelsVisible} theme={theme}
          onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        />
      </main>
    </div>
  );
}

function selectionIsSingle(selection: string[]): boolean {
  return selection.length === 1;
}
