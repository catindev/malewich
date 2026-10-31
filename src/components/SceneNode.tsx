import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { DesignDocument, EditorNode, Matrix } from '../types';
import { getChildren } from '../utils/document';
import { matrixToString, nodeMatrix } from '../utils/geometry';
import { fontFamilyWithFallback, getTextLines } from '../utils/text';
import { fillReference, gradientId, svgGradientTransform } from '../utils/paints';
import { vectorScale } from '../utils/rendering';

interface SceneNodeProps {
  doc: DesignDocument;
  node: EditorNode;
  onNodePointerDown: (event: ReactPointerEvent<SVGGElement>, node: EditorNode) => void;
  onTextDoubleClick: (event: ReactMouseEvent<SVGGElement>, node: EditorNode) => void;
  onNodeContextMenu: (event: ReactMouseEvent<SVGGElement>, node: EditorNode) => void;
  editingId?: string | null;
  suppressedIds?: Set<string>;
  worldTransform?: Matrix;
}

function GradientDefinition({ node }: { node: EditorNode }) {
  const gradient = node.fillGradient;
  if (!gradient) return null;
  const stops = gradient.stops.map((stop, index) => (
    <stop key={index} offset={stop.position} stopColor={stop.color} />
  ));
  return (
    <defs>
      {gradient.type === 'linear' ? (
        <linearGradient
          id={gradientId(node)} gradientUnits="objectBoundingBox"
          x1={0} y1={0.5} x2={1} y2={0.5} gradientTransform={svgGradientTransform(gradient.transform)}
        >{stops}</linearGradient>
      ) : (
        <radialGradient
          id={gradientId(node)} gradientUnits="objectBoundingBox"
          cx={0.5} cy={0.5} r={0.5} gradientTransform={svgGradientTransform(gradient.transform)}
        >{stops}</radialGradient>
      )}
    </defs>
  );
}

function TextContent({ node }: { node: Extract<EditorNode, { type: 'text' }> }) {
  const lines = getTextLines(node);
  const clipId = `text-clip-${node.id}`;
  const x = node.textAlign === 'center'
    ? node.x + node.width / 2
    : node.textAlign === 'right' ? node.x + node.width : node.x;
  return (
    <>
      <rect x={node.x} y={node.y} width={node.width} height={node.height} fill="transparent" />
      <defs>
        <clipPath id={clipId}><rect x={node.x} y={node.y} width={node.width} height={node.height} /></clipPath>
      </defs>
      <g clipPath={node.autoSize === 'none' ? `url(#${clipId})` : undefined}>
        <text
          x={x}
          y={node.y}
          fill={fillReference(node)}
          fontSize={node.fontSize}
          fontFamily={fontFamilyWithFallback(node.fontFamily)}
          fontWeight={node.fontWeight}
          letterSpacing={node.letterSpacing}
          textAnchor={node.textAlign === 'center' ? 'middle' : node.textAlign === 'right' ? 'end' : 'start'}
          style={{ userSelect: 'none', whiteSpace: 'pre' }}
        >
          {lines.map((line, index) => (
            <tspan key={index} x={x} y={node.y + index * node.fontSize * node.lineHeight} dominantBaseline="text-before-edge">
              {line || ' '}
            </tspan>
          ))}
        </text>
      </g>
    </>
  );
}

export function SceneNode({
  doc, node, onNodePointerDown, onTextDoubleClick, onNodeContextMenu, editingId, suppressedIds, worldTransform,
}: SceneNodeProps) {
  if (!node.visible || node.isMask || suppressedIds?.has(node.id)) return null;
  const children = getChildren(doc, node.id);
  const insideStrokeClip = node.strokeAlign === 'inside' ? `url(#stroke-clip-${node.id})` : undefined;
  const common = {
    fill: fillReference(node),
    stroke: node.stroke,
    strokeWidth: node.strokeWidth * (node.strokeAlign === 'inside' ? 2 : 1),
    strokeDasharray: node.strokeDash?.join(' '),
    strokeLinecap: node.strokeCap,
    strokeLinejoin: node.strokeJoin,
    clipPath: insideStrokeClip,
  };
  const scale = node.type === 'vector' ? vectorScale(node) : null;

  return (
    <g
      data-node-id={node.id}
      transform={matrixToString(worldTransform ?? nodeMatrix(node))}
      opacity={node.opacity}
      onPointerDown={(event) => onNodePointerDown(event, node)}
      onDoubleClick={(event) => onTextDoubleClick(event, node)}
      onContextMenu={(event) => onNodeContextMenu(event, node)}
      className={`scene-node scene-node--${node.type}${node.locked ? ' is-locked' : ''}`}
    >
      <GradientDefinition node={node} />
      {node.type === 'frame' && (
        <>
          <rect
            x={node.x} y={node.y} width={node.width} height={node.height}
            rx={node.cornerRadius} {...common}
          />
          <clipPath id={`clip-${node.id}`}>
            <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={node.cornerRadius} />
          </clipPath>
          {insideStrokeClip && <clipPath id={`stroke-clip-${node.id}`}>
            <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={node.cornerRadius} />
          </clipPath>}
        </>
      )}
      {node.type === 'rectangle' && (
        <>
          <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={node.cornerRadius} {...common} />
          {insideStrokeClip && <clipPath id={`stroke-clip-${node.id}`}>
            <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={node.cornerRadius} />
          </clipPath>}
        </>
      )}
      {node.type === 'ellipse' && (
        <>
          <ellipse cx={node.x + node.width / 2} cy={node.y + node.height / 2} rx={node.width / 2} ry={node.height / 2} {...common} />
          {insideStrokeClip && <clipPath id={`stroke-clip-${node.id}`}>
            <ellipse cx={node.x + node.width / 2} cy={node.y + node.height / 2} rx={node.width / 2} ry={node.height / 2} />
          </clipPath>}
        </>
      )}
      {node.type === 'vector' && scale && (
        <g transform={`translate(${node.x} ${node.y}) scale(${scale.x} ${scale.y})`}>
          <path
            d={node.path} fill={fillReference(node)} fillRule={node.fillRule}
            stroke={node.stroke} strokeWidth={node.strokeWidth}
            strokeDasharray={node.strokeDash?.join(' ')} strokeLinecap={node.strokeCap} strokeLinejoin={node.strokeJoin}
          />
        </g>
      )}
      {node.type === 'text' && (
        <g opacity={editingId === node.id ? 0 : 1}><TextContent node={node} /></g>
      )}
      {node.type === 'image' && (
        <>
          <clipPath id={`clip-${node.id}`}>
            {node.clipShape === 'ellipse' ? (
              <ellipse cx={node.x + node.width / 2} cy={node.y + node.height / 2} rx={node.width / 2} ry={node.height / 2} />
            ) : (
              <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={node.cornerRadius} />
            )}
          </clipPath>
          {node.src ? (
            <image
              href={node.src} x={node.x} y={node.y} width={node.width} height={node.height}
              preserveAspectRatio={node.objectFit === 'fill' ? 'none' : 'xMidYMid slice'} clipPath={`url(#clip-${node.id})`}
            />
          ) : (
            <rect x={node.x} y={node.y} width={node.width} height={node.height} fill="#e8e8e8" stroke="#c8c8c8" />
          )}
        </>
      )}
      {children.length > 0 && (
        <g clipPath={node.type === 'frame' && node.clip ? `url(#clip-${node.id})` : undefined}>
          {children.map((child) => (
            <SceneNode
              key={child.id} doc={doc} node={child}
              onNodePointerDown={onNodePointerDown} onTextDoubleClick={onTextDoubleClick}
              onNodeContextMenu={onNodeContextMenu} editingId={editingId} suppressedIds={suppressedIds}
            />
          ))}
        </g>
      )}
    </g>
  );
}
