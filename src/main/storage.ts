/**
 * Storage Manager
 * Handles persistent storage for bundles and configuration
 */

import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { StorageData, BundleManifest, BundleInfo, DelayCondition, UpdateFailedEvent } from '../shared/types';
import { BUNDLES_DIR, STORAGE_FILE, BUILTIN_BUNDLE_ID } from '../shared/constants';

export class StorageManager {
  private storagePath: string;
  private bundlesPath: string;
  private data: StorageData | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storagePath = path.join(userDataPath, STORAGE_FILE);
    this.bundlesPath = path.join(userDataPath, BUNDLES_DIR);
  }

  async initialize(): Promise<void> {
    // Ensure bundles directory exists
    await fs.promises.mkdir(this.bundlesPath, { recursive: true });

    // Load or create storage data
    this.data = await this.loadStorage();
  }

  private async loadStorage(): Promise<StorageData> {
    try {
      if (fs.existsSync(this.storagePath)) {
        const rawData = await fs.promises.readFile(this.storagePath, 'utf-8');
        const data = JSON.parse(rawData) as StorageData;

        // Decrypt device ID if safeStorage is available
        if (safeStorage.isEncryptionAvailable() && data.deviceId) {
          try {
            const buffer = Buffer.from(data.deviceId, 'base64');
            data.deviceId = safeStorage.decryptString(buffer);
          } catch {
            // If decryption fails, the deviceId might not be encrypted yet
          }
        }

        return data;
      }
    } catch (error) {
      console.error('Failed to load storage:', error);
    }

    // Create default storage
    return this.createDefaultStorage();
  }

  private createDefaultStorage(): StorageData {
    const deviceId = crypto.randomUUID();
    return {
      deviceId,
      manifest: this.createDefaultManifest(),
    };
  }

  private createDefaultManifest(): BundleManifest {
    return {
      bundles: {},
      currentBundleId: BUILTIN_BUNDLE_ID,
      nextBundleId: null,
      lastSuccessfulBundleId: null,
      failedUpdate: null,
      delayConditions: [],
      customId: null,
      channel: null,
    };
  }

  async save(): Promise<void> {
    if (!this.data) return;

    const dataToSave = { ...this.data };

    // Encrypt device ID if safeStorage is available
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = safeStorage.encryptString(this.data.deviceId);
        dataToSave.deviceId = encrypted.toString('base64');
      } catch {
        // Keep unencrypted if encryption fails
      }
    }

    await fs.promises.writeFile(this.storagePath, JSON.stringify(dataToSave, null, 2));
  }

  // Device ID
  getDeviceId(): string {
    return this.data?.deviceId ?? '';
  }

  // Bundle Management
  getBundlesPath(): string {
    return this.bundlesPath;
  }

  getBundlePath(bundleId: string): string {
    return path.join(this.bundlesPath, bundleId);
  }

  getManifest(): BundleManifest {
    return this.data?.manifest ?? this.createDefaultManifest();
  }

  setManifest(manifest: BundleManifest): void {
    if (this.data) {
      this.data.manifest = manifest;
    }
  }

  getBundle(bundleId: string): BundleInfo | null {
    return this.data?.manifest.bundles[bundleId] ?? null;
  }

  setBundle(bundleId: string, bundle: BundleInfo): void {
    if (this.data) {
      this.data.manifest.bundles[bundleId] = bundle;
    }
  }

  deleteBundle(bundleId: string): void {
    if (this.data) {
      delete this.data.manifest.bundles[bundleId];
    }
  }

  getAllBundles(): BundleInfo[] {
    return Object.values(this.data?.manifest.bundles ?? {});
  }

  // Current Bundle
  getCurrentBundleId(): string {
    return this.data?.manifest.currentBundleId ?? BUILTIN_BUNDLE_ID;
  }

  setCurrentBundleId(bundleId: string): void {
    if (this.data) {
      this.data.manifest.currentBundleId = bundleId;
    }
  }

  // Next Bundle
  getNextBundleId(): string | null {
    return this.data?.manifest.nextBundleId ?? null;
  }

  setNextBundleId(bundleId: string | null): void {
    if (this.data) {
      this.data.manifest.nextBundleId = bundleId;
    }
  }

  // Last Successful Bundle
  getLastSuccessfulBundleId(): string | null {
    return this.data?.manifest.lastSuccessfulBundleId ?? null;
  }

  setLastSuccessfulBundleId(bundleId: string | null): void {
    if (this.data) {
      this.data.manifest.lastSuccessfulBundleId = bundleId;
    }
  }

  // Failed Update
  getFailedUpdate(): UpdateFailedEvent | null {
    return this.data?.manifest.failedUpdate ?? null;
  }

  setFailedUpdate(update: UpdateFailedEvent | null): void {
    if (this.data) {
      this.data.manifest.failedUpdate = update;
    }
  }

  clearFailedUpdate(): UpdateFailedEvent | null {
    const failed = this.getFailedUpdate();
    this.setFailedUpdate(null);
    return failed;
  }

  // Delay Conditions
  getDelayConditions(): DelayCondition[] {
    return this.data?.manifest.delayConditions ?? [];
  }

  setDelayConditions(conditions: DelayCondition[]): void {
    if (this.data) {
      this.data.manifest.delayConditions = conditions;
    }
  }

  clearDelayConditions(): void {
    this.setDelayConditions([]);
  }

  // Custom ID
  getCustomId(): string | null {
    return this.data?.manifest.customId ?? null;
  }

  setCustomId(customId: string | null): void {
    if (this.data) {
      this.data.manifest.customId = customId;
    }
  }

  // Channel
  getChannel(): string | null {
    return this.data?.manifest.channel ?? null;
  }

  setChannel(channel: string | null): void {
    if (this.data) {
      this.data.manifest.channel = channel;
    }
  }

  // Dynamic URLs
  getUpdateUrl(): string | undefined {
    return this.data?.updateUrl;
  }

  setUpdateUrl(url: string | undefined): void {
    if (this.data) {
      this.data.updateUrl = url;
    }
  }

  getStatsUrl(): string | undefined {
    return this.data?.statsUrl;
  }

  setStatsUrl(url: string | undefined): void {
    if (this.data) {
      this.data.statsUrl = url;
    }
  }

  getChannelUrl(): string | undefined {
    return this.data?.channelUrl;
  }

  setChannelUrl(url: string | undefined): void {
    if (this.data) {
      this.data.channelUrl = url;
    }
  }

  getAppId(): string | undefined {
    return this.data?.appId;
  }

  setAppId(appId: string | undefined): void {
    if (this.data) {
      this.data.appId = appId;
    }
  }

  // Bundle file operations
  async bundleExists(bundleId: string): Promise<boolean> {
    const bundlePath = this.getBundlePath(bundleId);
    try {
      await fs.promises.access(bundlePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteBundleFiles(bundleId: string): Promise<void> {
    const bundlePath = this.getBundlePath(bundleId);
    try {
      await fs.promises.rm(bundlePath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to delete bundle files for ${bundleId}:`, error);
    }
  }

  async cleanupOrphanedBundles(): Promise<void> {
    try {
      const entries = await fs.promises.readdir(this.bundlesPath, { withFileTypes: true });
      const manifestBundleIds = new Set(Object.keys(this.data?.manifest.bundles ?? {}));

      for (const entry of entries) {
        if (entry.isDirectory() && !manifestBundleIds.has(entry.name)) {
          await this.deleteBundleFiles(entry.name);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned bundles:', error);
    }
  }
}
