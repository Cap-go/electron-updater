/**
 * Tests for DelayManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StorageManager } from '../src/main/storage';
import type { DelayCondition } from '../src/shared/types';

// Create a mock StorageManager for testing
function createMockStorage(initialConditions: DelayCondition[] = []): StorageManager {
  let conditions = [...initialConditions];

  return {
    getDelayConditions: vi.fn(() => conditions),
    setDelayConditions: vi.fn((newConditions: DelayCondition[]) => {
      conditions = newConditions;
    }),
    clearDelayConditions: vi.fn(() => {
      conditions = [];
    }),
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as StorageManager;
}

// Import after mocking
import { DelayManager } from '../src/main/delay-manager';

describe('DelayManager', () => {
  let delayManager: DelayManager;
  let mockStorage: StorageManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage = createMockStorage();
    delayManager = new DelayManager(mockStorage, '1.0.0');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setMultiDelay', () => {
    it('should set delay conditions in storage', async () => {
      const conditions: DelayCondition[] = [
        { kind: 'background', value: '5000' },
        { kind: 'kill' },
      ];

      await delayManager.setMultiDelay({ delayConditions: conditions });

      expect(mockStorage.setDelayConditions).toHaveBeenCalledWith(conditions);
      expect(mockStorage.save).toHaveBeenCalled();
    });
  });

  describe('cancelDelay', () => {
    it('should clear delay conditions', async () => {
      await delayManager.cancelDelay();

      expect(mockStorage.clearDelayConditions).toHaveBeenCalled();
      expect(mockStorage.save).toHaveBeenCalled();
    });
  });

  describe('getDelayConditions', () => {
    it('should return conditions from storage', () => {
      const conditions: DelayCondition[] = [{ kind: 'date', value: '2025-01-01' }];
      mockStorage = createMockStorage(conditions);
      delayManager = new DelayManager(mockStorage, '1.0.0');

      const result = delayManager.getDelayConditions();

      expect(result).toEqual(conditions);
    });
  });

  describe('areConditionsSatisfied', () => {
    it('should return true when no conditions exist', () => {
      expect(delayManager.areConditionsSatisfied()).toBe(true);
    });

    describe('background condition', () => {
      it('should return false when app is not in background', () => {
        mockStorage = createMockStorage([{ kind: 'background' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });

      it('should return true when app is in background (no duration)', () => {
        mockStorage = createMockStorage([{ kind: 'background' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        delayManager.onBackground();

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should return false when background duration not met', () => {
        mockStorage = createMockStorage([{ kind: 'background', value: '10000' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        delayManager.onBackground();
        vi.advanceTimersByTime(5000);

        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });

      it('should return true when background duration is met', () => {
        mockStorage = createMockStorage([{ kind: 'background', value: '10000' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        delayManager.onBackground();
        vi.advanceTimersByTime(10000);

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should reset background timer on foreground', () => {
        mockStorage = createMockStorage([{ kind: 'background' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        delayManager.onBackground();
        expect(delayManager.areConditionsSatisfied()).toBe(true);

        delayManager.onForeground();
        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });
    });

    describe('kill condition', () => {
      it('should return false initially', () => {
        mockStorage = createMockStorage([{ kind: 'kill' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });

      it('should return true after onAppStart with kill condition', () => {
        mockStorage = createMockStorage([{ kind: 'kill' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        delayManager.onAppStart();

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should not set wasKilled if no kill condition exists', () => {
        mockStorage = createMockStorage([{ kind: 'background' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        delayManager.onAppStart();

        // The background condition should still fail
        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });

      it('should reset kill state', () => {
        mockStorage = createMockStorage([{ kind: 'kill' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        delayManager.onAppStart();
        expect(delayManager.areConditionsSatisfied()).toBe(true);

        delayManager.resetKillState();
        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });
    });

    describe('date condition', () => {
      it('should return true when current date is after target date', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
        mockStorage = createMockStorage([{ kind: 'date', value: pastDate }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should return false when current date is before target date', () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
        mockStorage = createMockStorage([{ kind: 'date', value: futureDate }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });

      it('should return true for empty date value', () => {
        mockStorage = createMockStorage([{ kind: 'date' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });
    });

    describe('nativeVersion condition', () => {
      it('should return true when app version equals target', () => {
        mockStorage = createMockStorage([{ kind: 'nativeVersion', value: '1.0.0' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should return true when app version is greater', () => {
        mockStorage = createMockStorage([{ kind: 'nativeVersion', value: '1.0.0' }]);
        delayManager = new DelayManager(mockStorage, '2.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should return false when app version is lower', () => {
        mockStorage = createMockStorage([{ kind: 'nativeVersion', value: '2.0.0' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });

      it('should handle complex version comparisons', () => {
        mockStorage = createMockStorage([{ kind: 'nativeVersion', value: '1.2.3' }]);
        delayManager = new DelayManager(mockStorage, '1.2.4');

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should handle versions with different lengths', () => {
        mockStorage = createMockStorage([{ kind: 'nativeVersion', value: '1.0' }]);
        delayManager = new DelayManager(mockStorage, '1.0.1');

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should return true for empty version value', () => {
        mockStorage = createMockStorage([{ kind: 'nativeVersion' }]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });
    });

    describe('multiple conditions', () => {
      it('should require all conditions to be satisfied', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString();
        mockStorage = createMockStorage([
          { kind: 'date', value: pastDate },
          { kind: 'nativeVersion', value: '1.0.0' },
        ]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });

      it('should return false if any condition is not satisfied', () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString();
        mockStorage = createMockStorage([
          { kind: 'date', value: futureDate },
          { kind: 'nativeVersion', value: '1.0.0' },
        ]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        expect(delayManager.areConditionsSatisfied()).toBe(false);
      });

      it('should handle complex multi-condition scenarios', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString();
        mockStorage = createMockStorage([
          { kind: 'date', value: pastDate },
          { kind: 'nativeVersion', value: '1.0.0' },
          { kind: 'kill' },
        ]);
        delayManager = new DelayManager(mockStorage, '1.0.0');

        // Kill condition not satisfied
        expect(delayManager.areConditionsSatisfied()).toBe(false);

        // Simulate app restart
        delayManager.onAppStart();

        // Now all conditions satisfied
        expect(delayManager.areConditionsSatisfied()).toBe(true);
      });
    });
  });
});
