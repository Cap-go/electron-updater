/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { app } from 'electron';
import * as os from 'os';
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
  private versionBuild: string;
  private keyId?: string;
  private defaultChannel?: string;
  private platform: string = 'android'; // note: currently electron or windows is not supported by capgo backend.
  private timeout: number;
  private enabled: boolean = true;
  private userAgent: string;

  constructor(
    storage: StorageManager,
    statsUrl: string,
    appId: string,
    deviceId: string,
    pluginVersion: string,
    versionBuild: string,
    defaultChannel?: string,
    keyId?: string,
    timeout: number = 20000
  ) {
    this.storage = storage;
    this.statsUrl = statsUrl;
    this.appId = appId;
    this.deviceId = deviceId;
    this.pluginVersion = pluginVersion;
    this.versionBuild = versionBuild;
    this.keyId = keyId;
    this.defaultChannel = defaultChannel;
    this.timeout = timeout;
    this.userAgent = `CapacitorUpdater/${this.pluginVersion} (${this.appId || 'missing-app-id'}) electron/${os.release()}`;

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
   * Make HTTP request to stats API
   */
  private async makeRequest(payload: StatsPayload): Promise<void> {
    const url = new URL(this.statsUrl);

    const channel = this.storage.getChannel();
    const info = this.buildInfoPayload(payload.version ?? this.getCurrentBundleVersion(), channel ?? this.defaultChannel);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.userAgent,
        },
        body: JSON.stringify({
          ...info,
          action: payload.event,
          version_name: info.version_name,
          old_version_name: payload.oldVersion ?? '',
          bundle_id: payload.bundleId,
          message: payload.message,
        }),
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

  private getCurrentBundleVersion(): string {
    const currentId = this.storage.getCurrentBundleId();
    const bundle = this.storage.getBundle(currentId);
    return bundle?.version ?? '';
  }

  private buildInfoPayload(versionName: string, channel?: string | null) {
    return {
      platform: this.platform,
      device_id: this.deviceId,
      app_id: this.appId,
      custom_id: this.storage.getCustomId() ?? undefined,
      version_build: this.versionBuild,
      version_code: app.getVersion(),
      version_os: os.release(),
      version_name: versionName,
      plugin_version: this.pluginVersion,
      is_emulator: false,
      is_prod: app.isPackaged,
      defaultChannel: channel ?? this.defaultChannel,
      key_id: this.keyId,
    };
  }
}
