/**
 * Electron Updater - Renderer Process Entry Point
 *
 * Provides type-safe access to the updater API exposed by the preload script
 *
 * @example
 * ```typescript
 * // In your renderer code
 * import { getUpdater } from '@capgo/electron-updater/renderer';
 *
 * const updater = getUpdater();
 *
 * // Notify app is ready
 * await updater.notifyAppReady();
 *
 * // Check for updates
 * const latest = await updater.getLatest();
 * if (latest.url) {
 *   const bundle = await updater.download({
 *     url: latest.url,
 *     version: latest.version,
 *   });
 *   await updater.next({ id: bundle.id });
 * }
 *
 * // Listen for events
 * updater.addListener('download', (event) => {
 *   console.log('Download progress:', event.percent);
 * });
 * ```
 */

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
  MajorAvailableEvent,
  AppReadyEvent,
} from '../shared/types';

/**
 * Electron Updater API interface
 */
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
  addListener: <T extends UpdaterEventName>(
    event: T,
    callback: (data: EventDataMap[T]) => void
  ) => ListenerHandle;
  removeAllListeners: () => Promise<void>;
}

/**
 * Event data type mapping
 */
export interface EventDataMap {
  download: DownloadEvent;
  updateAvailable: UpdateAvailableEvent;
  noNeedUpdate: NoNeedEvent;
  downloadComplete: DownloadCompleteEvent;
  downloadFailed: DownloadFailedEvent;
  breakingAvailable: BreakingAvailableEvent;
  majorAvailable: MajorAvailableEvent;
  updateFailed: UpdateFailedEvent;
  appReloaded: void;
  appReady: AppReadyEvent;
}

// Declare the global window interface
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const window: any;
  interface Window {
    electronUpdater?: ElectronUpdaterAPI;
  }
}

/**
 * Get the updater API from the window object
 *
 * @param apiKey - The key the API was exposed under (default: 'electronUpdater')
 * @returns The updater API or undefined if not available
 */
export function getUpdater(apiKey: string = 'electronUpdater'): ElectronUpdaterAPI | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return (window as Record<string, unknown>)[apiKey] as ElectronUpdaterAPI | undefined;
}

/**
 * Get the updater API, throwing if not available
 *
 * @param apiKey - The key the API was exposed under (default: 'electronUpdater')
 * @returns The updater API
 * @throws Error if the API is not available
 */
export function requireUpdater(apiKey: string = 'electronUpdater'): ElectronUpdaterAPI {
  const updater = getUpdater(apiKey);
  if (!updater) {
    throw new Error(
      `Electron Updater API not found. Make sure you've called exposeUpdaterAPI() in your preload script and the API key matches ('${apiKey}').`
    );
  }
  return updater;
}

/**
 * Check if the updater API is available
 *
 * @param apiKey - The key the API was exposed under (default: 'electronUpdater')
 * @returns True if the API is available
 */
export function isUpdaterAvailable(apiKey: string = 'electronUpdater'): boolean {
  return getUpdater(apiKey) !== undefined;
}

// Re-export types
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
  MajorAvailableEvent,
  AppReadyEvent,
};
