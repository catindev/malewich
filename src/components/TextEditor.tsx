import { useEffect, useRef } from 'react';
import type { DesignDocument, TextNode } from '../types';
import { getWorldMatrix } from '../utils/document';
import { matrixToString } from '../utils/geometry';

interface TextEditorProps {
  doc: DesignDocument;
  node: TextNode;
  onChange: (text: string) => void;
  onFinish: () => void;
  selectAll?: boolean;
}

export function TextEditor({ doc, node, onChange, onFinish, selectAll = false }: TextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.focus();
    if (selectAll) textarea.select();
    else textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [node.id, selectAll]);

  return (
    <foreignObject
      x={node.x - 2} y={node.y - 2} width={Math.max(node.width + 4, 20)} height={Math.max(node.height + 4, 24)}
      transform={matrixToString(getWorldMatrix(doc, node))}
      className="text-editor-object"
    >
      <textarea
        ref={ref}
        value={node.text}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onFinish}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape' || ((event.metaKey || event.ctrlKey) && event.key === 'Enter')) {
            event.preventDefault();
            ref.current?.blur();
          }
        }}
        className="canvas-text-editor"
        style={{
          color: node.fill,
          fontSize: node.fontSize,
          fontFamily: node.fontFamily,
          fontWeight: node.fontWeight,
          lineHeight: node.lineHeight,
          letterSpacing: node.letterSpacing,
          textAlign: node.textAlign,
          opacity: node.opacity,
        }}
      />
    </foreignObject>
  );
}
