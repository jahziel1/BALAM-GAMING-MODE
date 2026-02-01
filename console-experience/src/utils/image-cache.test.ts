/**
 * Tests for LRU Image Cache
 *
 * Tests cover:
 * - Cache hit/miss behavior
 * - LRU eviction when full
 * - Clear functionality
 * - Statistics tracking
 * - getCachedAssetSrc edge cases
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCachedAssetSrc, ImageCache, imageCache } from './image-cache';

// Mock Tauri's convertFileSrc
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost${path}`),
}));

import { convertFileSrc } from '@tauri-apps/api/core';

describe('ImageCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    imageCache.clear();
    vi.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should cache converted URLs', () => {
      const path = '/path/to/image.jpg';
      const result1 = imageCache.get(path);
      const result2 = imageCache.get(path);

      // convertFileSrc should only be called once (cache hit on second call)
      expect(convertFileSrc).toHaveBeenCalledTimes(1);
      expect(convertFileSrc).toHaveBeenCalledWith(path);
      expect(result1).toBe('asset://localhost/path/to/image.jpg');
      expect(result2).toBe(result1);
    });

    it('should return different URLs for different paths', () => {
      const path1 = '/path/to/image1.jpg';
      const path2 = '/path/to/image2.jpg';

      const result1 = imageCache.get(path1);
      const result2 = imageCache.get(path2);

      expect(result1).toBe('asset://localhost/path/to/image1.jpg');
      expect(result2).toBe('asset://localhost/path/to/image2.jpg');
      expect(convertFileSrc).toHaveBeenCalledTimes(2);
    });

    it('should update lastAccessed timestamp on cache hit', () => {
      const path = '/path/to/image.jpg';
      const firstAccess = imageCache.get(path);

      // Wait a tiny bit to ensure timestamp changes
      const startTime = Date.now();
      while (Date.now() === startTime) {
        // Busy wait for at least 1ms
      }

      const secondAccess = imageCache.get(path);

      // Same URL returned, but timestamp updated (we can't directly test timestamp
      // but we can verify the cache hit didn't call convertFileSrc again)
      expect(firstAccess).toBe(secondAccess);
      expect(convertFileSrc).toHaveBeenCalledTimes(1);
    });
  });

  describe('LRU Eviction', () => {
    it('should work with a separate cache instance', () => {
      // Verify that a new ImageCache instance works independently
      const testCache = new ImageCache(5);

      testCache.get('/test1.jpg');
      testCache.get('/test2.jpg');

      const stats = testCache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);

      // Clear mocks and verify cache hits
      vi.clearAllMocks();
      testCache.get('/test1.jpg');
      testCache.get('/test2.jpg');

      // Should be cache hits (no new calls)
      expect(convertFileSrc).toHaveBeenCalledTimes(0);
    });

    it('should evict an entry when cache is full', () => {
      // Create a small cache for testing
      const testCache = new ImageCache(3);

      testCache.get('/image1.jpg');
      testCache.get('/image2.jpg');
      testCache.get('/image3.jpg');

      // Cache should be full with 3 items
      let stats = testCache.getStats();
      expect(stats.size).toBe(3);

      // Add a 4th image - should evict one entry
      testCache.get('/image4.jpg');

      // Cache should still have 3 items
      stats = testCache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBe(3);
    });

    it('should maintain cache size at maxSize', () => {
      const testCache = new ImageCache(5);

      // Add 10 images
      for (let i = 0; i < 10; i++) {
        testCache.get(`/image${i}.jpg`);
      }

      const stats = testCache.getStats();
      expect(stats.size).toBe(5);
      expect(stats.maxSize).toBe(5);
    });
  });

  describe('Clear', () => {
    it('should clear all cached entries', () => {
      imageCache.get('/image1.jpg');
      imageCache.get('/image2.jpg');
      imageCache.get('/image3.jpg');

      let stats = imageCache.getStats();
      expect(stats.size).toBe(3);

      imageCache.clear();

      stats = imageCache.getStats();
      expect(stats.size).toBe(0);
    });

    it('should require new conversions after clear', () => {
      const path = '/image.jpg';
      imageCache.get(path);

      expect(convertFileSrc).toHaveBeenCalledTimes(1);

      imageCache.clear();
      vi.clearAllMocks();

      imageCache.get(path);
      expect(convertFileSrc).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics', () => {
    it('should return correct stats', () => {
      imageCache.clear();

      let stats = imageCache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(200);

      imageCache.get('/image1.jpg');
      imageCache.get('/image2.jpg');

      stats = imageCache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(200);
    });
  });
});

describe('getCachedAssetSrc', () => {
  const defaultCover = 'default-cover.png';

  beforeEach(() => {
    imageCache.clear();
    vi.clearAllMocks();
  });

  it('should return default cover for null path', () => {
    const result = getCachedAssetSrc(null, defaultCover);
    expect(result).toBe(defaultCover);
    expect(convertFileSrc).not.toHaveBeenCalled();
  });

  it('should return default cover for undefined path', () => {
    const result = getCachedAssetSrc(undefined, defaultCover);
    expect(result).toBe(defaultCover);
    expect(convertFileSrc).not.toHaveBeenCalled();
  });

  it('should pass through HTTP URLs without caching', () => {
    const httpUrl = 'http://example.com/image.jpg';
    const result = getCachedAssetSrc(httpUrl, defaultCover);

    expect(result).toBe(httpUrl);
    expect(convertFileSrc).not.toHaveBeenCalled();
  });

  it('should pass through HTTPS URLs without caching', () => {
    const httpsUrl = 'https://example.com/image.jpg';
    const result = getCachedAssetSrc(httpsUrl, defaultCover);

    expect(result).toBe(httpsUrl);
    expect(convertFileSrc).not.toHaveBeenCalled();
  });

  it('should convert and cache local paths', () => {
    const localPath = '/path/to/local/image.jpg';
    const result1 = getCachedAssetSrc(localPath, defaultCover);
    const result2 = getCachedAssetSrc(localPath, defaultCover);

    expect(result1).toBe('asset://localhost/path/to/local/image.jpg');
    expect(result2).toBe(result1);
    expect(convertFileSrc).toHaveBeenCalledTimes(1);
  });

  it('should handle Windows paths', () => {
    const windowsPath = 'C:\\Users\\Games\\cover.jpg';
    const result = getCachedAssetSrc(windowsPath, defaultCover);

    expect(convertFileSrc).toHaveBeenCalledWith(windowsPath);
    expect(result).toBe(`asset://localhost${windowsPath}`);
  });

  it('should use cache for repeated calls with same path', () => {
    const path = '/game/cover.jpg';

    getCachedAssetSrc(path, defaultCover);
    getCachedAssetSrc(path, defaultCover);
    getCachedAssetSrc(path, defaultCover);

    // convertFileSrc should only be called once due to caching
    expect(convertFileSrc).toHaveBeenCalledTimes(1);
  });

  it('should handle empty string as falsy and return default', () => {
    const result = getCachedAssetSrc('', defaultCover);
    expect(result).toBe(defaultCover);
    expect(convertFileSrc).not.toHaveBeenCalled();
  });
});

describe('ImageCache Performance', () => {
  it('should handle large number of entries efficiently', () => {
    const testCache = new ImageCache(1000);
    const startTime = Date.now();

    // Add 1000 entries
    for (let i = 0; i < 1000; i++) {
      testCache.get(`/image${i}.jpg`);
    }

    const addTime = Date.now() - startTime;

    // Should complete in reasonable time (less than 100ms for 1000 entries)
    expect(addTime).toBeLessThan(100);

    // All entries should be cached
    const stats = testCache.getStats();
    expect(stats.size).toBe(1000);
  });

  it('should evict efficiently when cache is full', () => {
    const testCache = new ImageCache(100);

    // Fill cache
    for (let i = 0; i < 100; i++) {
      testCache.get(`/image${i}.jpg`);
    }

    const startTime = Date.now();

    // Add 100 more entries (should evict 100 oldest)
    for (let i = 100; i < 200; i++) {
      testCache.get(`/image${i}.jpg`);
    }

    const evictionTime = Date.now() - startTime;

    // Eviction should be fast (less than 50ms for 100 evictions)
    expect(evictionTime).toBeLessThan(50);

    const stats = testCache.getStats();
    expect(stats.size).toBe(100);
  });
});
