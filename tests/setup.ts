/**
 * Vitest setup file
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, electron } from './mocks/electron';

// Mock electron module globally
vi.mock('electron', () => electron);

// Reset mocks before each test
beforeEach(() => {
  resetMocks();
});

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});
