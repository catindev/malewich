/// <reference lib="webworker" />

import { importFigmaDocument } from '../utils/figmaImport';

declare const self: DedicatedWorkerGlobalScope;

interface ImportRequest {
  buffer: ArrayBuffer;
  fileName: string;
}

self.onmessage = (event: MessageEvent<ImportRequest>) => {
  try {
    const doc = importFigmaDocument(event.data.buffer, event.data.fileName);
    self.postMessage({ doc });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Не удалось открыть Figma-файл' });
  }
};

export {};
