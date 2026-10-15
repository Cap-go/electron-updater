import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
      rm: vi.fn().mockResolvedValue(undefined),
    },
  };
});
import { DownloadManager } from '../src/main/download-manager';
import type { StorageManager } from '../src/main/storage';
import type { CryptoManager } from '../src/main/crypto';

function createMocks(publicKey: string | null = null) {
  const storage = {
    getBundlePath: vi.fn((id: string) => `/tmp/bundles/${id}`),
    setBundle: vi.fn(),
    deleteBundle: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as StorageManager;

  const crypto = {
    generateBundleId: vi.fn(() => 'abc123bundle'),
    getPublicKey: vi.fn(() => publicKey),
    decryptChecksum: vi.fn(),
    verifyFileChecksum: vi.fn().mockResolvedValue(true),
    calculateFileChecksum: vi.fn().mockResolvedValue('checksum'),
    decryptFile: vi.fn().mockResolvedValue(true),
    tryDecompressBrotli: vi.fn(async (buf: Buffer) => buf),
  } as unknown as CryptoManager;

  return { storage, crypto };
}

describe('DownloadManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requires sessionKey when publicKey is configured', async () => {
    const { storage, crypto } = createMocks('public-key');
    const manager = new DownloadManager(storage, crypto, 5000, false);

    const downloadFile = vi
      .spyOn(manager as unknown as { downloadFile: () => Promise<void> }, 'downloadFile')
      .mockResolvedValue();

    vi.spyOn(manager as unknown as { extractZipSecurely: () => Promise<void> }, 'extractZipSecurely')
      .mockResolvedValue();

    await expect(
      manager.downloadBundle({
        url: 'https://example.com/bundle.zip',
        version: '1.0.0',
        checksum: 'abc',
      })
    ).rejects.toThrow(/sessionKey is required/);

    expect(downloadFile).toHaveBeenCalled();
  });
});
