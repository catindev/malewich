import { describe, expect, it } from 'vitest';
import { imageBucketForSize } from './imageTextures';

describe('image texture buckets', () => {
  it('chooses the smallest sufficient display bucket without capping source quality', () => {
    expect(imageBucketForSize(100, 80, 1, 1)).toBe(512);
    expect(imageBucketForSize(100, 80, 4, 2)).toBe(1024);
    expect(imageBucketForSize(4000, 3000, 0.25, 2)).toBe(2048);
    expect(imageBucketForSize(20_000, 10_000, 2, 2)).toBe(16_384);
  });
});
