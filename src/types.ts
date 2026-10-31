export type NodeType = 'frame' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'polygon' | 'star' | 'text' | 'image' | 'vector';
export type Tool = 'select' | 'hand' | NodeType;
export type TextAlign = 'left' | 'center' | 'right';

export interface GradientStopDefinition {
  color: string;
  position: number;
}

export interface GradientTransform {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
}

export interface GradientFillDefinition {
  type: 'linear' | 'radial';
  stops: GradientStopDefinition[];
  transform: GradientTransform;
}

interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX?: boolean;
  flipY?: boolean;
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Figma mask geometry is editable metadata, not ordinary visible artwork. */
  isMask?: boolean;
  parentId: string | null;
  /** Set on root nodes; descendants inherit the page through their ancestor chain. */
  pageId?: string;
  stroke: string;
  strokeWidth: number;
  strokeAlign?: 'inside' | 'center' | 'outside';
  strokeDash?: number[];
  strokeCap?: 'butt' | 'round' | 'square';
  strokeJoin?: 'miter' | 'round' | 'bevel';
  /** Figma gradient paint in the node's unit-square coordinate space. Fill remains a solid fallback. */
  fillGradient?: GradientFillDefinition;
  component?: {
    rootId: string;
    sourceId: string;
    role: 'main' | 'instance';
  };
  overrides?: Record<string, unknown>;
  fillStyleId?: string;
  textStyleId?: string;
  variableBindings?: Record<string, string>;
  layout?: {
    horizontal: 'fixed' | 'fill';
    vertical: 'fixed' | 'fill';
    absolute: boolean;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  variantSetId?: string;
  variantProps?: Record<string, string>;
  variantKey?: string;
}

export interface AutoLayoutSettings {
  direction: 'horizontal' | 'vertical';
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  align: 'start' | 'center' | 'end';
  justify: 'start' | 'center' | 'end' | 'space-between';
  hug: boolean;
  widthMode?: 'fixed' | 'hug';
  heightMode?: 'fixed' | 'hug';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface FrameNode extends BaseNode {
  type: 'frame';
  fill: string;
  cornerRadius: number;
  clip: boolean;
  /** Lightweight Figma-like grouping without a separate renderer node type. */
  isGroup?: boolean;
  autoLayout?: AutoLayoutSettings;
}

export interface RectangleNode extends BaseNode {
  type: 'rectangle';
  fill: string;
  cornerRadius: number;
}

export interface EllipseNode extends BaseNode {
  type: 'ellipse';
  fill: string;
}

export interface LineNode extends BaseNode {
  type: 'line';
}

export interface ArrowNode extends BaseNode {
  type: 'arrow';
  startArrowhead: boolean;
  endArrowhead: boolean;
}

export interface PolygonNode extends BaseNode {
  type: 'polygon';
  fill: string;
  sides: number;
}

export interface StarNode extends BaseNode {
  type: 'star';
  fill: string;
  points: number;
  /** Ratio of the inner vertex radius to the outer radius, from 0 to 1. */
  innerRadius: number;
}

export interface TextNode extends BaseNode {
  type: 'text';
  fill: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: TextAlign;
  autoSize?: 'width' | 'height' | 'none';
}

export interface ImageNode extends BaseNode {
  type: 'image';
  src: string;
  cornerRadius: number;
  /** Figma IMAGE FILL maps to cover; STRETCH maps to fill. Default preserves existing cover behavior. */
  objectFit?: 'cover' | 'fill';
  /** Embedded images can retain an elliptical source outline instead of a rounded rectangle. */
  clipShape?: 'ellipse';
}

export interface VectorNode extends BaseNode {
  type: 'vector';
  fill: string;
  path: string;
  pathWidth: number;
  pathHeight: number;
  fillRule?: 'nonzero' | 'evenodd';
}

export type EditorNode = FrameNode | RectangleNode | EllipseNode | LineNode | ArrowNode | PolygonNode | StarNode | TextNode | ImageNode | VectorNode;
export type LinearNode = LineNode | ArrowNode;
export type ParametricShapeNode = PolygonNode | StarNode;
export type EditorNodeInput = Omit<EditorNode, 'id' | 'name'> & { id?: string; name?: string };

export interface ColorStyleDefinition {
  id: string;
  type: 'color';
  name: string;
  color: string;
}

export interface TextStyleDefinition {
  id: string;
  type: 'text';
  name: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

export type StyleDefinition = ColorStyleDefinition | TextStyleDefinition;

export interface VariableDefinition {
  id: string;
  name: string;
  type: 'color' | 'number';
  value: string | number;
  collectionId?: string;
  modeValues?: Record<string, string | number>;
  aliasOf?: string;
}

export interface VariableCollection {
  id: string;
  name: string;
  modes: { id: string; name: string }[];
  activeModeId: string;
}

export interface PrototypeLink {
  id: string;
  sourceFrameId: string;
  targetFrameId: string;
  transition: 'instant' | 'dissolve' | 'slide';
  duration: number;
}

export interface PageDefinition {
  id: string;
  name: string;
  /** Canvas color for this page. Undefined keeps the theme-aware default. */
  background?: string;
  /** Legacy metadata retained for JSON compatibility; the UI shows a flat page list. */
  groupId?: string | null;
}

export interface PageGroupDefinition {
  id: string;
  name: string;
}

export interface DesignDocument {
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: EditorNode[];
  styles?: StyleDefinition[];
  variables?: VariableDefinition[];
  variableCollections?: VariableCollection[];
  prototypeLinks?: PrototypeLink[];
  pages?: PageDefinition[];
  pageGroups?: PageGroupDefinition[];
  activePageId?: string;
  preserveSavedGeometry?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
