import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { DesignDocument, EditorNode } from '../types';
import { documentTokensCss, highlightCss, nodeToCss } from '../utils/devMode';

export function DevPanel({ doc, nodes }: { doc: DesignDocument; nodes: EditorNode[] }) {
  const [copied, setCopied] = useState(false);
  const code = [documentTokensCss(doc), ...nodes.map((node) => nodeToCss(doc, node))].filter(Boolean).join('\n\n');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="dev-panel">
      <div className="dev-panel-toolbar"><span>CSS · {nodes.length} объектов</span><button onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Скопировано' : 'Копировать CSS'}</button></div>
      {nodes.length === 0 ? <p className="library-empty">Выберите объект для просмотра CSS и токенов.</p> : (
        <pre className="dev-code" aria-label="CSS с подсветкой синтаксиса"><code>{highlightCss(code).map((token, index) => (
          <span key={index} className={`code-token token-${token.type}`}>{token.value}</span>
        ))}</code></pre>
      )}
    </div>
  );
}
