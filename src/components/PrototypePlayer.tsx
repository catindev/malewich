import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { DesignDocument } from '../types';
import { getNodeBounds, getWorldMatrix } from '../utils/document';
import { SceneNode } from './SceneNode';

interface PrototypePlayerProps {
  doc: DesignDocument;
  initialFrameId: string;
  onClose: () => void;
}

export function PrototypePlayer({ doc, initialFrameId, onClose }: PrototypePlayerProps) {
  const [currentFrameId, setCurrentFrameId] = useState(initialFrameId);
  const [history, setHistory] = useState<string[]>([]);
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const currentFrame = doc.nodes.find((node) => node.id === currentFrameId);
  const rootFrames = doc.nodes.filter((node) => node.type === 'frame' && node.parentId === null);
  const link = doc.prototypeLinks?.find((item) => item.sourceFrameId === currentFrameId);
  const bounds = currentFrame ? getNodeBounds(doc, currentFrame) : null;
  const scale = bounds && stageSize
    ? Math.min(stageSize.width / Math.max(1, bounds.width), stageSize.height / Math.max(1, bounds.height))
    : 1;
  const displayWidth = Math.max(1, (bounds?.width ?? 1) * scale);
  const displayHeight = Math.max(1, (bounds?.height ?? 1) * scale);

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
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const rect = stage.getBoundingClientRect();
      setStageSize({ width: Math.max(1, rect.width - 80), height: Math.max(1, rect.height - 80) });
    };
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    update();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!currentFrame || !bounds) return null;
  return (
    <div className="prototype-overlay" role="dialog" aria-modal="true" aria-label="Предпросмотр прототипа" onContextMenu={(event) => event.preventDefault()}>
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
      <div className="prototype-stage" ref={stageRef}>
        <svg
          key={currentFrameId}
          className={`prototype-frame is-${link?.transition ?? 'instant'}`}
          viewBox={`${bounds.x} ${bounds.y} ${Math.max(1, bounds.width)} ${Math.max(1, bounds.height)}`}
          width={displayWidth} height={displayHeight}
          preserveAspectRatio="xMidYMid meet"
          role="img" aria-label={currentFrame.name}
          style={{ animationDuration: `${link?.duration ?? 0}ms`, width: displayWidth, height: displayHeight }}
          onClick={goNext}
        >
          <SceneNode
            doc={doc} node={currentFrame} worldTransform={getWorldMatrix(doc, currentFrame)}
            onNodePointerDown={() => {}} onTextDoubleClick={() => {}} onNodeContextMenu={() => {}}
          />
        </svg>
      </div>
      <footer className="prototype-footer">
        {link ? 'Кликните по макету или «Дальше», чтобы перейти по связи' : 'У этого фрейма нет исходящей связи'}
      </footer>
    </div>
  );
}
