import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Bounds, DesignDocument, EditorNode, LinearNode } from '../types';
import { getNodeBounds, getWorldMatrix, isNodeLocked } from '../utils/document';
import { matrixToString, mergeBounds } from '../utils/geometry';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type LineEndpoint = 'start' | 'end';

interface SelectionOverlayProps {
  doc: DesignDocument;
  nodes: EditorNode[];
  zoom: number;
  onResize: (event: ReactPointerEvent<SVGGElement>, node: EditorNode, handle: ResizeHandle) => void;
  onRotate: (event: ReactPointerEvent<SVGGElement>, node: EditorNode) => void;
  onEndpointDown: (event: ReactPointerEvent<SVGGElement>, node: LinearNode, endpoint: LineEndpoint) => void;
  onGroupResize: (event: ReactPointerEvent<SVGGElement>, bounds: Bounds, handle: ResizeHandle) => void;
  onGroupRotate: (event: ReactPointerEvent<SVGGElement>, bounds: Bounds) => void;
}

const handleCursors: Record<ResizeHandle, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
};

function Handles({ bounds, zoom, onResize, onRotate, group = false }: {
  bounds: Bounds;
  zoom: number;
  onResize: (event: ReactPointerEvent<SVGGElement>, handle: ResizeHandle) => void;
  onRotate: (event: ReactPointerEvent<SVGGElement>) => void;
  group?: boolean;
}) {
  const size = 8 / zoom;
  const half = size / 2;
  const rotationOffset = 24 / zoom;
  const { x, y, width, height } = bounds;
  const handles: { id: ResizeHandle; x: number; y: number }[] = [
    { id: 'nw', x, y }, { id: 'n', x: x + width / 2, y },
    { id: 'ne', x: x + width, y }, { id: 'e', x: x + width, y: y + height / 2 },
    { id: 'se', x: x + width, y: y + height }, { id: 's', x: x + width / 2, y: y + height },
    { id: 'sw', x, y: y + height }, { id: 'w', x, y: y + height / 2 },
  ];
  return (
    <>
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y - rotationOffset} stroke="#7357ff" strokeWidth={1.25 / zoom} />
      <g className="rotation-handle" onPointerDown={onRotate} transform={`translate(${x + width / 2} ${y - rotationOffset})`}>
        <circle r={5 / zoom} fill="#ffffff" stroke="#7357ff" strokeWidth={1.25 / zoom} />
      </g>
      {handles.map((handle) => (
        <g
          key={handle.id} className={group ? 'resize-handle group-resize-handle' : 'resize-handle'}
          style={{ cursor: handleCursors[handle.id] }} onPointerDown={(event) => onResize(event, handle.id)}
          transform={`translate(${handle.x} ${handle.y})`}
        >
          <rect x={-half} y={-half} width={size} height={size} fill="#ffffff" stroke="#7357ff" strokeWidth={1.25 / zoom} />
        </g>
      ))}
    </>
  );
}

function LineEndpoints({ node, zoom, onEndpointDown }: {
  node: LinearNode;
  zoom: number;
  onEndpointDown: SelectionOverlayProps['onEndpointDown'];
}) {
  return (
    <>
      {(['start', 'end'] as const).map((endpoint) => (
        <g
          key={endpoint} className="line-endpoint" data-endpoint={endpoint}
          transform={`translate(${endpoint === 'start' ? node.x : node.x + node.width} ${node.y})`}
          style={{ cursor: 'move' }} onPointerDown={(event) => onEndpointDown(event, node, endpoint)}
        >
          <circle r={5 / zoom} fill="#ffffff" stroke="#7357ff" strokeWidth={1.25 / zoom} />
        </g>
      ))}
    </>
  );
}

export function SelectionOverlay({
  doc, nodes, zoom, onResize, onRotate, onEndpointDown, onGroupResize, onGroupRotate,
}: SelectionOverlayProps) {
  const groupBounds = nodes.length > 1 ? mergeBounds(nodes.map((node) => getNodeBounds(doc, node))) : null;
  const groupLocked = nodes.some((node) => isNodeLocked(doc, node));
  return (
    <g className="selection-overlay">
      {nodes.map((node) => {
        const linear = node.type === 'line' || node.type === 'arrow';
        return (
          <g key={node.id} transform={matrixToString(getWorldMatrix(doc, node))} className={isNodeLocked(doc, node) ? 'selection is-locked' : 'selection'}>
            {linear ? (
              <line
                className="linear-selection" x1={node.x} y1={node.y} x2={node.x + node.width} y2={node.y}
                fill="none" stroke="#7357ff" strokeWidth={1.25 / zoom}
              />
            ) : (
              <rect
                x={node.x} y={node.y} width={Math.max(node.width, 0.01)} height={Math.max(node.height, 0.01)}
                fill="none" stroke="#7357ff" strokeWidth={1.25 / zoom}
              />
            )}
            {nodes.length === 1 && !isNodeLocked(doc, node) && (linear ? (
              <LineEndpoints node={node} zoom={zoom} onEndpointDown={onEndpointDown} />
            ) : (
              <Handles
                bounds={node} zoom={zoom}
                onResize={(event, handle) => onResize(event, node, handle)}
                onRotate={(event) => onRotate(event, node)}
              />
            ))}
          </g>
        );
      })}
      {groupBounds && !groupLocked && (
        <g className="selection group-selection">
          <rect
            x={groupBounds.x} y={groupBounds.y} width={Math.max(groupBounds.width, 0.01)} height={Math.max(groupBounds.height, 0.01)}
            fill="none" stroke="#7357ff" strokeWidth={1.25 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`}
          />
          <Handles
            bounds={groupBounds} zoom={zoom} group
            onResize={(event, handle) => onGroupResize(event, groupBounds, handle)}
            onRotate={(event) => onGroupRotate(event, groupBounds)}
          />
        </g>
      )}
    </g>
  );
}
