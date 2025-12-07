/**
 * Stats Manager
 * Handles statistics reporting to server
 */

import type { StorageManager } from './storage';
import { STATS_EVENTS } from '../shared/constants';

export type StatsEventType = (typeof STATS_EVENTS)[keyof typeof STATS_EVENTS];

export interface StatsPayload {
  event: StatsEventType;
  version?: string;
  oldVersion?: string;
  bundleId?: string;
  message?: string;
}

export class StatsManager {
  private storage: StorageManager;
  private statsUrl: string;
  private appId: string;
  private deviceId: string;
  private pluginVersion: string;
  private platform: string = 'electron';
  private timeout: number;
  private enabled: boolean = true;

  constructor(
    storage: StorageManager,
    statsUrl: string,
    appId: string,
    deviceId: string,
    pluginVersion: string,
    timeout: number = 20000
  ) {
    this.storage = storage;
    this.statsUrl = statsUrl;
    this.appId = appId;
    this.deviceId = deviceId;
    this.pluginVersion = pluginVersion;
    this.timeout = timeout;

    // Disable if URL is empty
    this.enabled = statsUrl.length > 0;
  }

  setStatsUrl(url: string): void {
    this.statsUrl = url;
    this.enabled = url.length > 0;
  }

  setAppId(appId: string): void {
    this.appId = appId;
  }

  /**
   * Send a stats event
   */
  async sendEvent(payload: StatsPayload): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.makeRequest(payload);
    } catch (error) {
      // Stats failures should not affect app operation
      console.warn('Failed to send stats:', error);
    }
  }

  /**
   * Send no new version event
   */
  async sendNoNewVersion(currentVersion: string): Promise<void> {
    await this.sendEvent({
      event: STATS_EVENTS.NO_NEW,
      version: currentVersion,
    });
  }

  /**
   * Send new version available event
   */
  async sendNewVersionAvailable(newVersion: string, currentVersion: string): Promise<void> {
    await this.sendEvent({
      event: STATS_EVENTS.NEW_AVAILABLE,
      version: newVersion,
      oldVersion: currentVersion,
    });
  }

  /**
   * Send download start event
   */
  async sendDownloadStart(version: string): Promise<void> {
    await this.sendEvent({
      event: STATS_EVENTS.DOWNLOAD_START,
      version,
    });
  }

  /**
   * Send download complete event
   */
  async sendDownloadComplete(version: string, bundleId: string): Promise<void> {
    await this.sendEvent({
      event: STATS_EVENTS.DOWNLOAD_COMPLETE,
      version,
      bundleId,
    });
  }

  /**
   * Send download failed event
   */
  async sendDownloadFailed(version: string, message: string): Promise<void> {
    await this.sendEvent({
      event: STATS_EVENTS.DOWNLOAD_FAILED,
      version,
      message,
    });
  }

  /**
   * Send update success event
   */
  async sendUpdateSuccess(version: string, bundleId: string): Promise<void> {
    await this.sendEvent({
      event: STATS_EVENTS.UPDATE_SUCCESS,
      version,
      bundleId,
    });
  }

  /**
   * Send update failed event
   */
  async sendUpdateFailed(version: string, bundleId: string, message: string): Promise<void> {
    await this.sendEvent({
      event: STATS_EVENTS.UPDATE_FAILED,
      version,
      bundleId,
      message,
    });
  }

  /**
   * Send rollback event
   */
  async sendRollback(fromVersion: string, toVersion: string): Promise<void> {
    await this.sendEvent({
      event: STATS_EVENTS.ROLLBACK,
      version: toVersion,
      oldVersion: fromVersion,
    });
  }

  /**
   * Make HTTP request to stats API
   */
  private async makeRequest(payload: StatsPayload): Promise<void> {
    const url = new URL(this.statsUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'cap_app_id': this.appId,
      'cap_device_id': this.deviceId,
      'cap_plugin_version': this.pluginVersion,
      'cap_platform': this.platform,
    };

    const customId = this.storage.getCustomId();
    if (customId) {
      headers['cap_custom_id'] = customId;
    }

    const channel = this.storage.getChannel();
    if (channel) {
      headers['cap_channel'] = channel;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
