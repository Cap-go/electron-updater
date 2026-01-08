/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Electron Updater - Main Process Entry Point
 *
 * @example
 * ```typescript
 * import { ElectronUpdater, setupIPCHandlers, setupEventForwarding } from '@capgo/electron-updater';
 *
 * const updater = new ElectronUpdater({
 *   appId: 'com.example.app',
 *   autoUpdate: true,
 * });
 *
 * app.whenReady().then(async () => {
 *   const mainWindow = new BrowserWindow({ ... });
 *
 *   // Initialize updater
 *   await updater.initialize(mainWindow, path.join(__dirname, 'www/index.html'));
 *
 *   // Setup IPC handlers for renderer communication
 *   setupIPCHandlers(updater);
 *   setupEventForwarding(updater, mainWindow);
 *
 *   // Load the current bundle
 *   await mainWindow.loadFile(updater.getCurrentBundlePath());
 * });
 * ```
 */

// Main updater class
export { ElectronUpdater } from './updater';

// IPC setup
export { setupIPCHandlers, setupEventForwarding, removeIPCHandlers } from './ipc-handlers';

// Individual managers (for advanced usage)
export { StorageManager } from './storage';
export { CryptoManager } from './crypto';
export { DownloadManager } from './download-manager';
export { BundleManager } from './bundle-manager';
export { DelayManager } from './delay-manager';
export { ChannelManager } from './channel-manager';
export { StatsManager } from './stats';
export { DeviceManager } from './device';
export { DebugMenu } from './debug-menu';

// Re-export types
export * from '../shared/types';
export * from '../shared/constants';
export { UpdaterEventEmitter } from '../shared/events';
