/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { dialog, shell } from 'electron';
import type { NativeUpdatePromptConfig } from '../shared/types';
import type { StorageManager } from './storage';

export class NativeUpdatePromptManager {
  private config: NativeUpdatePromptConfig;
  private storage: StorageManager;
  private nativeVersion: string;

  constructor(config: NativeUpdatePromptConfig, storage: StorageManager, nativeVersion: string) {
    this.config = config;
    this.storage = storage;
    this.nativeVersion = nativeVersion;
  }

  updateConfig(config: NativeUpdatePromptConfig): void {
    this.config = config;
  }

  async maybePrompt(reason: string, storeUrl?: string): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (!this.isCooldownElapsed()) {
      return;
    }

    const title = this.config.title ?? 'Update required';
    const message =
      this.config.message ??
      'A newer version of this app is required before live updates can continue.';
    const detail = reason;

    const buttons = [
      this.config.updateButton ?? 'Update',
      this.config.laterButton ?? 'Later',
    ];

    const result = await dialog.showMessageBox({
      type: 'info',
      title,
      message,
      detail,
      buttons,
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (result.response === 0 && storeUrl) {
      try {
        const parsed = new URL(storeUrl);
        if (parsed.protocol === 'https:') {
          await shell.openExternal(storeUrl);
        }
      } catch {
        // Ignore malformed store URLs
      }
    }

    this.storage.setNativeUpdatePromptShownAt(this.nativeVersion, Date.now());
    await this.storage.save();
  }

  private isCooldownElapsed(): boolean {
    const hours = this.config.cooldownHours ?? 24;
    const lastShown = this.storage.getNativeUpdatePromptShownAt(this.nativeVersion);
    if (!lastShown) {
      return true;
    }
    const elapsedMs = Date.now() - lastShown;
    return elapsedMs >= hours * 60 * 60 * 1000;
  }
}
