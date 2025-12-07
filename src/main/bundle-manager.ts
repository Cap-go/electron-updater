/**
 * Bundle Manager
 * Handles bundle lifecycle, activation, and rollback
 */

import * as path from 'path';
import type {
  BundleInfo,
  BundleId,
  CurrentBundleResult,
  BundleListResult,
  ListOptions,
  ResetOptions,
  UpdateFailedEvent,
} from '../shared/types';
import type { StorageManager } from './storage';
import type { DownloadManager } from './download-manager';
import { BUILTIN_BUNDLE_ID } from '../shared/constants';

export class BundleManager {
  private storage: StorageManager;
  private downloadManager: DownloadManager;
  private builtinVersion: string;
  private builtinPath: string;
  private autoDeleteFailed: boolean;
  private autoDeletePrevious: boolean;

  constructor(
    storage: StorageManager,
    downloadManager: DownloadManager,
    builtinVersion: string,
    builtinPath: string,
    autoDeleteFailed: boolean = true,
    autoDeletePrevious: boolean = true
  ) {
    this.storage = storage;
    this.downloadManager = downloadManager;
    this.builtinVersion = builtinVersion;
    this.builtinPath = builtinPath;
    this.autoDeleteFailed = autoDeleteFailed;
    this.autoDeletePrevious = autoDeletePrevious;
  }

  /**
   * Get builtin bundle info
   */
  getBuiltinBundle(): BundleInfo {
    return {
      id: BUILTIN_BUNDLE_ID,
      version: this.builtinVersion,
      downloaded: '',
      checksum: '',
      status: 'success',
    };
  }

  /**
   * Get current bundle information
   */
  async current(): Promise<CurrentBundleResult> {
    const currentId = this.storage.getCurrentBundleId();
    let bundle: BundleInfo;

    if (currentId === BUILTIN_BUNDLE_ID) {
      bundle = this.getBuiltinBundle();
    } else {
      bundle = this.storage.getBundle(currentId) ?? this.getBuiltinBundle();
    }

    return {
      bundle,
      native: this.builtinVersion,
    };
  }

  /**
   * List all bundles
   */
  async list(options?: ListOptions): Promise<BundleListResult> {
    const bundles: BundleInfo[] = [];

    // Add builtin bundle
    bundles.push(this.getBuiltinBundle());

    // Add downloaded bundles
    const storedBundles = this.storage.getAllBundles();

    if (options?.raw) {
      bundles.push(...storedBundles);
    } else {
      // Filter to only bundles that exist on disk
      for (const bundle of storedBundles) {
        const exists = await this.storage.bundleExists(bundle.id);
        if (exists) {
          bundles.push(bundle);
        }
      }
    }

    return { bundles };
  }

  /**
   * Get next bundle to be loaded
   */
  async getNextBundle(): Promise<BundleInfo | null> {
    const nextId = this.storage.getNextBundleId();
    if (!nextId) return null;

    return this.storage.getBundle(nextId) ?? null;
  }

  /**
   * Set next bundle to load on restart
   */
  async next(options: BundleId): Promise<BundleInfo> {
    const bundle = this.storage.getBundle(options.id);
    if (!bundle) {
      throw new Error(`Bundle ${options.id} not found`);
    }

    if (bundle.status !== 'success') {
      throw new Error(`Bundle ${options.id} is not ready (status: ${bundle.status})`);
    }

    // Verify bundle integrity
    const valid = await this.downloadManager.verifyBundleIntegrity(options.id);
    if (!valid) {
      throw new Error(`Bundle ${options.id} failed integrity check`);
    }

    this.storage.setNextBundleId(options.id);
    await this.storage.save();

    return bundle;
  }

  /**
   * Set current bundle and trigger reload
   * Returns the bundle info, actual reload is handled by caller
   */
  async set(options: BundleId): Promise<BundleInfo> {
    const bundle = this.storage.getBundle(options.id);
    if (!bundle && options.id !== BUILTIN_BUNDLE_ID) {
      throw new Error(`Bundle ${options.id} not found`);
    }

    if (options.id !== BUILTIN_BUNDLE_ID) {
      // Verify bundle integrity
      const valid = await this.downloadManager.verifyBundleIntegrity(options.id);
      if (!valid) {
        throw new Error(`Bundle ${options.id} failed integrity check`);
      }
    }

    const previousId = this.storage.getCurrentBundleId();
    this.storage.setCurrentBundleId(options.id);
    this.storage.setNextBundleId(null);
    await this.storage.save();

    // Auto-delete previous bundle
    if (this.autoDeletePrevious && previousId !== BUILTIN_BUNDLE_ID && previousId !== options.id) {
      await this.deleteBundle({ id: previousId }).catch(() => {});
    }

    return bundle ?? this.getBuiltinBundle();
  }

  /**
   * Delete a bundle
   */
  async deleteBundle(options: BundleId): Promise<void> {
    const currentId = this.storage.getCurrentBundleId();
    const nextId = this.storage.getNextBundleId();

    if (options.id === BUILTIN_BUNDLE_ID) {
      throw new Error('Cannot delete builtin bundle');
    }

    if (options.id === currentId) {
      throw new Error('Cannot delete currently active bundle');
    }

    if (options.id === nextId) {
      throw new Error('Cannot delete bundle set as next');
    }

    // Delete files
    await this.storage.deleteBundleFiles(options.id);

    // Remove from manifest
    this.storage.deleteBundle(options.id);
    await this.storage.save();
  }

  /**
   * Mark a bundle as having an error (manual mode only)
   */
  async setBundleError(options: BundleId, allowManualBundleError: boolean): Promise<BundleInfo> {
    if (!allowManualBundleError) {
      throw new Error('setBundleError is only available when allowManualBundleError is true');
    }

    const bundle = this.storage.getBundle(options.id);
    if (!bundle) {
      throw new Error(`Bundle ${options.id} not found`);
    }

    bundle.status = 'error';
    this.storage.setBundle(options.id, bundle);

    if (this.autoDeleteFailed) {
      await this.deleteBundle(options).catch(() => {});
    }

    await this.storage.save();
    return bundle;
  }

  /**
   * Get failed update info
   */
  async getFailedUpdate(): Promise<UpdateFailedEvent | null> {
    return this.storage.clearFailedUpdate();
  }

  /**
   * Record a failed update
   */
  async recordFailedUpdate(bundle: BundleInfo): Promise<void> {
    this.storage.setFailedUpdate({ bundle });
    await this.storage.save();
  }

  /**
   * Reset to builtin or last successful bundle
   */
  async reset(options?: ResetOptions): Promise<void> {
    let targetId: string;

    if (options?.toLastSuccessful) {
      targetId = this.storage.getLastSuccessfulBundleId() ?? BUILTIN_BUNDLE_ID;
    } else {
      targetId = BUILTIN_BUNDLE_ID;
    }

    this.storage.setCurrentBundleId(targetId);
    this.storage.setNextBundleId(null);
    await this.storage.save();
  }

  /**
   * Get the path to load for the current bundle
   */
  getCurrentBundlePath(): string {
    const currentId = this.storage.getCurrentBundleId();

    if (currentId === BUILTIN_BUNDLE_ID) {
      return this.builtinPath;
    }

    return path.join(this.storage.getBundlePath(currentId), 'www', 'index.html');
  }

  /**
   * Get the path for a specific bundle
   */
  getBundlePath(bundleId: string): string {
    if (bundleId === BUILTIN_BUNDLE_ID) {
      return this.builtinPath;
    }

    return path.join(this.storage.getBundlePath(bundleId), 'www', 'index.html');
  }

  /**
   * Apply pending update on app launch
   * Returns true if a new bundle was loaded
   */
  async applyPendingUpdate(): Promise<{ applied: boolean; bundleId: string }> {
    const nextId = this.storage.getNextBundleId();
    const currentId = this.storage.getCurrentBundleId();

    if (!nextId || nextId === currentId) {
      return { applied: false, bundleId: currentId };
    }

    // Verify bundle exists and is valid
    const bundle = this.storage.getBundle(nextId);
    if (!bundle) {
      this.storage.setNextBundleId(null);
      await this.storage.save();
      return { applied: false, bundleId: currentId };
    }

    const valid = await this.downloadManager.verifyBundleIntegrity(nextId);
    if (!valid) {
      bundle.status = 'error';
      this.storage.setBundle(nextId, bundle);
      this.storage.setNextBundleId(null);
      await this.storage.save();
      return { applied: false, bundleId: currentId };
    }

    // Apply the update
    const previousId = currentId;
    this.storage.setCurrentBundleId(nextId);
    this.storage.setNextBundleId(null);
    await this.storage.save();

    // Auto-delete previous bundle
    if (this.autoDeletePrevious && previousId !== BUILTIN_BUNDLE_ID) {
      await this.deleteBundle({ id: previousId }).catch(() => {});
    }

    return { applied: true, bundleId: nextId };
  }

  /**
   * Mark current bundle as successful
   */
  async markBundleSuccessful(): Promise<void> {
    const currentId = this.storage.getCurrentBundleId();
    this.storage.setLastSuccessfulBundleId(currentId);
    await this.storage.save();
  }

  /**
   * Rollback to last successful bundle
   */
  async rollback(): Promise<BundleInfo> {
    const currentId = this.storage.getCurrentBundleId();
    const lastSuccessfulId = this.storage.getLastSuccessfulBundleId();
    const targetId = lastSuccessfulId ?? BUILTIN_BUNDLE_ID;

    // Record the current bundle as failed
    const currentBundle = this.storage.getBundle(currentId);
    if (currentBundle) {
      currentBundle.status = 'error';
      this.storage.setBundle(currentId, currentBundle);
      await this.recordFailedUpdate(currentBundle);

      if (this.autoDeleteFailed) {
        await this.deleteBundle({ id: currentId }).catch(() => {});
      }
    }

    // Reset to target bundle
    this.storage.setCurrentBundleId(targetId);
    this.storage.setNextBundleId(null);
    await this.storage.save();

    return this.storage.getBundle(targetId) ?? this.getBuiltinBundle();
  }

  /**
   * Clean up failed and orphaned bundles
   */
  async cleanup(): Promise<void> {
    if (this.autoDeleteFailed) {
      const bundles = this.storage.getAllBundles();
      for (const bundle of bundles) {
        if (bundle.status === 'error') {
          await this.deleteBundle({ id: bundle.id }).catch(() => {});
        }
      }
    }

    // Clean up orphaned bundle directories
    await this.storage.cleanupOrphanedBundles();
  }
}
