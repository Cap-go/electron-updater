/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Debug Menu
 * Provides debug functionality for development and testing
 */

import { BrowserWindow, Menu, MenuItem, globalShortcut, dialog } from 'electron';
import type { BundleInfo } from '../shared/types';
import type { BundleManager } from './bundle-manager';
import type { StorageManager } from './storage';
import { DEBUG_MENU_SHORTCUT } from '../shared/constants';

export class DebugMenu {
  private bundleManager: BundleManager;
  private storage: StorageManager;
  private enabled: boolean = false;
  private reloadCallback?: () => void;

  constructor(bundleManager: BundleManager, storage: StorageManager) {
    this.bundleManager = bundleManager;
    this.storage = storage;
  }

  /**
   * Enable or disable the debug menu
   */
  setEnabled(enabled: boolean, reloadCallback?: () => void): void {
    this.enabled = enabled;
    this.reloadCallback = reloadCallback;

    if (enabled) {
      this.registerShortcut();
    } else {
      this.unregisterShortcut();
    }
  }

  /**
   * Check if debug menu is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register keyboard shortcut
   */
  private registerShortcut(): void {
    try {
      globalShortcut.register(DEBUG_MENU_SHORTCUT, () => {
        this.showMenu();
      });
    } catch (error) {
      console.warn('Failed to register debug menu shortcut:', error);
    }
  }

  /**
   * Unregister keyboard shortcut
   */
  private unregisterShortcut(): void {
    try {
      globalShortcut.unregister(DEBUG_MENU_SHORTCUT);
    } catch {
      // Ignore
    }
  }

  /**
   * Show the debug menu
   */
  async showMenu(): Promise<void> {
    if (!this.enabled) return;

    const window = BrowserWindow.getFocusedWindow();
    if (!window) return;

    const { bundles } = await this.bundleManager.list();
    const currentResult = await this.bundleManager.current();
    const nextBundle = await this.bundleManager.getNextBundle();

    const menu = new Menu();

    // Current bundle info
    menu.append(
      new MenuItem({
        label: `Current: ${currentResult.bundle.version} (${currentResult.bundle.id})`,
        enabled: false,
      })
    );

    menu.append(
      new MenuItem({
        label: `Native: ${currentResult.native}`,
        enabled: false,
      })
    );

    if (nextBundle) {
      menu.append(
        new MenuItem({
          label: `Next: ${nextBundle.version} (${nextBundle.id})`,
          enabled: false,
        })
      );
    }

    menu.append(new MenuItem({ type: 'separator' }));

    // Available bundles
    menu.append(
      new MenuItem({
        label: 'Available Bundles',
        enabled: false,
      })
    );

    for (const bundle of bundles) {
      const isCurrent = bundle.id === currentResult.bundle.id;
      const isNext = nextBundle && bundle.id === nextBundle.id;

      let label = `  ${bundle.version} (${bundle.id})`;
      if (isCurrent) label += ' [CURRENT]';
      if (isNext) label += ' [NEXT]';
      label += ` - ${bundle.status}`;

      menu.append(
        new MenuItem({
          label,
          click: () => this.showBundleOptions(window, bundle, isCurrent),
        })
      );
    }

    menu.append(new MenuItem({ type: 'separator' }));

    // Actions
    menu.append(
      new MenuItem({
        label: 'Reset to Builtin',
        click: () => this.resetToBuiltin(window),
      })
    );

    menu.append(
      new MenuItem({
        label: 'Reset to Last Successful',
        click: () => this.resetToLastSuccessful(window),
      })
    );

    menu.append(new MenuItem({ type: 'separator' }));

    // Info
    menu.append(
      new MenuItem({
        label: 'Device Info',
        click: () => this.showDeviceInfo(window),
      })
    );

    menu.append(
      new MenuItem({
        label: 'Channel Info',
        click: () => this.showChannelInfo(window),
      })
    );

    menu.popup({ window });
  }

  /**
   * Show options for a specific bundle
   */
  private async showBundleOptions(
    window: BrowserWindow,
    bundle: BundleInfo,
    isCurrent: boolean
  ): Promise<void> {
    const menu = new Menu();

    menu.append(
      new MenuItem({
        label: `Bundle: ${bundle.version}`,
        enabled: false,
      })
    );

    menu.append(
      new MenuItem({
        label: `ID: ${bundle.id}`,
        enabled: false,
      })
    );

    menu.append(
      new MenuItem({
        label: `Status: ${bundle.status}`,
        enabled: false,
      })
    );

    menu.append(
      new MenuItem({
        label: `Downloaded: ${bundle.downloaded || 'N/A'}`,
        enabled: false,
      })
    );

    menu.append(new MenuItem({ type: 'separator' }));

    if (!isCurrent && bundle.status === 'success') {
      menu.append(
        new MenuItem({
          label: 'Set as Next',
          click: async () => {
            try {
              await this.bundleManager.next({ id: bundle.id });
              dialog.showMessageBox(window, {
                type: 'info',
                message: `Bundle ${bundle.version} set as next. Will load on restart.`,
              });
            } catch (error) {
              dialog.showErrorBox('Error', String(error));
            }
          },
        })
      );

      menu.append(
        new MenuItem({
          label: 'Load Now',
          click: async () => {
            try {
              await this.bundleManager.set({ id: bundle.id });
              this.reloadCallback?.();
            } catch (error) {
              dialog.showErrorBox('Error', String(error));
            }
          },
        })
      );
    }

    if (!isCurrent && bundle.id !== 'builtin') {
      menu.append(
        new MenuItem({
          label: 'Delete',
          click: async () => {
            try {
              await this.bundleManager.deleteBundle({ id: bundle.id });
              dialog.showMessageBox(window, {
                type: 'info',
                message: `Bundle ${bundle.version} deleted.`,
              });
            } catch (error) {
              dialog.showErrorBox('Error', String(error));
            }
          },
        })
      );
    }

    menu.popup({ window });
  }

  /**
   * Reset to builtin bundle
   */
  private async resetToBuiltin(window: BrowserWindow): Promise<void> {
    const result = await dialog.showMessageBox(window, {
      type: 'question',
      buttons: ['Cancel', 'Reset'],
      defaultId: 0,
      message: 'Reset to builtin bundle?',
      detail: 'This will reload the app with the original bundled version.',
    });

    if (result.response === 1) {
      try {
        await this.bundleManager.reset({ toLastSuccessful: false });
        this.reloadCallback?.();
      } catch (error) {
        dialog.showErrorBox('Error', String(error));
      }
    }
  }

  /**
   * Reset to last successful bundle
   */
  private async resetToLastSuccessful(window: BrowserWindow): Promise<void> {
    const result = await dialog.showMessageBox(window, {
      type: 'question',
      buttons: ['Cancel', 'Reset'],
      defaultId: 0,
      message: 'Reset to last successful bundle?',
      detail: 'This will reload the app with the last successfully loaded version.',
    });

    if (result.response === 1) {
      try {
        await this.bundleManager.reset({ toLastSuccessful: true });
        this.reloadCallback?.();
      } catch (error) {
        dialog.showErrorBox('Error', String(error));
      }
    }
  }

  /**
   * Show device info
   */
  private showDeviceInfo(window: BrowserWindow): void {
    const deviceId = this.storage.getDeviceId();
    const customId = this.storage.getCustomId();

    dialog.showMessageBox(window, {
      type: 'info',
      title: 'Device Info',
      message: 'Device Information',
      detail: `Device ID: ${deviceId}\nCustom ID: ${customId ?? 'Not set'}`,
    });
  }

  /**
   * Show channel info
   */
  private showChannelInfo(window: BrowserWindow): void {
    const channel = this.storage.getChannel();

    dialog.showMessageBox(window, {
      type: 'info',
      title: 'Channel Info',
      message: 'Channel Information',
      detail: `Current Channel: ${channel ?? 'Default'}`,
    });
  }

  /**
   * Cleanup on app quit
   */
  cleanup(): void {
    this.unregisterShortcut();
  }
}
