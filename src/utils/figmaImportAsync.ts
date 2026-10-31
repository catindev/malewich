import type { DesignDocument } from '../types';

interface ImportResponse {
  doc?: DesignDocument;
  error?: string;
}

/** Decode outside the UI thread so large FIG libraries keep the workspace responsive. */
export async function importFigmaFile(file: File): Promise<DesignDocument> {
  const buffer = await file.arrayBuffer();
  return new Promise<DesignDocument>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/figmaImport.worker.ts', import.meta.url), { type: 'module' });
    const finish = () => worker.terminate();
    worker.onmessage = (event: MessageEvent<ImportResponse>) => {
      finish();
      if (event.data.doc) resolve(event.data.doc);
      else reject(new Error(event.data.error || 'Не удалось открыть Figma-файл'));
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || 'Ошибка фонового импорта Figma-файла'));
    };
    worker.postMessage({ buffer, fileName: file.name }, [buffer]);
  });
}
