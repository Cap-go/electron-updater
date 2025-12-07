/**
 * Crypto utilities for Electron Updater
 * Handles encryption, decryption, and checksum verification
 *
 * Encryption scheme (E2E v2) - matches capacitor-updater native implementation:
 * - Session key format: base64(IV):base64(RSA_encrypted_AES_key)
 * - AES-128-CBC with PKCS7 padding for content decryption
 * - RSA with PKCS1 padding for session key decryption
 * - SHA256 for checksum verification
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as zlib from 'zlib';

export interface DecryptedSessionKey {
  iv: Buffer;
  aesKey: Buffer;
}

export class CryptoManager {
  private publicKey: string | null = null;

  setPublicKey(key: string | null): void {
    this.publicKey = key;
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  /**
   * Calculate SHA256 checksum of a file
   */
  async calculateFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Calculate SHA256 checksum of a buffer
   */
  calculateBufferChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verify checksum of a file
   */
  async verifyFileChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.calculateFileChecksum(filePath);
    return actualChecksum.toLowerCase() === expectedChecksum.toLowerCase();
  }

  /**
   * Parse and decrypt session key
   * Format: base64(IV):base64(RSA_encrypted_AES_key)
   */
  parseSessionKey(sessionKey: string): DecryptedSessionKey | null {
    if (!this.publicKey) {
      console.warn('No public key set for decryption');
      return null;
    }

    try {
      const parts = sessionKey.split(':');
      if (parts.length !== 2) {
        console.error('Invalid session key format: expected IV:encrypted_key');
        return null;
      }

      const iv = Buffer.from(parts[0], 'base64');
      const encryptedAesKey = Buffer.from(parts[1], 'base64');

      // Decrypt AES key using RSA public key with PKCS1 padding
      // Note: In E2E encryption, the private key encrypts and public key decrypts
      const aesKey = crypto.publicDecrypt(
        {
          key: this.publicKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        encryptedAesKey
      );

      return { iv, aesKey };
    } catch (error) {
      console.error('Failed to parse/decrypt session key:', error);
      return null;
    }
  }

  /**
   * Decrypt session key (legacy method for compatibility)
   * Returns the decrypted AES key buffer
   */
  decryptSessionKey(encryptedSessionKey: string): Buffer | null {
    const result = this.parseSessionKey(encryptedSessionKey);
    return result ? result.aesKey : null;
  }

  /**
   * Decrypt content using AES-128-CBC
   * Matches capacitor-updater native implementation
   */
  decryptContent(encryptedData: Buffer, sessionKey: DecryptedSessionKey): Buffer | null {
    try {
      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKey.aesKey, sessionKey.iv);
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt content:', error);
      return null;
    }
  }

  /**
   * Decrypt content with raw AES key and IV (for file decryption)
   */
  decryptContentWithKeyIv(encryptedData: Buffer, aesKey: Buffer, iv: Buffer): Buffer | null {
    try {
      const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, iv);
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt content:', error);
      return null;
    }
  }

  /**
   * Decrypt a file in place using session key
   */
  async decryptFile(filePath: string, sessionKey: string): Promise<boolean> {
    try {
      const parsed = this.parseSessionKey(sessionKey);
      if (!parsed) {
        return false;
      }

      const encryptedData = await fs.promises.readFile(filePath);
      const decrypted = this.decryptContent(encryptedData, parsed);

      if (!decrypted) {
        return false;
      }

      await fs.promises.writeFile(filePath, decrypted);
      return true;
    } catch (error) {
      console.error('Failed to decrypt file:', error);
      return false;
    }
  }

  /**
   * Decrypt checksum using session key
   * Used for verifying encrypted checksums from server
   */
  decryptChecksum(encryptedChecksum: string, sessionKey: string): string | null {
    try {
      const parsed = this.parseSessionKey(sessionKey);
      if (!parsed) {
        return null;
      }

      const encryptedData = Buffer.from(encryptedChecksum, 'base64');
      const decrypted = this.decryptContent(encryptedData, parsed);

      if (!decrypted) {
        return null;
      }

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Failed to decrypt checksum:', error);
      return null;
    }
  }

  /**
   * Decompress Brotli-compressed data
   * Used for manifest files which may be Brotli-compressed
   */
  decompressBrotli(compressedData: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.brotliDecompress(compressedData, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Check if data is Brotli-compressed
   * Brotli doesn't have a magic number, but we can try to decompress and catch errors
   */
  async tryDecompressBrotli(data: Buffer): Promise<Buffer> {
    try {
      return await this.decompressBrotli(data);
    } catch {
      // Not Brotli-compressed or decompression failed, return original data
      return data;
    }
  }

  /**
   * Generate a random UUID
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a random bundle ID
   */
  generateBundleId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
