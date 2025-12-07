/**
 * Download Manager
 * Handles downloading and extracting bundles with security checks
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import extractZip from 'extract-zip';
import type { DownloadOptions, BundleInfo, ManifestEntry, DownloadEvent } from '../shared/types';
import type { StorageManager } from './storage';
import type { CryptoManager } from './crypto';

export interface DownloadProgress {
  percent: number;
  bytesDownloaded: number;
  totalBytes: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export class DownloadManager {
  private storage: StorageManager;
  private crypto: CryptoManager;
  private timeout: number;

  constructor(storage: StorageManager, crypto: CryptoManager, timeout: number = 20000) {
    this.storage = storage;
    this.crypto = crypto;
    this.timeout = timeout;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Validate that a path is within the allowed directory (path traversal prevention)
   * This is a critical security check to prevent zip slip attacks
   */
  private isPathSafe(filePath: string, allowedDir: string): boolean {
    const normalizedPath = path.normalize(filePath);
    const normalizedAllowedDir = path.normalize(allowedDir);

    // Ensure the path starts with the allowed directory
    if (!normalizedPath.startsWith(normalizedAllowedDir + path.sep) &&
        normalizedPath !== normalizedAllowedDir) {
      return false;
    }

    // Check for path traversal patterns
    if (filePath.includes('..')) {
      return false;
    }

    return true;
  }

  /**
   * Download a bundle from URL
   */
  async downloadBundle(
    options: DownloadOptions,
    onProgress?: (event: DownloadEvent) => void
  ): Promise<BundleInfo> {
    const bundleId = this.crypto.generateBundleId();
    const bundlePath = this.storage.getBundlePath(bundleId);
    const zipPath = path.join(bundlePath, 'bundle.zip');

    // Create bundle directory
    await fs.promises.mkdir(bundlePath, { recursive: true });

    const bundleInfo: BundleInfo = {
      id: bundleId,
      version: options.version,
      downloaded: new Date().toISOString(),
      checksum: options.checksum ?? '',
      status: 'downloading',
    };

    // Save initial bundle info
    this.storage.setBundle(bundleId, bundleInfo);
    await this.storage.save();

    try {
      // Download the zip file
      await this.downloadFile(options.url, zipPath, (progress) => {
        if (onProgress) {
          onProgress({
            percent: progress.percent,
            bundle: bundleInfo,
          });
        }
      });

      // Handle checksum verification
      let expectedChecksum = options.checksum;

      // If checksum is encrypted and we have a session key, decrypt it
      if (expectedChecksum && options.sessionKey) {
        const decryptedChecksum = this.crypto.decryptChecksum(expectedChecksum, options.sessionKey);
        if (decryptedChecksum) {
          expectedChecksum = decryptedChecksum;
        }
      }

      // Verify checksum if provided
      if (expectedChecksum) {
        const valid = await this.crypto.verifyFileChecksum(zipPath, expectedChecksum);
        if (!valid) {
          throw new Error('Checksum verification failed');
        }
        bundleInfo.checksum = expectedChecksum;
      } else {
        // Calculate checksum for the downloaded file
        bundleInfo.checksum = await this.crypto.calculateFileChecksum(zipPath);
      }

      // Decrypt if session key provided
      if (options.sessionKey) {
        const success = await this.crypto.decryptFile(zipPath, options.sessionKey);
        if (!success) {
          throw new Error('Failed to decrypt bundle');
        }
      }

      // Extract the zip with security checks
      const extractPath = path.join(bundlePath, 'www');
      await this.extractZipSecurely(zipPath, extractPath);

      // Clean up zip file
      await fs.promises.unlink(zipPath);

      // Handle manifest for partial updates
      if (options.manifest && options.manifest.length > 0) {
        await this.downloadManifestFiles(
          options.manifest,
          extractPath,
          options.sessionKey,
          onProgress ? (progress) => onProgress({ percent: progress.percent, bundle: bundleInfo }) : undefined
        );
      }

      // Update bundle status
      bundleInfo.status = 'success';
      this.storage.setBundle(bundleId, bundleInfo);
      await this.storage.save();

      return bundleInfo;
    } catch (error) {
      // Update bundle status to error
      bundleInfo.status = 'error';
      this.storage.setBundle(bundleId, bundleInfo);
      await this.storage.save();

      // Clean up failed download
      try {
        await fs.promises.rm(bundlePath, { recursive: true, force: true });
        this.storage.deleteBundle(bundleId);
        await this.storage.save();
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Extract zip file with security checks (path traversal prevention)
   */
  private async extractZipSecurely(zipPath: string, extractPath: string): Promise<void> {
    await fs.promises.mkdir(extractPath, { recursive: true });

    await extractZip(zipPath, {
      dir: extractPath,
      onEntry: (entry) => {
        // Security check: prevent path traversal (zip slip attack)
        const entryPath = path.join(extractPath, entry.fileName);

        if (!this.isPathSafe(entryPath, extractPath)) {
          throw new Error(`Zip entry has invalid path: ${entry.fileName}`);
        }

        // Reject entries with absolute paths
        if (path.isAbsolute(entry.fileName)) {
          throw new Error(`Zip entry has absolute path: ${entry.fileName}`);
        }
      },
    });
  }

  /**
   * Download a file from URL
   */
  private downloadFile(url: string, destPath: string, onProgress?: ProgressCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, { timeout: this.timeout }, (response) => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          this.downloadFile(response.headers.location, destPath, onProgress)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] ?? '0', 10);
        let bytesDownloaded = 0;

        const fileStream = fs.createWriteStream(destPath);

        response.on('data', (chunk: Buffer) => {
          bytesDownloaded += chunk.length;
          if (onProgress && totalBytes > 0) {
            onProgress({
              percent: Math.round((bytesDownloaded / totalBytes) * 100),
              bytesDownloaded,
              totalBytes,
            });
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Download a file and return as Buffer
   */
  private downloadToBuffer(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, { timeout: this.timeout }, (response) => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          this.downloadToBuffer(response.headers.location)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        response.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Download manifest files for partial/delta updates
   * Supports Brotli decompression and caching
   */
  private async downloadManifestFiles(
    manifest: ManifestEntry[],
    destPath: string,
    sessionKey?: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const total = manifest.length;
    let completed = 0;

    for (const entry of manifest) {
      if (!entry.file_name || !entry.download_url) continue;

      const filePath = path.join(destPath, entry.file_name);

      // Security check: prevent path traversal
      if (!this.isPathSafe(filePath, destPath)) {
        throw new Error(`Manifest entry has invalid path: ${entry.file_name}`);
      }

      const fileDir = path.dirname(filePath);

      // Ensure directory exists
      await fs.promises.mkdir(fileDir, { recursive: true });

      // Check if file already exists in cache (builtin bundle)
      // This implements caching similar to capacitor-updater
      const existingFile = await this.checkFileInCache(filePath, entry.file_hash ?? undefined);
      if (existingFile) {
        completed++;
        if (onProgress) {
          onProgress({
            percent: Math.round((completed / total) * 100),
            bytesDownloaded: completed,
            totalBytes: total,
          });
        }
        continue;
      }

      // Download file
      let fileData = await this.downloadToBuffer(entry.download_url);

      // Try Brotli decompression (manifest files may be compressed)
      fileData = await this.crypto.tryDecompressBrotli(fileData);

      // Write file
      await fs.promises.writeFile(filePath, fileData);

      // Verify hash if provided
      if (entry.file_hash) {
        const valid = await this.crypto.verifyFileChecksum(filePath, entry.file_hash);
        if (!valid) {
          throw new Error(`Hash verification failed for ${entry.file_name}`);
        }
      }

      completed++;
      if (onProgress) {
        onProgress({
          percent: Math.round((completed / total) * 100),
          bytesDownloaded: completed,
          totalBytes: total,
        });
      }
    }
  }

  /**
   * Check if a file exists in cache with matching hash
   */
  private async checkFileInCache(filePath: string, expectedHash?: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);

      // If no hash to verify, file exists
      if (!expectedHash) {
        return true;
      }

      // Verify hash matches
      const valid = await this.crypto.verifyFileChecksum(filePath, expectedHash);
      return valid;
    } catch {
      return false;
    }
  }

  /**
   * Check if a bundle's files exist
   */
  async verifyBundleIntegrity(bundleId: string): Promise<boolean> {
    const bundlePath = this.storage.getBundlePath(bundleId);
    const wwwPath = path.join(bundlePath, 'www');

    try {
      await fs.promises.access(wwwPath);
      // Check for index.html
      const indexPath = path.join(wwwPath, 'index.html');
      await fs.promises.access(indexPath);
      return true;
    } catch {
      return false;
    }
  }
}
