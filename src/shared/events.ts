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

  removeAllListeners(): void {
    this.listeners.clear();
  }

  removeListeners(event: UpdaterEventName): void {
    this.listeners.delete(event);
  }
}
