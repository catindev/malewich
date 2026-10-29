import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { DesignDocument } from '../types';
import { documentToSvg } from '../utils/export';

interface PrototypePlayerProps {
  doc: DesignDocument;
  initialFrameId: string;
  onClose: () => void;
}

export function PrototypePlayer({ doc, initialFrameId, onClose }: PrototypePlayerProps) {
  const [currentFrameId, setCurrentFrameId] = useState(initialFrameId);
  const [history, setHistory] = useState<string[]>([]);
  const currentFrame = doc.nodes.find((node) => node.id === currentFrameId);
  const rootFrames = doc.nodes.filter((node) => node.type === 'frame' && node.parentId === null);
  const link = doc.prototypeLinks?.find((item) => item.sourceFrameId === currentFrameId);
  const image = useMemo(() => {
    if (!currentFrame) return '';
    const { svg } = documentToSvg(doc, [currentFrameId]);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [doc, currentFrame, currentFrameId]);

  const goNext = () => {
    if (!link) return;
    setHistory((items) => [...items, currentFrameId]);
    setCurrentFrameId(link.targetFrameId);
  };
  const goBack = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setCurrentFrameId(previous);
    setHistory((items) => items.slice(0, -1));
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!currentFrame) return null;
  return (
    <div className="prototype-overlay" role="dialog" aria-label="Предпросмотр прототипа">
      <header className="prototype-topbar">
        <div className="prototype-title">
          <span className="prototype-status-dot" />
          <select aria-label="Экран презентации" value={currentFrameId} onChange={(event) => {
            setCurrentFrameId(event.target.value);
            setHistory([]);
          }}>
            {rootFrames.map((frame) => <option key={frame.id} value={frame.id}>{frame.name}</option>)}
          </select>
        </div>
        <div className="prototype-controls">
          <button disabled={history.length === 0} onClick={goBack}><ArrowLeft size={16} /> Назад</button>
          <button disabled={!link} onClick={goNext}>Дальше <ArrowRight size={16} /></button>
          <button aria-label="Закрыть предпросмотр" onClick={onClose}><X size={18} /></button>
        </div>
      </header>
      <div className="prototype-stage">
        {image && (
          <img
            key={currentFrameId} src={image} alt={currentFrame.name}
            className={`prototype-frame is-${link?.transition ?? 'instant'}`}
            style={{ animationDuration: `${link?.duration ?? 0}ms` }}
            onClick={goNext}
          />
        )}
      </div>
      <footer className="prototype-footer">
        {link ? 'Кликните по макету или «Дальше», чтобы перейти по связи' : 'У этого фрейма нет исходящей связи'}
      </footer>
    </div>
  );
}
