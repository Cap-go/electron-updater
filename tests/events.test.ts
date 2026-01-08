/**
 * Tests for UpdaterEventEmitter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdaterEventEmitter } from '../src/shared/events';

describe('UpdaterEventEmitter', () => {
  let emitter: UpdaterEventEmitter;

  beforeEach(() => {
    emitter = new UpdaterEventEmitter();
  });

  describe('addListener', () => {
    it('should add a listener for an event', () => {
      const callback = vi.fn();

      emitter.addListener('download', callback);
      emitter.emit('download', { percent: 50, bundle: createMockBundle() });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return a handle to remove the listener', () => {
      const callback = vi.fn();

      const handle = emitter.addListener('download', callback);
      handle.remove();

      emitter.emit('download', { percent: 50, bundle: createMockBundle() });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for the same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.addListener('download', callback1);
      emitter.addListener('download', callback2);

      emitter.emit('download', { percent: 100, bundle: createMockBundle() });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should support listeners for different events', () => {
      const downloadCallback = vi.fn();
      const updateCallback = vi.fn();

      emitter.addListener('download', downloadCallback);
      emitter.addListener('updateAvailable', updateCallback);

      emitter.emit('download', { percent: 50, bundle: createMockBundle() });

      expect(downloadCallback).toHaveBeenCalledTimes(1);
      expect(updateCallback).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should pass event data to listeners', () => {
      const callback = vi.fn();
      const eventData = { percent: 75, bundle: createMockBundle() };

      emitter.addListener('download', callback);
      emitter.emit('download', eventData);

      expect(callback).toHaveBeenCalledWith(eventData);
    });

    it('should not throw when emitting with no listeners', () => {
      expect(() => {
        emitter.emit('download', { percent: 0, bundle: createMockBundle() });
      }).not.toThrow();
    });

    it('should continue calling other listeners if one throws', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = vi.fn();

      emitter.addListener('download', errorCallback);
      emitter.addListener('download', successCallback);

      emitter.emit('download', { percent: 50, bundle: createMockBundle() });

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(successCallback).toHaveBeenCalledTimes(1);
    });

    it('should emit appReloaded event with void data', () => {
      const callback = vi.fn();

      emitter.addListener('appReloaded', callback);
      // @ts-expect-error - appReloaded emits void
      emitter.emit('appReloaded', undefined);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for all events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.addListener('download', callback1);
      emitter.addListener('updateAvailable', callback2);

      emitter.removeAllListeners();

      emitter.emit('download', { percent: 0, bundle: createMockBundle() });
      emitter.emit('updateAvailable', { bundle: createMockBundle() });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('removeListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const downloadCallback = vi.fn();
      const updateCallback = vi.fn();

      emitter.addListener('download', downloadCallback);
      emitter.addListener('updateAvailable', updateCallback);

      emitter.removeListeners('download');

      emitter.emit('download', { percent: 0, bundle: createMockBundle() });
      emitter.emit('updateAvailable', { bundle: createMockBundle() });

      expect(downloadCallback).not.toHaveBeenCalled();
      expect(updateCallback).toHaveBeenCalledTimes(1);
    });

    it('should not throw when removing non-existent event', () => {
      expect(() => {
        emitter.removeListeners('download');
      }).not.toThrow();
    });
  });

  describe('event types', () => {
    it('should emit downloadComplete event', () => {
      const callback = vi.fn();
      const bundle = createMockBundle();

      emitter.addListener('downloadComplete', callback);
      emitter.emit('downloadComplete', { bundle });

      expect(callback).toHaveBeenCalledWith({ bundle });
    });

    it('should emit downloadFailed event', () => {
      const callback = vi.fn();

      emitter.addListener('downloadFailed', callback);
      emitter.emit('downloadFailed', { version: '1.0.0' });

      expect(callback).toHaveBeenCalledWith({ version: '1.0.0' });
    });

    it('should emit updateFailed event', () => {
      const callback = vi.fn();
      const bundle = createMockBundle();

      emitter.addListener('updateFailed', callback);
      emitter.emit('updateFailed', { bundle });

      expect(callback).toHaveBeenCalledWith({ bundle });
    });

    it('should emit noNeedUpdate event', () => {
      const callback = vi.fn();
      const bundle = createMockBundle();

      emitter.addListener('noNeedUpdate', callback);
      emitter.emit('noNeedUpdate', { bundle });

      expect(callback).toHaveBeenCalledWith({ bundle });
    });

    it('should emit breakingAvailable event', () => {
      const callback = vi.fn();

      emitter.addListener('breakingAvailable', callback);
      emitter.emit('breakingAvailable', { version: '2.0.0' });

      expect(callback).toHaveBeenCalledWith({ version: '2.0.0' });
    });

    it('should emit majorAvailable event (deprecated)', () => {
      const callback = vi.fn();

      emitter.addListener('majorAvailable', callback);
      emitter.emit('majorAvailable', { version: '2.0.0' });

      expect(callback).toHaveBeenCalledWith({ version: '2.0.0' });
    });

    it('should emit appReady event', () => {
      const callback = vi.fn();
      const bundle = createMockBundle();

      emitter.addListener('appReady', callback);
      emitter.emit('appReady', { bundle, status: 'success' });

      expect(callback).toHaveBeenCalledWith({ bundle, status: 'success' });
    });
  });
});

function createMockBundle() {
  return {
    id: 'test-bundle-id',
    version: '1.0.0',
    downloaded: new Date().toISOString(),
    checksum: 'abc123',
    status: 'success' as const,
  };
}
