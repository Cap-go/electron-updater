/**
 * IPC Handlers
 * Sets up IPC communication between main and renderer processes
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type { ElectronUpdater } from './updater';

export function setupIPCHandlers(updater: ElectronUpdater): void {
  // Core Update Methods
  ipcMain.handle(IPC_CHANNELS.NOTIFY_APP_READY, async () => {
    return updater.notifyAppReady();
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD, async (_event, options) => {
    return updater.download(options);
  });

  ipcMain.handle(IPC_CHANNELS.NEXT, async (_event, options) => {
    return updater.next(options);
  });

  ipcMain.handle(IPC_CHANNELS.SET, async (_event, options) => {
    return updater.set(options);
  });

  ipcMain.handle(IPC_CHANNELS.RELOAD, async () => {
    return updater.reload();
  });

  ipcMain.handle(IPC_CHANNELS.DELETE, async (_event, options) => {
    return updater.delete(options);
  });

  ipcMain.handle(IPC_CHANNELS.SET_BUNDLE_ERROR, async (_event, options) => {
    return updater.setBundleError(options);
  });

  // Bundle Information Methods
  ipcMain.handle(IPC_CHANNELS.CURRENT, async () => {
    return updater.current();
  });

  ipcMain.handle(IPC_CHANNELS.LIST, async (_event, options) => {
    return updater.list(options);
  });

  ipcMain.handle(IPC_CHANNELS.GET_NEXT_BUNDLE, async () => {
    return updater.getNextBundle();
  });

  ipcMain.handle(IPC_CHANNELS.GET_FAILED_UPDATE, async () => {
    return updater.getFailedUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.RESET, async (_event, options) => {
    return updater.reset(options);
  });

  // Update Checking Methods
  ipcMain.handle(IPC_CHANNELS.GET_LATEST, async (_event, options) => {
    return updater.getLatest(options);
  });

  ipcMain.handle(IPC_CHANNELS.GET_BUILTIN_VERSION, async () => {
    return updater.getBuiltinVersion();
  });

  // Delay Methods
  ipcMain.handle(IPC_CHANNELS.SET_MULTI_DELAY, async (_event, options) => {
    return updater.setMultiDelay(options);
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_DELAY, async () => {
    return updater.cancelDelay();
  });

  // Channel Methods
  ipcMain.handle(IPC_CHANNELS.SET_CHANNEL, async (_event, options) => {
    return updater.setChannel(options);
  });

  ipcMain.handle(IPC_CHANNELS.UNSET_CHANNEL, async (_event, options) => {
    return updater.unsetChannel(options);
  });

  ipcMain.handle(IPC_CHANNELS.GET_CHANNEL, async () => {
    return updater.getChannel();
  });

  ipcMain.handle(IPC_CHANNELS.LIST_CHANNELS, async () => {
    return updater.listChannels();
  });

  // Device Methods
  ipcMain.handle(IPC_CHANNELS.GET_DEVICE_ID, async () => {
    return updater.getDeviceId();
  });

  ipcMain.handle(IPC_CHANNELS.SET_CUSTOM_ID, async (_event, options) => {
    return updater.setCustomId(options);
  });

  // Plugin Info Methods
  ipcMain.handle(IPC_CHANNELS.GET_PLUGIN_VERSION, async () => {
    return updater.getPluginVersion();
  });

  ipcMain.handle(IPC_CHANNELS.IS_AUTO_UPDATE_ENABLED, async () => {
    return updater.isAutoUpdateEnabled();
  });

  ipcMain.handle(IPC_CHANNELS.IS_AUTO_UPDATE_AVAILABLE, async () => {
    return updater.isAutoUpdateAvailable();
  });

  // Dynamic Config Methods
  ipcMain.handle(IPC_CHANNELS.SET_UPDATE_URL, async (_event, options) => {
    return updater.setUpdateUrl(options);
  });

  ipcMain.handle(IPC_CHANNELS.SET_STATS_URL, async (_event, options) => {
    return updater.setStatsUrl(options);
  });

  ipcMain.handle(IPC_CHANNELS.SET_CHANNEL_URL, async (_event, options) => {
    return updater.setChannelUrl(options);
  });

  ipcMain.handle(IPC_CHANNELS.SET_APP_ID, async (_event, options) => {
    return updater.setAppId(options);
  });

  ipcMain.handle(IPC_CHANNELS.GET_APP_ID, async () => {
    return updater.getAppId();
  });

  // Debug Methods
  ipcMain.handle(IPC_CHANNELS.SET_DEBUG_MENU, async (_event, options) => {
    return updater.setDebugMenu(options);
  });

  ipcMain.handle(IPC_CHANNELS.IS_DEBUG_MENU_ENABLED, async () => {
    return updater.isDebugMenuEnabled();
  });

  // Listener Methods
  ipcMain.handle(IPC_CHANNELS.REMOVE_ALL_LISTENERS, async () => {
    return updater.removeAllListeners();
  });
}

/**
 * Setup event forwarding from main to renderer
 */
export function setupEventForwarding(updater: ElectronUpdater, window: BrowserWindow): void {
  updater.addListener('download', (event) => {
    window.webContents.send(IPC_CHANNELS.EVENT_DOWNLOAD, event);
  });

  updater.addListener('updateAvailable', (event) => {
    window.webContents.send(IPC_CHANNELS.EVENT_UPDATE_AVAILABLE, event);
  });

  updater.addListener('noNeedUpdate', (event) => {
    window.webContents.send(IPC_CHANNELS.EVENT_NO_NEED_UPDATE, event);
  });

  updater.addListener('downloadComplete', (event) => {
    window.webContents.send(IPC_CHANNELS.EVENT_DOWNLOAD_COMPLETE, event);
  });

  updater.addListener('downloadFailed', (event) => {
    window.webContents.send(IPC_CHANNELS.EVENT_DOWNLOAD_FAILED, event);
  });

  updater.addListener('breakingAvailable', (event) => {
    window.webContents.send(IPC_CHANNELS.EVENT_BREAKING_AVAILABLE, event);
    window.webContents.send(IPC_CHANNELS.EVENT_MAJOR_AVAILABLE, event);
  });

  updater.addListener('updateFailed', (event) => {
    window.webContents.send(IPC_CHANNELS.EVENT_UPDATE_FAILED, event);
  });

  updater.addListener('appReloaded', () => {
    window.webContents.send(IPC_CHANNELS.EVENT_APP_RELOADED);
  });

  updater.addListener('appReady', (event) => {
    window.webContents.send(IPC_CHANNELS.EVENT_APP_READY, event);
  });
}

/**
 * Remove all IPC handlers
 */
export function removeIPCHandlers(): void {
  Object.values(IPC_CHANNELS).forEach((channel) => {
    try {
      ipcMain.removeHandler(channel);
    } catch {
      // Ignore if not registered
    }
  });
}
