/**
 * Tests for CryptoManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CryptoManager } from '../src/main/crypto';

describe('CryptoManager', () => {
  let cryptoManager: CryptoManager;
  let tempDir: string;

  beforeEach(() => {
    cryptoManager = new CryptoManager();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crypto-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('public key management', () => {
    it('should set and get public key', () => {
      expect(cryptoManager.getPublicKey()).toBeNull();

      const testKey = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';
      cryptoManager.setPublicKey(testKey);

      expect(cryptoManager.getPublicKey()).toBe(testKey);
    });

    it('should allow setting public key to null', () => {
      cryptoManager.setPublicKey('some-key');
      cryptoManager.setPublicKey(null);

      expect(cryptoManager.getPublicKey()).toBeNull();
    });
  });

  describe('calculateBufferChecksum', () => {
    it('should calculate correct SHA256 checksum for buffer', () => {
      const data = Buffer.from('hello world');
      const expectedHash = crypto.createHash('sha256').update(data).digest('hex');

      const result = cryptoManager.calculateBufferChecksum(data);

      expect(result).toBe(expectedHash);
    });

    it('should return different checksums for different data', () => {
      const data1 = Buffer.from('hello');
      const data2 = Buffer.from('world');

      const checksum1 = cryptoManager.calculateBufferChecksum(data1);
      const checksum2 = cryptoManager.calculateBufferChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should return same checksum for same data', () => {
      const data = Buffer.from('test data');

      const checksum1 = cryptoManager.calculateBufferChecksum(data);
      const checksum2 = cryptoManager.calculateBufferChecksum(data);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('calculateFileChecksum', () => {
    it('should calculate correct checksum for file', async () => {
      const content = 'test file content';
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, content);

      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
      const result = await cryptoManager.calculateFileChecksum(filePath);

      expect(result).toBe(expectedHash);
    });

    it('should handle large files', async () => {
      const content = 'x'.repeat(1024 * 1024); // 1MB file
      const filePath = path.join(tempDir, 'large.txt');
      fs.writeFileSync(filePath, content);

      const result = await cryptoManager.calculateFileChecksum(filePath);

      expect(result).toHaveLength(64); // SHA256 hex length
    });

    it('should reject for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      await expect(cryptoManager.calculateFileChecksum(filePath)).rejects.toThrow();
    });
  });

  describe('verifyFileChecksum', () => {
    it('should return true for matching checksum', async () => {
      const content = 'test content';
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, content);

      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
      const result = await cryptoManager.verifyFileChecksum(filePath, expectedHash);

      expect(result).toBe(true);
    });

    it('should return false for mismatched checksum', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'test content');

      const result = await cryptoManager.verifyFileChecksum(filePath, 'invalidchecksum');

      expect(result).toBe(false);
    });

    it('should be case insensitive for checksum comparison', async () => {
      const content = 'test';
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, content);

      const hash = crypto.createHash('sha256').update(content).digest('hex');

      const resultLower = await cryptoManager.verifyFileChecksum(filePath, hash.toLowerCase());
      const resultUpper = await cryptoManager.verifyFileChecksum(filePath, hash.toUpperCase());

      expect(resultLower).toBe(true);
      expect(resultUpper).toBe(true);
    });
  });

  describe('parseSessionKey', () => {
    it('should return null when no public key is set', () => {
      const result = cryptoManager.parseSessionKey('iv:key');

      expect(result).toBeNull();
    });

    it('should return null for invalid session key format (no colon)', () => {
      cryptoManager.setPublicKey('test-key');

      const result = cryptoManager.parseSessionKey('invalidformat');

      expect(result).toBeNull();
    });

    it('should return null for invalid session key format (multiple colons)', () => {
      cryptoManager.setPublicKey('test-key');

      const result = cryptoManager.parseSessionKey('iv:key:extra');

      expect(result).toBeNull();
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = cryptoManager.generateUUID();

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = cryptoManager.generateUUID();
      const uuid2 = cryptoManager.generateUUID();

      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('generateBundleId', () => {
    it('should generate 32 character hex string', () => {
      const bundleId = cryptoManager.generateBundleId();

      expect(bundleId).toHaveLength(32);
      expect(bundleId).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique bundle IDs', () => {
      const id1 = cryptoManager.generateBundleId();
      const id2 = cryptoManager.generateBundleId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('AES decryption', () => {
    it('should decrypt content correctly with valid key and IV', () => {
      // Create test encryption
      const key = crypto.randomBytes(16); // AES-128
      const iv = crypto.randomBytes(16);
      const plaintext = 'Hello, World!';

      const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

      const result = cryptoManager.decryptContentWithKeyIv(encrypted, key, iv);

      expect(result).not.toBeNull();
      expect(result?.toString('utf8')).toBe(plaintext);
    });

    it('should return null for invalid key', () => {
      const validKey = crypto.randomBytes(16);
      const invalidKey = crypto.randomBytes(16);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv('aes-128-cbc', validKey, iv);
      const encrypted = Buffer.concat([cipher.update('test', 'utf8'), cipher.final()]);

      const result = cryptoManager.decryptContentWithKeyIv(encrypted, invalidKey, iv);

      expect(result).toBeNull();
    });
  });

  describe('Brotli decompression', () => {
    it('should decompress Brotli-compressed data', async () => {
      const { brotliCompressSync } = await import('zlib');
      const original = 'Hello, compressed world!';
      const compressed = brotliCompressSync(Buffer.from(original));

      const result = await cryptoManager.decompressBrotli(compressed);

      expect(result.toString('utf8')).toBe(original);
    });

    it('should reject for invalid Brotli data', async () => {
      const invalidData = Buffer.from('not compressed');

      await expect(cryptoManager.decompressBrotli(invalidData)).rejects.toThrow();
    });
  });

  describe('tryDecompressBrotli', () => {
    it('should decompress valid Brotli data', async () => {
      const { brotliCompressSync } = await import('zlib');
      const original = 'test data';
      const compressed = brotliCompressSync(Buffer.from(original));

      const result = await cryptoManager.tryDecompressBrotli(compressed);

      expect(result.toString('utf8')).toBe(original);
    });

    it('should return original data for non-Brotli data', async () => {
      const original = Buffer.from('not compressed');

      const result = await cryptoManager.tryDecompressBrotli(original);

      expect(result).toEqual(original);
    });
  });
});
