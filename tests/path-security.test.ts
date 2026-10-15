import { describe, it, expect } from 'vitest';
import * as path from 'path';
import {
  assertSafeBundleId,
  isHttpsToHttpRedirect,
  isPathWithinRoot,
} from '../src/main/path-security';

describe('path-security', () => {
  describe('isPathWithinRoot', () => {
    it('allows paths inside the root', () => {
      const root = '/tmp/bundles/www';
      const file = path.join(root, 'assets', '[...all].vue');
      expect(isPathWithinRoot(file, root)).toBe(true);
    });

    it('rejects path traversal segments', () => {
      const root = '/tmp/bundles/www';
      const file = path.join(root, '..', 'secret.txt');
      expect(isPathWithinRoot(file, root)).toBe(false);
    });
  });

  describe('assertSafeBundleId', () => {
    it('rejects dot bundle ids', () => {
      expect(() => assertSafeBundleId('.')).toThrow(/Invalid bundle id/);
    });

    it('accepts hex ids', () => {
      expect(() => assertSafeBundleId('abc123def456')).not.toThrow();
    });

    it('rejects forward slashes in bundle ids', () => {
      expect(() => assertSafeBundleId('../outside')).toThrow(/Invalid bundle id/);
    });
  });

  describe('isHttpsToHttpRedirect', () => {
    it('detects HTTPS to HTTP downgrade', () => {
      expect(
        isHttpsToHttpRedirect('https://cdn.example.com/bundle.zip', 'http://cdn.example.com/bundle.zip')
      ).toBe(true);
    });

    it('allows HTTPS to HTTPS redirects', () => {
      expect(
        isHttpsToHttpRedirect('https://cdn.example.com/a', 'https://cdn.example.com/b')
      ).toBe(false);
    });
  });
});
