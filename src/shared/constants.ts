/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Electron Updater Constants
 */

export const PLUGIN_VERSION = '0.0.1';

export const DEFAULT_CONFIG = {
  appReadyTimeout: 10000,
  responseTimeout: 20,
  autoUpdate: true,
  autoDeleteFailed: true,
  autoDeletePrevious: true,
  resetWhenUpdate: true,
  updateUrl: 'https://plugin.capgo.app/updates',
  channelUrl: 'https://plugin.capgo.app/channel_self',
  statsUrl: 'https://plugin.capgo.app/stats',
  directUpdate: false as const,
  allowModifyUrl: false,
  allowModifyAppId: false,
  allowManualBundleError: false,
  persistCustomId: false,
  persistModifyUrl: false,
  keepUrlPathAfterReload: false,
  disableJSLogging: false,
  debugMenu: false,
  periodCheckDelay: 0,
} as const;

export const BUILTIN_BUNDLE_ID = 'builtin';

export const BUNDLES_DIR = 'capgo-bundles';
export const MANIFEST_FILE = 'manifest.json';
export const STORAGE_FILE = 'electron-updater-storage.json';

export const MIN_PERIOD_CHECK_DELAY = 600; // 10 minutes in seconds

export const DEBUG_MENU_SHORTCUT = 'CommandOrControl+Shift+D';

export const STATS_EVENTS = {
  DOWNLOAD_COMPLETE: 'download_complete',
  DOWNLOAD_FAILED: 'download_fail',
  UPDATE_SUCCESS: 'set',
  UPDATE_FAILED: 'set_fail',
} as const;
