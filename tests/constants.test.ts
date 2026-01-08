/**
 * Tests for constants module
 */

import { describe, it, expect } from 'vitest';
import {
  PLUGIN_VERSION,
  DEFAULT_CONFIG,
  BUILTIN_BUNDLE_ID,
  BUNDLES_DIR,
  MANIFEST_FILE,
  STORAGE_FILE,
  MIN_PERIOD_CHECK_DELAY,
  DEBUG_MENU_SHORTCUT,
  STATS_EVENTS,
} from '../src/shared/constants';

describe('Constants', () => {
  describe('PLUGIN_VERSION', () => {
    it('should be a valid semver string', () => {
      expect(PLUGIN_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have appReadyTimeout of 10 seconds', () => {
      expect(DEFAULT_CONFIG.appReadyTimeout).toBe(10000);
    });

    it('should have responseTimeout of 20 seconds', () => {
      expect(DEFAULT_CONFIG.responseTimeout).toBe(20);
    });

    it('should have autoUpdate enabled by default', () => {
      expect(DEFAULT_CONFIG.autoUpdate).toBe(true);
    });

    it('should have autoDeleteFailed enabled by default', () => {
      expect(DEFAULT_CONFIG.autoDeleteFailed).toBe(true);
    });

    it('should have autoDeletePrevious enabled by default', () => {
      expect(DEFAULT_CONFIG.autoDeletePrevious).toBe(true);
    });

    it('should have resetWhenUpdate enabled by default', () => {
      expect(DEFAULT_CONFIG.resetWhenUpdate).toBe(true);
    });

    it('should have valid updateUrl', () => {
      expect(DEFAULT_CONFIG.updateUrl).toBe('https://plugin.capgo.app/updates');
    });

    it('should have valid channelUrl', () => {
      expect(DEFAULT_CONFIG.channelUrl).toBe('https://plugin.capgo.app/channel_self');
    });

    it('should have valid statsUrl', () => {
      expect(DEFAULT_CONFIG.statsUrl).toBe('https://plugin.capgo.app/stats');
    });

    it('should have directUpdate disabled by default', () => {
      expect(DEFAULT_CONFIG.directUpdate).toBe(false);
    });

    it('should have allowModifyUrl disabled by default', () => {
      expect(DEFAULT_CONFIG.allowModifyUrl).toBe(false);
    });

    it('should have allowModifyAppId disabled by default', () => {
      expect(DEFAULT_CONFIG.allowModifyAppId).toBe(false);
    });

    it('should have allowManualBundleError disabled by default', () => {
      expect(DEFAULT_CONFIG.allowManualBundleError).toBe(false);
    });

    it('should have persistCustomId disabled by default', () => {
      expect(DEFAULT_CONFIG.persistCustomId).toBe(false);
    });

    it('should have persistModifyUrl disabled by default', () => {
      expect(DEFAULT_CONFIG.persistModifyUrl).toBe(false);
    });

    it('should have keepUrlPathAfterReload disabled by default', () => {
      expect(DEFAULT_CONFIG.keepUrlPathAfterReload).toBe(false);
    });

    it('should have disableJSLogging disabled by default', () => {
      expect(DEFAULT_CONFIG.disableJSLogging).toBe(false);
    });

    it('should have debugMenu disabled by default', () => {
      expect(DEFAULT_CONFIG.debugMenu).toBe(false);
    });

    it('should have periodCheckDelay of 0 by default', () => {
      expect(DEFAULT_CONFIG.periodCheckDelay).toBe(0);
    });
  });

  describe('BUILTIN_BUNDLE_ID', () => {
    it('should be "builtin"', () => {
      expect(BUILTIN_BUNDLE_ID).toBe('builtin');
    });
  });

  describe('File paths', () => {
    it('should have correct BUNDLES_DIR', () => {
      expect(BUNDLES_DIR).toBe('capgo-bundles');
    });

    it('should have correct MANIFEST_FILE', () => {
      expect(MANIFEST_FILE).toBe('manifest.json');
    });

    it('should have correct STORAGE_FILE', () => {
      expect(STORAGE_FILE).toBe('electron-updater-storage.json');
    });
  });

  describe('MIN_PERIOD_CHECK_DELAY', () => {
    it('should be 600 seconds (10 minutes)', () => {
      expect(MIN_PERIOD_CHECK_DELAY).toBe(600);
    });
  });

  describe('DEBUG_MENU_SHORTCUT', () => {
    it('should be Ctrl+Shift+D', () => {
      expect(DEBUG_MENU_SHORTCUT).toBe('CommandOrControl+Shift+D');
    });
  });

  describe('STATS_EVENTS', () => {
    it('should have DOWNLOAD_COMPLETE event', () => {
      expect(STATS_EVENTS.DOWNLOAD_COMPLETE).toBe('download_complete');
    });

    it('should have DOWNLOAD_FAILED event', () => {
      expect(STATS_EVENTS.DOWNLOAD_FAILED).toBe('download_fail');
    });

    it('should have UPDATE_SUCCESS event', () => {
      expect(STATS_EVENTS.UPDATE_SUCCESS).toBe('set');
    });

    it('should have UPDATE_FAILED event', () => {
      expect(STATS_EVENTS.UPDATE_FAILED).toBe('set_fail');
    });
  });
});
