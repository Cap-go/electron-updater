/**
 * Electron Updater - Preload Script
 *
 * Exposes updater API to renderer process via contextBridge
 *
 * @example
 * ```typescript
 * // In your preload.ts
 * import { exposeUpdaterAPI } from '@capgo/electron-updater/preload';
 *
 * exposeUpdaterAPI();
 * ```
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  AppReadyResult,
  BundleInfo,
  BundleId,
  CurrentBundleResult,
  BundleListResult,
  ListOptions,
  ResetOptions,
  DownloadOptions,
  LatestVersion,
  GetLatestOptions,
  BuiltinVersion,
  MultiDelayConditions,
  SetChannelOptions,
  UnsetChannelOptions,
  ChannelRes,
  GetChannelRes,
  ListChannelsResult,
  DeviceId,
  SetCustomIdOptions,
  PluginVersion,
  AutoUpdateEnabled,
  AutoUpdateAvailable,
  UpdateUrl,
  StatsUrl,
  ChannelUrl,
  SetAppIdOptions,
  GetAppIdRes,
  SetDebugMenuOptions,
  DebugMenuEnabled,
  UpdateFailedEvent,
  UpdaterEventName,
  ListenerHandle,
  DownloadEvent,
  UpdateAvailableEvent,
  NoNeedEvent,
  DownloadCompleteEvent,
  DownloadFailedEvent,
  BreakingAvailableEvent,
  AppReadyEvent,
} from '../shared/types';

export interface ElectronUpdaterAPI {
  // Core Update Methods
  notifyAppReady: () => Promise<AppReadyResult>;
  download: (options: DownloadOptions) => Promise<BundleInfo>;
  next: (options: BundleId) => Promise<BundleInfo>;
  set: (options: BundleId) => Promise<void>;
  reload: () => Promise<void>;
  delete: (options: BundleId) => Promise<void>;
  setBundleError: (options: BundleId) => Promise<BundleInfo>;

  // Bundle Information Methods
  current: () => Promise<CurrentBundleResult>;
  list: (options?: ListOptions) => Promise<BundleListResult>;
  getNextBundle: () => Promise<BundleInfo | null>;
  getFailedUpdate: () => Promise<UpdateFailedEvent | null>;
  reset: (options?: ResetOptions) => Promise<void>;

  // Update Checking Methods
  getLatest: (options?: GetLatestOptions) => Promise<LatestVersion>;
  getBuiltinVersion: () => Promise<BuiltinVersion>;

  // Delay Methods
  setMultiDelay: (options: MultiDelayConditions) => Promise<void>;
  cancelDelay: () => Promise<void>;

  // Channel Methods
  setChannel: (options: SetChannelOptions) => Promise<ChannelRes>;
  unsetChannel: (options?: UnsetChannelOptions) => Promise<void>;
  getChannel: () => Promise<GetChannelRes>;
  listChannels: () => Promise<ListChannelsResult>;

  // Device Methods
  getDeviceId: () => Promise<DeviceId>;
  setCustomId: (options: SetCustomIdOptions) => Promise<void>;

  // Plugin Info Methods
  getPluginVersion: () => Promise<PluginVersion>;
  isAutoUpdateEnabled: () => Promise<AutoUpdateEnabled>;
  isAutoUpdateAvailable: () => Promise<AutoUpdateAvailable>;

  // Dynamic Config Methods
  setUpdateUrl: (options: UpdateUrl) => Promise<void>;
  setStatsUrl: (options: StatsUrl) => Promise<void>;
  setChannelUrl: (options: ChannelUrl) => Promise<void>;
  setAppId: (options: SetAppIdOptions) => Promise<void>;
  getAppId: () => Promise<GetAppIdRes>;

  // Debug Methods
  setDebugMenu: (options: SetDebugMenuOptions) => Promise<void>;
  isDebugMenuEnabled: () => Promise<DebugMenuEnabled>;

  // Event Methods
  addListener: (event: UpdaterEventName, callback: (data: unknown) => void) => ListenerHandle;
  removeAllListeners: () => Promise<void>;
}

// Store listeners for cleanup
const listeners = new Map<string, Set<(data: unknown) => void>>();

/**
 * Create the updater API object
 */
function createUpdaterAPI(): ElectronUpdaterAPI {
  return {
    // Core Update Methods
    notifyAppReady: () => ipcRenderer.invoke(IPC_CHANNELS.NOTIFY_APP_READY),
    download: (options) => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD, options),
    next: (options) => ipcRenderer.invoke(IPC_CHANNELS.NEXT, options),
    set: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET, options),
    reload: () => ipcRenderer.invoke(IPC_CHANNELS.RELOAD),
    delete: (options) => ipcRenderer.invoke(IPC_CHANNELS.DELETE, options),
    setBundleError: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_BUNDLE_ERROR, options),

    // Bundle Information Methods
    current: () => ipcRenderer.invoke(IPC_CHANNELS.CURRENT),
    list: (options) => ipcRenderer.invoke(IPC_CHANNELS.LIST, options),
    getNextBundle: () => ipcRenderer.invoke(IPC_CHANNELS.GET_NEXT_BUNDLE),
    getFailedUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.GET_FAILED_UPDATE),
    reset: (options) => ipcRenderer.invoke(IPC_CHANNELS.RESET, options),

    // Update Checking Methods
    getLatest: (options) => ipcRenderer.invoke(IPC_CHANNELS.GET_LATEST, options),
    getBuiltinVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_BUILTIN_VERSION),

    // Delay Methods
    setMultiDelay: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_MULTI_DELAY, options),
    cancelDelay: () => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_DELAY),

    // Channel Methods
    setChannel: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_CHANNEL, options),
    unsetChannel: (options) => ipcRenderer.invoke(IPC_CHANNELS.UNSET_CHANNEL, options),
    getChannel: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CHANNEL),
    listChannels: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_CHANNELS),

    // Device Methods
    getDeviceId: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DEVICE_ID),
    setCustomId: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_CUSTOM_ID, options),

    // Plugin Info Methods
    getPluginVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PLUGIN_VERSION),
    isAutoUpdateEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.IS_AUTO_UPDATE_ENABLED),
    isAutoUpdateAvailable: () => ipcRenderer.invoke(IPC_CHANNELS.IS_AUTO_UPDATE_AVAILABLE),

    // Dynamic Config Methods
    setUpdateUrl: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_UPDATE_URL, options),
    setStatsUrl: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_STATS_URL, options),
    setChannelUrl: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_CHANNEL_URL, options),
    setAppId: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_APP_ID, options),
    getAppId: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_ID),

    // Debug Methods
    setDebugMenu: (options) => ipcRenderer.invoke(IPC_CHANNELS.SET_DEBUG_MENU, options),
    isDebugMenuEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.IS_DEBUG_MENU_ENABLED),

    // Event Methods
    addListener: (event: UpdaterEventName, callback: (data: unknown) => void): ListenerHandle => {
      const channel = getEventChannel(event);

      if (!listeners.has(channel)) {
        listeners.set(channel, new Set());
      }
      listeners.get(channel)!.add(callback);

      const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
        callback(data);
      };

      ipcRenderer.on(channel, handler);

      return {
        remove: () => {
          ipcRenderer.removeListener(channel, handler);
          listeners.get(channel)?.delete(callback);
        },
      };
    },

    removeAllListeners: async () => {
      // Remove local listeners
      for (const [channel, callbacks] of listeners) {
        callbacks.forEach(() => {
          ipcRenderer.removeAllListeners(channel);
        });
        callbacks.clear();
      }
      listeners.clear();

      // Notify main process
      await ipcRenderer.invoke(IPC_CHANNELS.REMOVE_ALL_LISTENERS);
    },
  };
}

/**
 * Get the IPC channel for an event
 */
function getEventChannel(event: UpdaterEventName): string {
  const channelMap: Record<UpdaterEventName, string> = {
    download: IPC_CHANNELS.EVENT_DOWNLOAD,
    updateAvailable: IPC_CHANNELS.EVENT_UPDATE_AVAILABLE,
    noNeedUpdate: IPC_CHANNELS.EVENT_NO_NEED_UPDATE,
    downloadComplete: IPC_CHANNELS.EVENT_DOWNLOAD_COMPLETE,
    downloadFailed: IPC_CHANNELS.EVENT_DOWNLOAD_FAILED,
    breakingAvailable: IPC_CHANNELS.EVENT_BREAKING_AVAILABLE,
    majorAvailable: IPC_CHANNELS.EVENT_MAJOR_AVAILABLE,
    updateFailed: IPC_CHANNELS.EVENT_UPDATE_FAILED,
    appReloaded: IPC_CHANNELS.EVENT_APP_RELOADED,
    appReady: IPC_CHANNELS.EVENT_APP_READY,
  };

  return channelMap[event];
}

/**
 * Expose the updater API to the renderer process
 *
 * @param apiKey - The key to expose the API under (default: 'electronUpdater')
 */
export function exposeUpdaterAPI(apiKey: string = 'electronUpdater'): void {
  contextBridge.exposeInMainWorld(apiKey, createUpdaterAPI());
}

// Export types for consumers
export type {
  AppReadyResult,
  BundleInfo,
  BundleId,
  CurrentBundleResult,
  BundleListResult,
  ListOptions,
  ResetOptions,
  DownloadOptions,
  LatestVersion,
  GetLatestOptions,
  BuiltinVersion,
  MultiDelayConditions,
  SetChannelOptions,
  UnsetChannelOptions,
  ChannelRes,
  GetChannelRes,
  ListChannelsResult,
  DeviceId,
  SetCustomIdOptions,
  PluginVersion,
  AutoUpdateEnabled,
  AutoUpdateAvailable,
  UpdateUrl,
  StatsUrl,
  ChannelUrl,
  SetAppIdOptions,
  GetAppIdRes,
  SetDebugMenuOptions,
  DebugMenuEnabled,
  UpdateFailedEvent,
  UpdaterEventName,
  ListenerHandle,
  DownloadEvent,
  UpdateAvailableEvent,
  NoNeedEvent,
  DownloadCompleteEvent,
  DownloadFailedEvent,
  BreakingAvailableEvent,
  AppReadyEvent,
};
