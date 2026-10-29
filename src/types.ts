export type NodeType = 'frame' | 'rectangle' | 'ellipse' | 'text' | 'image' | 'vector';
export type Tool = 'select' | 'hand' | NodeType;
export type TextAlign = 'left' | 'center' | 'right';

interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  parentId: string | null;
  /** Set on root nodes; descendants inherit the page through their ancestor chain. */
  pageId?: string;
  stroke: string;
  strokeWidth: number;
  strokeAlign?: 'inside' | 'center' | 'outside';
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
}

export interface VectorNode extends BaseNode {
  type: 'vector';
  fill: string;
  path: string;
  pathWidth: number;
  pathHeight: number;
  fillRule?: 'nonzero' | 'evenodd';
}

export type EditorNode = FrameNode | RectangleNode | EllipseNode | TextNode | ImageNode | VectorNode;
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
