/**
 * Device Manager
 * Handles device identification and custom IDs
 */

import type { DeviceId, SetCustomIdOptions } from '../shared/types';
import type { StorageManager } from './storage';

export class DeviceManager {
  private storage: StorageManager;
  private persistCustomId: boolean;

  constructor(storage: StorageManager, persistCustomId: boolean = false) {
    this.storage = storage;
    this.persistCustomId = persistCustomId;
  }

  /**
   * Get the device ID
   */
  getDeviceId(): DeviceId {
    return {
      deviceId: this.storage.getDeviceId(),
    };
  }

  /**
   * Set a custom ID
   */
  async setCustomId(options: SetCustomIdOptions): Promise<void> {
    const customId = options.customId.trim() || null;

    if (this.persistCustomId) {
      this.storage.setCustomId(customId);
      await this.storage.save();
    } else {
      // Store in memory only (will be lost on restart)
      this.storage.setCustomId(customId);
    }
  }

  /**
   * Get the custom ID
   */
  getCustomId(): string | null {
    return this.storage.getCustomId();
  }

  /**
   * Clear the custom ID
   */
  async clearCustomId(): Promise<void> {
    this.storage.setCustomId(null);
    if (this.persistCustomId) {
      await this.storage.save();
    }
  }
}
