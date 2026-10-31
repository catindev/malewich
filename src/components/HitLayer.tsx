import { memo } from 'react';
import type { DesignDocument } from '../types';
import { flattenDocument, getWorldMatrix } from '../utils/document';
import { matrixToString } from '../utils/geometry';

/**
 * Lightweight interaction semantics for the WebGL scene. One rect per layer replaces
 * the full SVG visual tree and also keeps canvas layers addressable by accessibility tools.
 */
export const HitLayer = memo(function HitLayer({ doc }: { doc: DesignDocument }) {
  return (
    <g className="hit-layer">
      {flattenDocument(doc).filter((node) => node.visible).map((node) => {
        const linePadding = node.type === 'line' || node.type === 'arrow' ? Math.max(8, node.strokeWidth) : 0;
        return (
          <rect
            key={node.id}
            data-node-id={node.id}
            className={`scene-node scene-node--${node.type}${node.locked ? ' is-locked' : ''}`}
            x={node.x - linePadding / 2} y={node.y - linePadding / 2}
            width={Math.max(0.01, node.width + linePadding)} height={Math.max(0.01, node.height + linePadding)}
            transform={matrixToString(getWorldMatrix(doc, node))}
            fill="transparent" stroke="none"
          />
        );
      })}
    </g>
  );
});
