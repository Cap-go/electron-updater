/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Electron Updater
 * Main class that coordinates all update functionality
 */

import { app, BrowserWindow } from 'electron';
import * as os from 'os';
import type {
  ElectronUpdaterConfig,
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
  AppReadyResult,
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
  UpdaterEventCallback,
  ListenerHandle,
  DownloadEvent,
} from '../shared/types';
import { UpdaterEventEmitter } from '../shared/events';
import { DEFAULT_CONFIG, PLUGIN_VERSION, MIN_PERIOD_CHECK_DELAY } from '../shared/constants';
import { StorageManager } from './storage';
import { CryptoManager } from './crypto';
import { DownloadManager } from './download-manager';
import { BundleManager } from './bundle-manager';
import { DelayManager } from './delay-manager';
import { ChannelManager } from './channel-manager';
import { StatsManager } from './stats';
import { DeviceManager } from './device';
import { DebugMenu } from './debug-menu';

const KEY_ID_LENGTH = 20;

interface LatestRequestPayload {
  platform: string;
  device_id: string;
  app_id: string;
  custom_id?: string | null;
  version_build: string;
  version_code: string;
  version_os: string;
  version_name: string;
  plugin_version: string;
  is_emulator: boolean;
  is_prod: boolean;
  defaultChannel?: string;
  key_id?: string;
}

export class ElectronUpdater {
  private config: Required<ElectronUpdaterConfig>;
  private storage!: StorageManager;
  private crypto!: CryptoManager;
  private downloadManager!: DownloadManager;
  private bundleManager!: BundleManager;
  private delayManager!: DelayManager;
  private channelManager!: ChannelManager;
  private statsManager!: StatsManager;
  private deviceManager!: DeviceManager;
  private debugMenu!: DebugMenu;
  private eventEmitter: UpdaterEventEmitter;

  private initialized: boolean = false;
  private appReadyReceived: boolean = false;
  private appReadyTimeout: NodeJS.Timeout | null = null;
  private periodCheckInterval: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;
  private builtinPath: string = '';

  constructor(config: ElectronUpdaterConfig = {}) {
    this.config = this.mergeConfig(config);
    this.eventEmitter = new UpdaterEventEmitter();
  }

  private mergeConfig(config: ElectronUpdaterConfig): Required<ElectronUpdaterConfig> {
    return {
      appReadyTimeout: config.appReadyTimeout ?? DEFAULT_CONFIG.appReadyTimeout,
      responseTimeout: config.responseTimeout ?? DEFAULT_CONFIG.responseTimeout,
      autoUpdate: config.autoUpdate ?? DEFAULT_CONFIG.autoUpdate,
      autoDeleteFailed: config.autoDeleteFailed ?? DEFAULT_CONFIG.autoDeleteFailed,
      autoDeletePrevious: config.autoDeletePrevious ?? DEFAULT_CONFIG.autoDeletePrevious,
      resetWhenUpdate: config.resetWhenUpdate ?? DEFAULT_CONFIG.resetWhenUpdate,
      updateUrl: config.updateUrl ?? DEFAULT_CONFIG.updateUrl,
      channelUrl: config.channelUrl ?? DEFAULT_CONFIG.channelUrl,
      statsUrl: config.statsUrl ?? DEFAULT_CONFIG.statsUrl,
      publicKey: config.publicKey ?? '',
      version: config.version ?? app.getVersion(),
      appId: config.appId ?? '',
      directUpdate: config.directUpdate ?? DEFAULT_CONFIG.directUpdate,
      defaultChannel: config.defaultChannel ?? '',
      allowModifyUrl: config.allowModifyUrl ?? DEFAULT_CONFIG.allowModifyUrl,
      allowModifyAppId: config.allowModifyAppId ?? DEFAULT_CONFIG.allowModifyAppId,
      allowManualBundleError: config.allowManualBundleError ?? DEFAULT_CONFIG.allowManualBundleError,
      persistCustomId: config.persistCustomId ?? DEFAULT_CONFIG.persistCustomId,
      persistModifyUrl: config.persistModifyUrl ?? DEFAULT_CONFIG.persistModifyUrl,
      keepUrlPathAfterReload: config.keepUrlPathAfterReload ?? DEFAULT_CONFIG.keepUrlPathAfterReload,
      disableJSLogging: config.disableJSLogging ?? DEFAULT_CONFIG.disableJSLogging,
      debugMenu: config.debugMenu ?? DEFAULT_CONFIG.debugMenu,
      periodCheckDelay: config.periodCheckDelay ?? DEFAULT_CONFIG.periodCheckDelay,
      localS3: config.localS3 ?? false,
      localHost: config.localHost ?? '',
      localWebHost: config.localWebHost ?? '',
      localSupa: config.localSupa ?? '',
      localSupaAnon: config.localSupaAnon ?? '',
      localApi: config.localApi ?? '',
      localApiFiles: config.localApiFiles ?? '',
    };
  }

  /**
   * Initialize the updater
   * Must be called before using any other methods
   */
  async initialize(mainWindow: BrowserWindow, builtinPath: string): Promise<void> {
    if (this.initialized) return;

    this.mainWindow = mainWindow;
    this.builtinPath = builtinPath;

    // Initialize storage
    this.storage = new StorageManager();
    await this.storage.initialize();

    // Apply persisted URLs if configured
    if (this.config.persistModifyUrl) {
      const savedUpdateUrl = this.storage.getUpdateUrl();
      const savedStatsUrl = this.storage.getStatsUrl();
      const savedChannelUrl = this.storage.getChannelUrl();
      const savedAppId = this.storage.getAppId();

      if (savedUpdateUrl) this.config.updateUrl = savedUpdateUrl;
      if (savedStatsUrl !== undefined) this.config.statsUrl = savedStatsUrl;
      if (savedChannelUrl) this.config.channelUrl = savedChannelUrl;
      if (savedAppId) this.config.appId = savedAppId;
    }

    // Initialize crypto
    this.crypto = new CryptoManager();
    if (this.config.publicKey) {
      this.crypto.setPublicKey(this.config.publicKey);
    }

    // Initialize download manager
    this.downloadManager = new DownloadManager(
      this.storage,
      this.crypto,
      this.config.responseTimeout * 1000
    );

    // Initialize bundle manager
    this.bundleManager = new BundleManager(
      this.storage,
      this.downloadManager,
      this.config.version,
      this.builtinPath,
      this.config.autoDeleteFailed,
      this.config.autoDeletePrevious
    );

    // Initialize delay manager
    this.delayManager = new DelayManager(this.storage, this.config.version);
    this.delayManager.onAppStart();

    // Initialize channel manager
    this.channelManager = new ChannelManager(
      this.storage,
      this.config.channelUrl,
      this.config.appId,
      this.storage.getDeviceId(),
      PLUGIN_VERSION,
      this.config.version,
      this.config.defaultChannel || undefined,
      this.generateKeyId(this.crypto.getPublicKey()),
      this.config.responseTimeout * 1000
    );

    // Initialize stats manager
    this.statsManager = new StatsManager(
      this.storage,
      this.config.statsUrl,
      this.config.appId,
      this.storage.getDeviceId(),
      PLUGIN_VERSION,
      this.config.version,
      this.config.defaultChannel || undefined,
      this.generateKeyId(this.crypto.getPublicKey()),
      this.config.responseTimeout * 1000
    );

    // Initialize device manager
    this.deviceManager = new DeviceManager(this.storage, this.config.persistCustomId);

    // Initialize debug menu
    this.debugMenu = new DebugMenu(this.bundleManager, this.storage);
    if (this.config.debugMenu) {
      this.debugMenu.setEnabled(true, () => this.reload());
    }

    // Setup window event listeners
    this.setupWindowListeners();

    // Apply pending update if conditions are met
    await this.checkAndApplyPendingUpdate();

    // Start periodic update checks if configured
    this.startPeriodicChecks();

    // Cleanup on app quit
    app.on('before-quit', () => this.cleanup());

    this.initialized = true;

    // Log initialization
    if (!this.config.disableJSLogging) {
      console.log('[ElectronUpdater] Initialized');
    }
  }

  private setupWindowListeners(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on('blur', () => {
      this.delayManager.onBackground();
      this.checkAndApplyPendingUpdate();
    });

    this.mainWindow.on('focus', () => {
      this.delayManager.onForeground();
    });
  }

  private async checkAndApplyPendingUpdate(): Promise<void> {
    const nextBundle = await this.bundleManager.getNextBundle();
    if (!nextBundle) return;

    if (this.delayManager.areConditionsSatisfied()) {
      const result = await this.bundleManager.applyPendingUpdate();
      if (result.applied) {
        this.delayManager.resetKillState();
        await this.storage.save();

        // Emit reload event
        this.eventEmitter.emit('appReloaded', undefined);

        // Reload the window
        await this.reload();
      }
    }
  }

  private startPeriodicChecks(): void {
    if (this.periodCheckInterval) {
      clearInterval(this.periodCheckInterval);
    }

    if (this.config.periodCheckDelay >= MIN_PERIOD_CHECK_DELAY && this.config.autoUpdate) {
      this.periodCheckInterval = setInterval(
        () => this.checkForUpdates(),
        this.config.periodCheckDelay * 1000
      );
    }
  }

  private async checkForUpdates(): Promise<void> {
    if (!this.config.autoUpdate) return;

    try {
      const latest = await this.getLatest();

      if (latest.error === 'no_new_version_available') {
        const current = await this.current();
        this.eventEmitter.emit('noNeedUpdate', { bundle: current.bundle });
        return;
      }

      if (latest.url && latest.version) {
        this.eventEmitter.emit('updateAvailable', {
          bundle: {
            id: '',
            version: latest.version,
            downloaded: '',
            checksum: latest.checksum ?? '',
            status: 'pending',
          },
        });

        // Handle breaking changes
        if (latest.breaking) {
          this.eventEmitter.emit('breakingAvailable', { version: latest.version });
          this.eventEmitter.emit('majorAvailable', { version: latest.version });
          return;
        }

        // Auto-download
        const bundle = await this.download({
          url: latest.url,
          version: latest.version,
          checksum: latest.checksum,
          sessionKey: latest.sessionKey,
          manifest: latest.manifest,
        });

        this.eventEmitter.emit('downloadComplete', { bundle });

        // Set as next or apply directly based on directUpdate mode
        if (this.shouldDirectUpdate()) {
          await this.set({ id: bundle.id });
        } else {
          await this.next({ id: bundle.id });
        }
      }
    } catch (error) {
      if (!this.config.disableJSLogging) {
        console.error('[ElectronUpdater] Auto-update check failed:', error);
      }
    }
  }

  private shouldDirectUpdate(): boolean {
    if (this.config.directUpdate === true || this.config.directUpdate === 'always') {
      return true;
    }
    // For 'atInstall' and 'onLaunch', we'd need to track app state
    // For simplicity, treat them as false for now
    return false;
  }

  private cleanup(): void {
    if (this.appReadyTimeout) {
      clearTimeout(this.appReadyTimeout);
    }
    if (this.periodCheckInterval) {
      clearInterval(this.periodCheckInterval);
    }
    this.debugMenu.cleanup();
  }

  // ============================================================================
  // Core Update Methods
  // ============================================================================

  /**
   * Notify that app is ready - must be called on every launch
   */
  async notifyAppReady(): Promise<AppReadyResult> {
    if (this.appReadyTimeout) {
      clearTimeout(this.appReadyTimeout);
      this.appReadyTimeout = null;
    }

    this.appReadyReceived = true;
    await this.bundleManager.markBundleSuccessful();

    const current = await this.current();

    // Send success stats
    await this.statsManager.sendUpdateSuccess(current.bundle.version, current.bundle.id);

    // Emit event
    this.eventEmitter.emit('appReady', {
      bundle: current.bundle,
      status: 'ok',
    });

    return { bundle: current.bundle };
  }

  /**
   * Download a bundle
   */
  async download(options: DownloadOptions): Promise<BundleInfo> {
    try {
      const bundle = await this.downloadManager.downloadBundle(options, (event: DownloadEvent) => {
        this.eventEmitter.emit('download', event);
      });

      await this.statsManager.sendDownloadComplete(options.version, bundle.id);

      return bundle;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.statsManager.sendDownloadFailed(options.version, message);
      this.eventEmitter.emit('downloadFailed', { version: options.version });
      throw error;
    }
  }

  /**
   * Set next bundle to load
   */
  async next(options: BundleId): Promise<BundleInfo> {
    return this.bundleManager.next(options);
  }

  /**
   * Set current bundle and reload
   */
  async set(options: BundleId): Promise<void> {
    await this.bundleManager.set(options);
    await this.reload();
  }

  /**
   * Reload the app
   */
  async reload(): Promise<void> {
    if (!this.mainWindow) return;

    const bundlePath = this.bundleManager.getCurrentBundlePath();

    // Start app ready timeout for rollback protection
    this.appReadyReceived = false;
    this.appReadyTimeout = setTimeout(async () => {
      if (!this.appReadyReceived) {
        if (!this.config.disableJSLogging) {
          console.warn('[ElectronUpdater] App ready timeout - rolling back');
        }

        const current = await this.current();
        await this.statsManager.sendUpdateFailed(
          current.bundle.version,
          current.bundle.id,
          'App ready timeout'
        );

        this.eventEmitter.emit('updateFailed', { bundle: current.bundle });

        // Reload with rolled back bundle
        const newPath = this.bundleManager.getCurrentBundlePath();
        this.mainWindow?.loadFile(newPath);
      }
    }, this.config.appReadyTimeout);

    // Emit reload event
    this.eventEmitter.emit('appReloaded', undefined);

    // Load the bundle
    await this.mainWindow.loadFile(bundlePath);
  }

  /**
   * Delete a bundle
   */
  async delete(options: BundleId): Promise<void> {
    return this.bundleManager.deleteBundle(options);
  }

  /**
   * Mark bundle as error (manual mode only)
   */
  async setBundleError(options: BundleId): Promise<BundleInfo> {
    return this.bundleManager.setBundleError(options, this.config.allowManualBundleError);
  }

  // ============================================================================
  // Bundle Information Methods
  // ============================================================================

  /**
   * Get current bundle info
   */
  async current(): Promise<CurrentBundleResult> {
    return this.bundleManager.current();
  }

  /**
   * List all bundles
   */
  async list(options?: ListOptions): Promise<BundleListResult> {
    return this.bundleManager.list(options);
  }

  /**
   * Get next bundle
   */
  async getNextBundle(): Promise<BundleInfo | null> {
    return this.bundleManager.getNextBundle();
  }

  /**
   * Get failed update info
   */
  async getFailedUpdate(): Promise<UpdateFailedEvent | null> {
    return this.bundleManager.getFailedUpdate();
  }

  /**
   * Reset to builtin or last successful
   */
  async reset(options?: ResetOptions): Promise<void> {
    await this.bundleManager.reset(options);
    await this.reload();
  }

  // ============================================================================
  // Update Checking Methods
  // ============================================================================

  /**
   * Get latest version from server
   */
  async getLatest(options?: GetLatestOptions): Promise<LatestVersion> {
    const current = await this.current();
    const channel = options?.channel ?? this.channelManager.getEffectiveChannel();

    const url = new URL(this.config.updateUrl);

    const customId = this.storage.getCustomId();
    const publicKey = this.crypto.getPublicKey();
    const keyId = this.generateKeyId(publicKey);

    const payload: LatestRequestPayload = {
      platform: 'electron',
      device_id: this.storage.getDeviceId(),
      app_id: this.config.appId,
      custom_id: customId,
      version_build: this.config.version,
      version_code: app.getVersion(),
      version_os: os.release(),
      version_name: current.bundle.version,
      plugin_version: PLUGIN_VERSION,
      is_emulator: false,
      is_prod: app.isPackaged,
      defaultChannel: channel ?? this.config.defaultChannel,
      key_id: keyId,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.responseTimeout * 1000
      );

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.buildUserAgent(),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as LatestVersion;

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        version: '',
        error: message,
      };
    }
  }

  private generateKeyId(publicKey: string | null): string | undefined {
    if (!publicKey) return undefined;

    const cleaned = publicKey
      .replace(/-----BEGIN [^-]+-----/g, '')
      .replace(/-----END [^-]+-----/g, '')
      .replace(/\s+/g, '');

    if (!cleaned.length) return undefined;

    return cleaned.slice(0, KEY_ID_LENGTH);
  }

  private buildUserAgent(): string {
    const appId = this.config.appId || 'missing-app-id';
    return `CapacitorUpdater/${PLUGIN_VERSION} (${appId}) electron/${os.release()}`;
  }

  /**
   * Get builtin version
   */
  async getBuiltinVersion(): Promise<BuiltinVersion> {
    return {
      version: this.config.version,
    };
  }

  // ============================================================================
  // Delay Methods
  // ============================================================================

  /**
   * Set delay conditions
   */
  async setMultiDelay(options: MultiDelayConditions): Promise<void> {
    return this.delayManager.setMultiDelay(options);
  }

  /**
   * Cancel delay conditions
   */
  async cancelDelay(): Promise<void> {
    return this.delayManager.cancelDelay();
  }

  // ============================================================================
  // Channel Methods
  // ============================================================================

  /**
   * Set channel
   */
  async setChannel(options: SetChannelOptions): Promise<ChannelRes> {
    const result = await this.channelManager.setChannel(options);

    if (options.triggerAutoUpdate && this.config.autoUpdate) {
      this.checkForUpdates();
    }

    return result;
  }

  /**
   * Unset channel
   */
  async unsetChannel(options?: UnsetChannelOptions): Promise<void> {
    await this.channelManager.unsetChannel(options);

    if (options?.triggerAutoUpdate && this.config.autoUpdate) {
      this.checkForUpdates();
    }
  }

  /**
   * Get current channel
   */
  async getChannel(): Promise<GetChannelRes> {
    return this.channelManager.getChannel();
  }

  /**
   * List available channels
   */
  async listChannels(): Promise<ListChannelsResult> {
    return this.channelManager.listChannels();
  }

  // ============================================================================
  // Device Methods
  // ============================================================================

  /**
   * Get device ID
   */
  async getDeviceId(): Promise<DeviceId> {
    return this.deviceManager.getDeviceId();
  }

  /**
   * Set custom ID
   */
  async setCustomId(options: SetCustomIdOptions): Promise<void> {
    return this.deviceManager.setCustomId(options);
  }

  // ============================================================================
  // Plugin Info Methods
  // ============================================================================

  /**
   * Get plugin version
   */
  async getPluginVersion(): Promise<PluginVersion> {
    return { version: PLUGIN_VERSION };
  }

  /**
   * Check if auto-update is enabled
   */
  async isAutoUpdateEnabled(): Promise<AutoUpdateEnabled> {
    return { enabled: this.config.autoUpdate };
  }

  /**
   * Check if auto-update is available
   */
  async isAutoUpdateAvailable(): Promise<AutoUpdateAvailable> {
    // Available if using default Capgo URL
    return {
      available: this.config.updateUrl === DEFAULT_CONFIG.updateUrl,
    };
  }

  // ============================================================================
  // Dynamic Config Methods
  // ============================================================================

  /**
   * Set update URL
   */
  async setUpdateUrl(options: UpdateUrl): Promise<void> {
    if (!this.config.allowModifyUrl) {
      throw new Error('URL modification not allowed');
    }

    this.config.updateUrl = options.url;

    if (this.config.persistModifyUrl) {
      this.storage.setUpdateUrl(options.url);
      await this.storage.save();
    }
  }

  /**
   * Set stats URL
   */
  async setStatsUrl(options: StatsUrl): Promise<void> {
    if (!this.config.allowModifyUrl) {
      throw new Error('URL modification not allowed');
    }

    this.config.statsUrl = options.url;
    this.statsManager.setStatsUrl(options.url);

    if (this.config.persistModifyUrl) {
      this.storage.setStatsUrl(options.url);
      await this.storage.save();
    }
  }

  /**
   * Set channel URL
   */
  async setChannelUrl(options: ChannelUrl): Promise<void> {
    if (!this.config.allowModifyUrl) {
      throw new Error('URL modification not allowed');
    }

    this.config.channelUrl = options.url;
    this.channelManager.setChannelUrl(options.url);

    if (this.config.persistModifyUrl) {
      this.storage.setChannelUrl(options.url);
      await this.storage.save();
    }
  }

  /**
   * Set app ID
   */
  async setAppId(options: SetAppIdOptions): Promise<void> {
    if (!this.config.allowModifyAppId) {
      throw new Error('App ID modification not allowed');
    }

    this.config.appId = options.appId;
    this.channelManager.setAppId(options.appId);
    this.statsManager.setAppId(options.appId);

    if (this.config.persistModifyUrl) {
      this.storage.setAppId(options.appId);
      await this.storage.save();
    }
  }

  /**
   * Get app ID
   */
  async getAppId(): Promise<GetAppIdRes> {
    return { appId: this.config.appId };
  }

  // ============================================================================
  // Debug Methods
  // ============================================================================

  /**
   * Set debug menu enabled
   */
  async setDebugMenu(options: SetDebugMenuOptions): Promise<void> {
    this.debugMenu.setEnabled(options.enabled, () => this.reload());
  }

  /**
   * Check if debug menu is enabled
   */
  async isDebugMenuEnabled(): Promise<DebugMenuEnabled> {
    return { enabled: this.debugMenu.isEnabled() };
  }

  // ============================================================================
  // Event Methods
  // ============================================================================

  /**
   * Add event listener
   */
  addListener<T extends UpdaterEventName>(
    event: T,
    callback: UpdaterEventCallback<Parameters<typeof this.eventEmitter.emit<T>>[1]>
  ): ListenerHandle {
    return this.eventEmitter.addListener(event, callback);
  }

  /**
   * Remove all listeners
   */
  async removeAllListeners(): Promise<void> {
    this.eventEmitter.removeAllListeners();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get the path to load for current bundle
   */
  getCurrentBundlePath(): string {
    return this.bundleManager.getCurrentBundlePath();
  }

  /**
   * Check if updater is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
