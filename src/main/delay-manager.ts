/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Delay Manager
 * Handles conditional update delays
 */

import type { DelayCondition, MultiDelayConditions } from '../shared/types';
import type { StorageManager } from './storage';

export class DelayManager {
  private storage: StorageManager;
  private appVersion: string;
  private backgroundStartTime: number | null = null;
  private wasKilled: boolean = false;

  constructor(storage: StorageManager, appVersion: string) {
    this.storage = storage;
    this.appVersion = appVersion;
  }

  /**
   * Set multiple delay conditions
   */
  async setMultiDelay(options: MultiDelayConditions): Promise<void> {
    this.storage.setDelayConditions(options.delayConditions);
    await this.storage.save();
  }

  /**
   * Cancel all delay conditions
   */
  async cancelDelay(): Promise<void> {
    this.storage.clearDelayConditions();
    await this.storage.save();
  }

  /**
   * Get current delay conditions
   */
  getDelayConditions(): DelayCondition[] {
    return this.storage.getDelayConditions();
  }

  /**
   * Check if all delay conditions are satisfied
   */
  areConditionsSatisfied(): boolean {
    const conditions = this.getDelayConditions();

    if (conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      if (!this.isConditionSatisfied(condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a single condition is satisfied
   */
  private isConditionSatisfied(condition: DelayCondition): boolean {
    switch (condition.kind) {
      case 'background':
        return this.isBackgroundConditionSatisfied(condition.value);
      case 'kill':
        return this.wasKilled;
      case 'date':
        return this.isDateConditionSatisfied(condition.value);
      case 'nativeVersion':
        return this.isVersionConditionSatisfied(condition.value);
      default:
        return true;
    }
  }

  /**
   * Check background condition
   */
  private isBackgroundConditionSatisfied(value?: string): boolean {
    if (!this.backgroundStartTime) {
      return false;
    }

    if (!value) {
      // No duration specified, just needs to be backgrounded
      return true;
    }

    const requiredMs = parseInt(value, 10);
    if (isNaN(requiredMs)) {
      return true;
    }

    const elapsedMs = Date.now() - this.backgroundStartTime;
    return elapsedMs >= requiredMs;
  }

  /**
   * Check date condition
   */
  private isDateConditionSatisfied(value?: string): boolean {
    if (!value) {
      return true;
    }

    try {
      const targetDate = new Date(value);
      return Date.now() >= targetDate.getTime();
    } catch {
      return true;
    }
  }

  /**
   * Check native version condition
   */
  private isVersionConditionSatisfied(value?: string): boolean {
    if (!value) {
      return true;
    }

    return this.compareVersions(this.appVersion, value) >= 0;
  }

  /**
   * Compare semver versions
   * Returns: -1 if a < b, 0 if a == b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map((p) => parseInt(p, 10) || 0);
    const partsB = b.split('.').map((p) => parseInt(p, 10) || 0);

    const maxLength = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLength; i++) {
      const numA = partsA[i] ?? 0;
      const numB = partsB[i] ?? 0;

      if (numA < numB) return -1;
      if (numA > numB) return 1;
    }

    return 0;
  }

  /**
   * Notify that app went to background
   */
  onBackground(): void {
    if (!this.backgroundStartTime) {
      this.backgroundStartTime = Date.now();
    }
  }

  /**
   * Notify that app came to foreground
   */
  onForeground(): void {
    this.backgroundStartTime = null;
  }

  /**
   * Notify that app was killed and restarted
   */
  onAppStart(): void {
    // Check if there's a kill condition - if conditions exist and previous session
    // didn't complete, assume it was killed
    const conditions = this.getDelayConditions();
    const hasKillCondition = conditions.some((c) => c.kind === 'kill');

    if (hasKillCondition) {
      this.wasKilled = true;
    }
  }

  /**
   * Reset kill state after conditions are cleared
   */
  resetKillState(): void {
    this.wasKilled = false;
  }
}
