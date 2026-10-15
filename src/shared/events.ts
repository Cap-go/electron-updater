/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Electron Updater Event Emitter
 */

import type {
  UpdaterEventName,
  UpdaterEventCallback,
  ListenerHandle,
  DownloadEvent,
  UpdateAvailableEvent,
  NoNeedEvent,
  DownloadCompleteEvent,
  DownloadFailedEvent,
  BreakingAvailableEvent,
  UpdateFailedEvent,
  AppReadyEvent,
  UpdaterEvent,
  UpdateCheckResultEvent,
  SetEvent,
  SetNextEvent,
  ChannelPrivateEvent,
} from './types';

type EventMap = {
  download: DownloadEvent;
  updateAvailable: UpdateAvailableEvent;
  noNeedUpdate: NoNeedEvent;
  downloadComplete: DownloadCompleteEvent;
  downloadFailed: DownloadFailedEvent;
  breakingAvailable: BreakingAvailableEvent;
  majorAvailable: BreakingAvailableEvent;
  updateFailed: UpdateFailedEvent;
  appReloaded: void;
  appReady: AppReadyEvent;
  updaterEvent: UpdaterEvent;
  updateCheckResult: UpdateCheckResultEvent;
  set: SetEvent;
  setNext: SetNextEvent;
  channelPrivate: ChannelPrivateEvent;
};

export class UpdaterEventEmitter {
  private listeners: Map<UpdaterEventName, Set<UpdaterEventCallback<unknown>>> = new Map();

  addListener<K extends UpdaterEventName>(
    event: K,
    callback: UpdaterEventCallback<EventMap[K]>
  ): ListenerHandle {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as UpdaterEventCallback<unknown>);

    return {
      remove: () => {
        this.listeners.get(event)?.delete(callback as UpdaterEventCallback<unknown>);
      },
    };
  }

  emit<K extends UpdaterEventName>(event: K, data: EventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Emit a legacy event and the unified updaterEvent payload.
   */
  emitUpdaterEvent(event: UpdaterEvent): void {
    this.emit('updaterEvent', event);

    switch (event.type) {
      case 'download':
        this.emit('download', event.data);
        break;
      case 'noNeedUpdate':
        this.emit('noNeedUpdate', event.data);
        break;
      case 'updateCheckResult':
        this.emit('updateCheckResult', event.data);
        break;
      case 'updateAvailable':
        this.emit('updateAvailable', event.data);
        break;
      case 'downloadComplete':
        this.emit('downloadComplete', event.data);
        break;
      case 'downloadFailed':
        this.emit('downloadFailed', event.data);
        break;
      case 'breakingAvailable':
        this.emit('breakingAvailable', event.data);
        this.emit('majorAvailable', event.data);
        break;
      case 'updateFailed':
        this.emit('updateFailed', event.data);
        break;
      case 'set':
        this.emit('set', event.data);
        break;
      case 'setNext':
        this.emit('setNext', event.data);
        break;
      case 'appReloaded':
        this.emit('appReloaded', undefined);
        break;
      case 'appReady':
        this.emit('appReady', event.data);
        break;
      case 'channelPrivate':
        this.emit('channelPrivate', event.data);
        break;
      default:
        break;
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  removeListeners(event: UpdaterEventName): void {
    this.listeners.delete(event);
  }
}
