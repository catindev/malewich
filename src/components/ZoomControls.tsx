import { useEffect, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { fitViewportToContent, fitViewportToSelection, zoomViewportAt } from '../utils/viewport';

export function ZoomControls() {
  const viewport = useEditorStore((state) => state.viewport);
  const setViewport = useEditorStore((state) => state.setViewport);
  const selection = useEditorStore((state) => state.selection);
  const [menuOpen, setMenuOpen] = useState(false);
  const zoomPercent = Math.round(viewport.zoom * 100);

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

  const zoomTo = (nextZoom: number) => {
    const rect = document.querySelector('.canvas-viewport')?.getBoundingClientRect();
    if (!rect) return;
    setViewport(zoomViewportAt(viewport, nextZoom, { x: rect.width / 2, y: rect.height / 2 }));
    setMenuOpen(false);
  };
  const fitToContent = () => {
    const state = useEditorStore.getState();
    const rect = document.querySelector('.canvas-viewport')?.getBoundingClientRect();
    if (!rect) return;
    setViewport(fitViewportToContent(state.doc, rect));
    setMenuOpen(false);
  };
  const fitSelection = () => {
    const state = useEditorStore.getState();
    const rect = document.querySelector('.canvas-viewport')?.getBoundingClientRect();
    if (!rect) return;
    setViewport(fitViewportToSelection(state.doc, selection, rect));
    setMenuOpen(false);
  };

  return (
    <div className="zoom-controls">
      <span className="zoom-label">масштаб</span>
      <button title="Уменьшить" onClick={() => zoomTo(viewport.zoom / 1.2)}><Minus size={14} /></button>
      <div className="zoom-select">
        <button className="zoom-value" onClick={() => setMenuOpen(!menuOpen)}>{zoomPercent}%</button>
        {menuOpen && (
          <div className="zoom-menu popover">
            {[25, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600].map((value) => (
              <button key={value} onClick={() => zoomTo(value / 100)}>{value}%</button>
            ))}
            <div className="popover-divider" />
            <button onClick={fitToContent}>Вписать в экран <kbd>⇧1</kbd></button>
            <button onClick={fitSelection} disabled={selection.length === 0}>Вписать выделение <kbd>⇧2</kbd></button>
            <button onClick={() => zoomTo(1)}>Масштаб 100% <kbd>0</kbd></button>
          </div>
        )}
      </div>
      <button title="Увеличить" onClick={() => zoomTo(viewport.zoom * 1.2)}><Plus size={14} /></button>
      <button title="Вписать в экран" onClick={fitToContent}><RotateCcw size={14} /></button>
    </div>
  );
}
