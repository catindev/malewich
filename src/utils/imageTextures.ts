import { Texture } from 'pixi.js';

const BUCKETS = [512, 1024, 2048, 4096, 8192, 16_384] as const;
const MAX_CACHED_BYTES = 128 * 1024 * 1024;
const MAX_CACHED_ENTRIES = 64;

interface LoadedImage {
  texture: Texture;
  width: number;
  height: number;
  bytes: number;
}

interface CacheEntry {
  key: string;
  users: number;
  lastUsed: number;
  bytes: number;
  settled: boolean;
  texture: Texture | null;
  ready: Promise<LoadedImage | null>;
}

const entries = new Map<string, CacheEntry>();
let tick = 0;

export function imageBucketForSize(width: number, height: number, zoom: number, devicePixelRatio = 1): number {
  const desired = Math.max(width, height) * Math.max(0.01, zoom) * Math.min(2, Math.max(1, devicePixelRatio));
  return BUCKETS.find((bucket) => desired <= bucket) ?? 16_384;
}

function prune(): void {
  let bytes = [...entries.values()].reduce((sum, entry) => sum + entry.bytes, 0);
  const unused = [...entries.values()]
    .filter((entry) => entry.settled && entry.users === 0)
    .sort((left, right) => left.lastUsed - right.lastUsed);
  for (const entry of unused) {
    if (bytes <= MAX_CACHED_BYTES && entries.size <= MAX_CACHED_ENTRIES) break;
    entry.texture?.destroy(true);
    bytes -= entry.bytes;
    entries.delete(entry.key);
  }
}

function removeOnReject(key: string): null {
  const entry = entries.get(key);
  if (entry) {
    entry.settled = true;
    entry.texture = null;
    entry.bytes = 0;
    entry.lastUsed = ++tick;
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image decoding failed'));
    image.src = src;
  });
}

async function decode(src: string, bucket: number): Promise<LoadedImage | null> {
  try {
    const image = await loadImage(src);
    const naturalWidth = Math.max(1, image.naturalWidth);
    const naturalHeight = Math.max(1, image.naturalHeight);
    const scale = Math.min(1, bucket / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    let source: CanvasImageSource = image;
    if (scale < 1 && typeof createImageBitmap === 'function') {
      source = await createImageBitmap(image, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      });
    } else if (scale < 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(image, 0, 0, width, height);
        source = canvas;
      }
    }
    return {
      texture: Texture.from(source),
      width,
      height,
      bytes: width * height * 4,
    };
  } catch {
    return null;
  }
}

export interface ImageTextureLease {
  key: string;
  ready: Promise<LoadedImage | null>;
  release: () => void;
}

export function acquireImageTexture(src: string, bucket: number): ImageTextureLease {
  const key = `${bucket}\0${src}`;
  let entry = entries.get(key);
  if (!entry) {
    const created: CacheEntry = {
      key,
      users: 0,
      lastUsed: ++tick,
      bytes: 0,
      settled: false,
      texture: null,
      ready: Promise.resolve(null),
    };
    created.ready = decode(src, bucket).then((loaded) => {
      created.settled = true;
      created.texture = loaded?.texture ?? null;
      created.bytes = loaded?.bytes ?? 0;
      created.lastUsed = ++tick;
      prune();
      return loaded;
    }).catch(() => removeOnReject(key));
    entry = created;
    entries.set(key, entry);
  }
  entry.users += 1;
  entry.lastUsed = ++tick;
  let released = false;
  return {
    key,
    ready: entry.ready,
    release: () => {
      if (released) return;
      released = true;
      const current = entries.get(key);
      if (!current) return;
      current.users = Math.max(0, current.users - 1);
      current.lastUsed = ++tick;
      prune();
    },
  };
}

export function imageTextureCacheStats(): { entries: number; bytes: number; shared: number } {
  return {
    entries: entries.size,
    bytes: [...entries.values()].reduce((sum, entry) => sum + entry.bytes, 0),
    shared: [...entries.values()].filter((entry) => entry.users > 1).length,
  };
}
