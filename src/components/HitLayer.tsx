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
      {flattenDocument(doc).filter((node) => node.visible).map((node) => (
        <rect
          key={node.id}
          data-node-id={node.id}
          className={`scene-node scene-node--${node.type}${node.locked ? ' is-locked' : ''}`}
          x={node.x} y={node.y} width={Math.max(0.01, node.width)} height={Math.max(0.01, node.height)}
          transform={matrixToString(getWorldMatrix(doc, node))}
          fill="transparent" stroke="none"
        />
      ))}
    </g>
  );
});
