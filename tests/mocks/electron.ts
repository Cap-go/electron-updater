/**
 * Mock implementations for Electron APIs used in tests
 */

import { vi } from 'vitest';

// Mock electron app
export const mockApp = {
  getPath: vi.fn().mockReturnValue('/tmp/test-electron-updater'),
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  getName: vi.fn().mockReturnValue('test-app'),
  relaunch: vi.fn(),
  exit: vi.fn(),
  quit: vi.fn(),
  isPackaged: false,
};

// Mock safeStorage
export const mockSafeStorage = {
  isEncryptionAvailable: vi.fn().mockReturnValue(false),
  encryptString: vi.fn((str: string) => Buffer.from(str)),
  decryptString: vi.fn((buffer: Buffer) => buffer.toString()),
};

// Mock BrowserWindow
export const mockBrowserWindow = {
  getAllWindows: vi.fn().mockReturnValue([]),
  getFocusedWindow: vi.fn().mockReturnValue(null),
};

// Mock ipcMain
export const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeHandler: vi.fn(),
};

// Mock globalShortcut
export const mockGlobalShortcut = {
  register: vi.fn().mockReturnValue(true),
  unregister: vi.fn(),
  isRegistered: vi.fn().mockReturnValue(false),
};

// Reset all mocks
export function resetMocks(): void {
  mockApp.getPath.mockReturnValue('/tmp/test-electron-updater');
  mockApp.getVersion.mockReturnValue('1.0.0');
  mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
  mockBrowserWindow.getAllWindows.mockReturnValue([]);
  vi.clearAllMocks();
}

// Export as electron module mock
export const electron = {
  app: mockApp,
  safeStorage: mockSafeStorage,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
  globalShortcut: mockGlobalShortcut,
};
