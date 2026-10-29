import { useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getPageDocument } from '../utils/pages';

export function usePageDocument() {
  const doc = useEditorStore((state) => state.doc);
  return useMemo(() => getPageDocument(doc), [doc]);
}
