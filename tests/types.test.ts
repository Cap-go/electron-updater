/**
 * Tests for types module (IPC_CHANNELS)
 */

import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '../src/shared/types';

describe('IPC_CHANNELS', () => {
  describe('Method channels', () => {
    it('should have NOTIFY_APP_READY channel', () => {
      expect(IPC_CHANNELS.NOTIFY_APP_READY).toBe('electron-updater:notifyAppReady');
    });

    it('should have DOWNLOAD channel', () => {
      expect(IPC_CHANNELS.DOWNLOAD).toBe('electron-updater:download');
    });

    it('should have NEXT channel', () => {
      expect(IPC_CHANNELS.NEXT).toBe('electron-updater:next');
    });

    it('should have SET channel', () => {
      expect(IPC_CHANNELS.SET).toBe('electron-updater:set');
    });

    it('should have RELOAD channel', () => {
      expect(IPC_CHANNELS.RELOAD).toBe('electron-updater:reload');
    });

    it('should have DELETE channel', () => {
      expect(IPC_CHANNELS.DELETE).toBe('electron-updater:delete');
    });

    it('should have SET_BUNDLE_ERROR channel', () => {
      expect(IPC_CHANNELS.SET_BUNDLE_ERROR).toBe('electron-updater:setBundleError');
    });

    it('should have CURRENT channel', () => {
      expect(IPC_CHANNELS.CURRENT).toBe('electron-updater:current');
    });

    it('should have LIST channel', () => {
      expect(IPC_CHANNELS.LIST).toBe('electron-updater:list');
    });

    it('should have GET_NEXT_BUNDLE channel', () => {
      expect(IPC_CHANNELS.GET_NEXT_BUNDLE).toBe('electron-updater:getNextBundle');
    });

    it('should have GET_FAILED_UPDATE channel', () => {
      expect(IPC_CHANNELS.GET_FAILED_UPDATE).toBe('electron-updater:getFailedUpdate');
    });

    it('should have RESET channel', () => {
      expect(IPC_CHANNELS.RESET).toBe('electron-updater:reset');
    });

    it('should have GET_LATEST channel', () => {
      expect(IPC_CHANNELS.GET_LATEST).toBe('electron-updater:getLatest');
    });

    it('should have GET_BUILTIN_VERSION channel', () => {
      expect(IPC_CHANNELS.GET_BUILTIN_VERSION).toBe('electron-updater:getBuiltinVersion');
    });

    it('should have SET_MULTI_DELAY channel', () => {
      expect(IPC_CHANNELS.SET_MULTI_DELAY).toBe('electron-updater:setMultiDelay');
    });

    it('should have CANCEL_DELAY channel', () => {
      expect(IPC_CHANNELS.CANCEL_DELAY).toBe('electron-updater:cancelDelay');
    });

    it('should have SET_CHANNEL channel', () => {
      expect(IPC_CHANNELS.SET_CHANNEL).toBe('electron-updater:setChannel');
    });

    it('should have UNSET_CHANNEL channel', () => {
      expect(IPC_CHANNELS.UNSET_CHANNEL).toBe('electron-updater:unsetChannel');
    });

    it('should have GET_CHANNEL channel', () => {
      expect(IPC_CHANNELS.GET_CHANNEL).toBe('electron-updater:getChannel');
    });

    it('should have LIST_CHANNELS channel', () => {
      expect(IPC_CHANNELS.LIST_CHANNELS).toBe('electron-updater:listChannels');
    });

    it('should have GET_DEVICE_ID channel', () => {
      expect(IPC_CHANNELS.GET_DEVICE_ID).toBe('electron-updater:getDeviceId');
    });

    it('should have SET_CUSTOM_ID channel', () => {
      expect(IPC_CHANNELS.SET_CUSTOM_ID).toBe('electron-updater:setCustomId');
    });

    it('should have GET_PLUGIN_VERSION channel', () => {
      expect(IPC_CHANNELS.GET_PLUGIN_VERSION).toBe('electron-updater:getPluginVersion');
    });

    it('should have IS_AUTO_UPDATE_ENABLED channel', () => {
      expect(IPC_CHANNELS.IS_AUTO_UPDATE_ENABLED).toBe('electron-updater:isAutoUpdateEnabled');
    });

    it('should have IS_AUTO_UPDATE_AVAILABLE channel', () => {
      expect(IPC_CHANNELS.IS_AUTO_UPDATE_AVAILABLE).toBe('electron-updater:isAutoUpdateAvailable');
    });

    it('should have SET_UPDATE_URL channel', () => {
      expect(IPC_CHANNELS.SET_UPDATE_URL).toBe('electron-updater:setUpdateUrl');
    });

    it('should have SET_STATS_URL channel', () => {
      expect(IPC_CHANNELS.SET_STATS_URL).toBe('electron-updater:setStatsUrl');
    });

    it('should have SET_CHANNEL_URL channel', () => {
      expect(IPC_CHANNELS.SET_CHANNEL_URL).toBe('electron-updater:setChannelUrl');
    });

    it('should have SET_APP_ID channel', () => {
      expect(IPC_CHANNELS.SET_APP_ID).toBe('electron-updater:setAppId');
    });

    it('should have GET_APP_ID channel', () => {
      expect(IPC_CHANNELS.GET_APP_ID).toBe('electron-updater:getAppId');
    });

    it('should have SET_DEBUG_MENU channel', () => {
      expect(IPC_CHANNELS.SET_DEBUG_MENU).toBe('electron-updater:setDebugMenu');
    });

    it('should have IS_DEBUG_MENU_ENABLED channel', () => {
      expect(IPC_CHANNELS.IS_DEBUG_MENU_ENABLED).toBe('electron-updater:isDebugMenuEnabled');
    });

    it('should have REMOVE_ALL_LISTENERS channel', () => {
      expect(IPC_CHANNELS.REMOVE_ALL_LISTENERS).toBe('electron-updater:removeAllListeners');
    });
  });

  describe('Event channels', () => {
    it('should have EVENT_DOWNLOAD channel', () => {
      expect(IPC_CHANNELS.EVENT_DOWNLOAD).toBe('electron-updater:event:download');
    });

    it('should have EVENT_UPDATE_AVAILABLE channel', () => {
      expect(IPC_CHANNELS.EVENT_UPDATE_AVAILABLE).toBe('electron-updater:event:updateAvailable');
    });

    it('should have EVENT_NO_NEED_UPDATE channel', () => {
      expect(IPC_CHANNELS.EVENT_NO_NEED_UPDATE).toBe('electron-updater:event:noNeedUpdate');
    });

    it('should have EVENT_DOWNLOAD_COMPLETE channel', () => {
      expect(IPC_CHANNELS.EVENT_DOWNLOAD_COMPLETE).toBe('electron-updater:event:downloadComplete');
    });

    it('should have EVENT_DOWNLOAD_FAILED channel', () => {
      expect(IPC_CHANNELS.EVENT_DOWNLOAD_FAILED).toBe('electron-updater:event:downloadFailed');
    });

    it('should have EVENT_BREAKING_AVAILABLE channel', () => {
      expect(IPC_CHANNELS.EVENT_BREAKING_AVAILABLE).toBe('electron-updater:event:breakingAvailable');
    });

    it('should have EVENT_MAJOR_AVAILABLE channel', () => {
      expect(IPC_CHANNELS.EVENT_MAJOR_AVAILABLE).toBe('electron-updater:event:majorAvailable');
    });

    it('should have EVENT_UPDATE_FAILED channel', () => {
      expect(IPC_CHANNELS.EVENT_UPDATE_FAILED).toBe('electron-updater:event:updateFailed');
    });

    it('should have EVENT_APP_RELOADED channel', () => {
      expect(IPC_CHANNELS.EVENT_APP_RELOADED).toBe('electron-updater:event:appReloaded');
    });

    it('should have EVENT_APP_READY channel', () => {
      expect(IPC_CHANNELS.EVENT_APP_READY).toBe('electron-updater:event:appReady');
    });
  });

  describe('Channel prefix consistency', () => {
    it('all method channels should start with "electron-updater:"', () => {
      const methodChannels = [
        IPC_CHANNELS.NOTIFY_APP_READY,
        IPC_CHANNELS.DOWNLOAD,
        IPC_CHANNELS.NEXT,
        IPC_CHANNELS.SET,
        IPC_CHANNELS.RELOAD,
        IPC_CHANNELS.DELETE,
        IPC_CHANNELS.SET_BUNDLE_ERROR,
        IPC_CHANNELS.CURRENT,
        IPC_CHANNELS.LIST,
        IPC_CHANNELS.GET_NEXT_BUNDLE,
        IPC_CHANNELS.GET_FAILED_UPDATE,
        IPC_CHANNELS.RESET,
        IPC_CHANNELS.GET_LATEST,
        IPC_CHANNELS.GET_BUILTIN_VERSION,
        IPC_CHANNELS.SET_MULTI_DELAY,
        IPC_CHANNELS.CANCEL_DELAY,
        IPC_CHANNELS.SET_CHANNEL,
        IPC_CHANNELS.UNSET_CHANNEL,
        IPC_CHANNELS.GET_CHANNEL,
        IPC_CHANNELS.LIST_CHANNELS,
        IPC_CHANNELS.GET_DEVICE_ID,
        IPC_CHANNELS.SET_CUSTOM_ID,
        IPC_CHANNELS.GET_PLUGIN_VERSION,
        IPC_CHANNELS.IS_AUTO_UPDATE_ENABLED,
        IPC_CHANNELS.IS_AUTO_UPDATE_AVAILABLE,
        IPC_CHANNELS.SET_UPDATE_URL,
        IPC_CHANNELS.SET_STATS_URL,
        IPC_CHANNELS.SET_CHANNEL_URL,
        IPC_CHANNELS.SET_APP_ID,
        IPC_CHANNELS.GET_APP_ID,
        IPC_CHANNELS.SET_DEBUG_MENU,
        IPC_CHANNELS.IS_DEBUG_MENU_ENABLED,
        IPC_CHANNELS.REMOVE_ALL_LISTENERS,
      ];

      methodChannels.forEach((channel) => {
        expect(channel).toMatch(/^electron-updater:/);
      });
    });

    it('all event channels should start with "electron-updater:event:"', () => {
      const eventChannels = [
        IPC_CHANNELS.EVENT_DOWNLOAD,
        IPC_CHANNELS.EVENT_UPDATE_AVAILABLE,
        IPC_CHANNELS.EVENT_NO_NEED_UPDATE,
        IPC_CHANNELS.EVENT_DOWNLOAD_COMPLETE,
        IPC_CHANNELS.EVENT_DOWNLOAD_FAILED,
        IPC_CHANNELS.EVENT_BREAKING_AVAILABLE,
        IPC_CHANNELS.EVENT_MAJOR_AVAILABLE,
        IPC_CHANNELS.EVENT_UPDATE_FAILED,
        IPC_CHANNELS.EVENT_APP_RELOADED,
        IPC_CHANNELS.EVENT_APP_READY,
      ];

      eventChannels.forEach((channel) => {
        expect(channel).toMatch(/^electron-updater:event:/);
      });
    });
  });

  describe('No duplicate channels', () => {
    it('should have unique channel values', () => {
      const allChannels = Object.values(IPC_CHANNELS);
      const uniqueChannels = new Set(allChannels);

      expect(uniqueChannels.size).toBe(allChannels.length);
    });
  });
});
