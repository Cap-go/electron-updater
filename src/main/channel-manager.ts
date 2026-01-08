import { app } from 'electron';
import * as os from 'os';
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
  private versionBuild: string;
  private keyId?: string;
  private appId: string;
  private deviceId: string;
  private pluginVersion: string;
  private timeout: number;
  private userAgent: string;

  constructor(
    storage: StorageManager,
    channelUrl: string,
    appId: string,
    deviceId: string,
    pluginVersion: string,
    versionBuild: string,
    defaultChannel?: string,
    keyId?: string,
    timeout: number = 20000
  ) {
    this.storage = storage;
    this.channelUrl = channelUrl;
    this.appId = appId;
    this.deviceId = deviceId;
    this.pluginVersion = pluginVersion;
    this.versionBuild = versionBuild;
    this.keyId = keyId;
    this.defaultChannel = defaultChannel;
    this.timeout = timeout;
    this.userAgent = `CapacitorUpdater/${this.pluginVersion} (${this.appId || 'missing-app-id'}) electron/${os.release()}`;
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

    const info = this.buildInfoPayload();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      let finalUrl = url.toString();
      let fetchBody: string | undefined;

      if (method === 'GET') {
        const params = new URLSearchParams();
        Object.entries({ ...info, ...body }).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        finalUrl = `${url.toString()}?${params.toString()}`;
      } else {
        fetchBody = JSON.stringify({ ...info, ...body });
      }

      const response = await fetch(finalUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.userAgent,
        },
        body: fetchBody,
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

  private buildInfoPayload() {
    const currentBundleId = this.storage.getCurrentBundleId();
    const bundle = this.storage.getBundle(currentBundleId);

    return {
      platform: 'android', // note: currently electron or windows is not supported by capgo backend.
      device_id: this.deviceId,
      app_id: this.appId,
      custom_id: this.storage.getCustomId() ?? undefined,
      version_build: this.versionBuild,
      version_code: app.getVersion(),
      version_os: os.release(),
      version_name: bundle?.version ?? '',
      plugin_version: this.pluginVersion,
      is_emulator: false,
      is_prod: app.isPackaged,
      defaultChannel: this.storage.getChannel() ?? this.defaultChannel,
      key_id: this.keyId,
    };
  }
}
