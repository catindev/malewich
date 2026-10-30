import type { DesignDocument, NodeType } from '../types';

const STORAGE_KEY = 'malewich:document:v1';
const DB_NAME = 'malewich-editor';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const CURRENT_DOCUMENT = 'current';
const nodeTypes: NodeType[] = ['frame', 'rectangle', 'ellipse', 'text', 'image', 'vector'];

let databasePromise: Promise<IDBDatabase> | null = null;

export function isDesignDocument(value: unknown): value is DesignDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<DesignDocument>;
  return doc.version === 1 && typeof doc.id === 'string' && typeof doc.name === 'string' &&
    Array.isArray(doc.nodes) && doc.nodes.every((node) =>
      node && typeof node.id === 'string' && nodeTypes.includes(node.type) &&
      typeof node.x === 'number' && typeof node.y === 'number' &&
      typeof node.width === 'number' && typeof node.height === 'number',
    );
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB заблокирован другой вкладкой'));
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ошибка IndexedDB'));
  });
}

export function loadStoredDocument(): DesignDocument | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return isDesignDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredDocument(doc: DesignDocument, serialized = JSON.stringify(doc)): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredDocument(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The in-memory editor remains available when storage is blocked.
  }
}

async function readIndexedDocument(): Promise<DesignDocument | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const value: unknown = await requestResult(transaction.objectStore(STORE_NAME).get(CURRENT_DOCUMENT));
  return isDesignDocument(value) ? value : null;
}

async function writeIndexedDocument(doc: DesignDocument): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  await requestResult(transaction.objectStore(STORE_NAME).put(doc, CURRENT_DOCUMENT));
}

export async function hydrateStoredDocument(): Promise<DesignDocument | null> {
  try {
    const stored = await readIndexedDocument();
    if (stored) return stored;
    const local = loadStoredDocument();
    if (local) await writeIndexedDocument(local);
    return local;
  } catch {
    return loadStoredDocument();
  }
}

export async function saveDocument(doc: DesignDocument): Promise<boolean> {
  try {
    await writeIndexedDocument(doc);
    const serialized = JSON.stringify(doc);
    if (serialized.length < 3_500_000) saveStoredDocument(doc, serialized);
    else clearStoredDocument();
    return true;
  } catch {
    return saveStoredDocument(doc);
  }
}
