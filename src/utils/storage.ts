import type { DesignDocument, NodeType } from '../types';

const STORAGE_KEY = 'malewich:document:v1';
const LEGACY_STORAGE_KEYS = ['forma:document:v1'];
const DB_NAME = 'malewich-editor';
const LEGACY_DB_NAME = 'forma-editor';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const CURRENT_DOCUMENT = 'current';
const nodeTypes: NodeType[] = ['frame', 'rectangle', 'ellipse', 'text', 'image', 'vector'];

const databasePromises = new Map<string, Promise<IDBDatabase>>();

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

function openDatabase(name = DB_NAME): Promise<IDBDatabase> {
  const existing = databasePromises.get(name);
  if (existing) return existing;
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен'));
      return;
    }
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB заблокирован другой вкладкой'));
  });
  databasePromises.set(name, promise);
  return promise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ошибка IndexedDB'));
  });
}

export function loadStoredDocument(): DesignDocument | null {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const value = localStorage.getItem(key);
      if (!value) continue;
      try {
        const parsed: unknown = JSON.parse(value);
        if (isDesignDocument(parsed)) return parsed;
      } catch {
        // Try the legacy copy if the newest local snapshot is malformed.
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredDocument(doc: DesignDocument): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredDocument(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // The in-memory editor remains available when storage is blocked.
  }
}

async function readDatabaseDocument(name: string): Promise<DesignDocument | null> {
  const database = await openDatabase(name);
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const value: unknown = await requestResult(transaction.objectStore(STORE_NAME).get(CURRENT_DOCUMENT));
  return isDesignDocument(value) ? value : null;
}

async function readIndexedDocument(): Promise<DesignDocument | null> {
  const current = await readDatabaseDocument(DB_NAME);
  if (current) return current;
  const legacy = await readDatabaseDocument(LEGACY_DB_NAME);
  if (legacy) await writeIndexedDocument(legacy);
  return legacy;
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
    const legacy = loadStoredDocument();
    if (legacy) await writeIndexedDocument(legacy);
    return legacy;
  } catch {
    return loadStoredDocument();
  }
}

export async function saveDocument(doc: DesignDocument): Promise<boolean> {
  try {
    await writeIndexedDocument(doc);
    const serialized = JSON.stringify(doc);
    if (serialized.length < 3_500_000) saveStoredDocument(doc);
    else clearStoredDocument();
    return true;
  } catch {
    return saveStoredDocument(doc);
  }
}
