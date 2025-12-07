/**
 * Channel Manager
 * Handles channel operations and communication with server
 */

import type {
  SetChannelOptions,
  UnsetChannelOptions,
  ChannelRes,
  GetChannelRes,
  ChannelInfo,
  ListChannelsResult,
} from '../shared/types';
import type { StorageManager } from './storage';

export class ChannelManager {
  private storage: StorageManager;
  private channelUrl: string;
  private defaultChannel?: string;
  private appId: string;
  private deviceId: string;
  private pluginVersion: string;
  private timeout: number;

  constructor(
    storage: StorageManager,
    channelUrl: string,
    appId: string,
    deviceId: string,
    pluginVersion: string,
    defaultChannel?: string,
    timeout: number = 20000
  ) {
    this.storage = storage;
    this.channelUrl = channelUrl;
    this.appId = appId;
    this.deviceId = deviceId;
    this.pluginVersion = pluginVersion;
    this.defaultChannel = defaultChannel;
    this.timeout = timeout;
  }

  setChannelUrl(url: string): void {
    this.channelUrl = url;
  }

  setAppId(appId: string): void {
    this.appId = appId;
  }

  /**
   * Set channel for this device
   */
  async setChannel(options: SetChannelOptions): Promise<ChannelRes> {
    try {
      const response = await this.makeRequest('POST', {
        channel: options.channel,
        action: 'set',
      });

      const status = String(response.status ?? 'ok');
      if (status === 'ok' || status === 'success') {
        this.storage.setChannel(options.channel);
        await this.storage.save();
      }

      return {
        status,
        error: response.error != null ? String(response.error) : undefined,
        message: response.message != null ? String(response.message) : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        error: message,
      };
    }
  }

  /**
   * Unset channel for this device
   */
  async unsetChannel(_options?: UnsetChannelOptions): Promise<void> {
    try {
      await this.makeRequest('POST', {
        action: 'unset',
      });
    } catch {
      // Ignore errors - local state is what matters
    }

    this.storage.setChannel(null);
    await this.storage.save();
  }

  /**
   * Get current channel
   */
  async getChannel(): Promise<GetChannelRes> {
    try {
      const response = await this.makeRequest('GET');

      return {
        channel: response.channel != null ? String(response.channel) : (this.storage.getChannel() ?? this.defaultChannel),
        allowSet: response.allow_set != null ? Boolean(response.allow_set) : true,
        status: String(response.status ?? 'ok'),
        error: response.error != null ? String(response.error) : undefined,
        message: response.message != null ? String(response.message) : undefined,
      };
    } catch {
      // Return local state on error
      return {
        channel: this.storage.getChannel() ?? this.defaultChannel,
        allowSet: true,
        status: 'ok',
      };
    }
  }

  /**
   * List available channels
   */
  async listChannels(): Promise<ListChannelsResult> {
    try {
      const response = await this.makeRequest('GET', { action: 'list' });

      const rawChannels = Array.isArray(response.channels) ? response.channels : [];
      const channels: ChannelInfo[] = rawChannels.map((ch: Record<string, unknown>) => ({
        id: String(ch.id ?? ''),
        name: String(ch.name ?? ''),
        public: Boolean(ch.public),
        allow_self_set: Boolean(ch.allow_self_set ?? ch.allow_set ?? true),
      }));

      return { channels };
    } catch {
      return { channels: [] };
    }
  }

  /**
   * Get effective channel (local override or default)
   */
  getEffectiveChannel(): string | undefined {
    return this.storage.getChannel() ?? this.defaultChannel;
  }

  /**
   * Make HTTP request to channel API
   */
  private async makeRequest(
    method: 'GET' | 'POST',
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = new URL(this.channelUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'cap_app_id': this.appId,
      'cap_device_id': this.deviceId,
      'cap_plugin_version': this.pluginVersion,
      'cap_platform': 'electron',
    };

    const customId = this.storage.getCustomId();
    if (customId) {
      headers['cap_custom_id'] = customId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
