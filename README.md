# @capgo/electron-updater

OTA (Over-The-Air) updates for Electron applications. 100% feature parity with [@capgo/capacitor-updater](https://github.com/Cap-go/capacitor-updater).

## Features

- 🚀 **Live Updates** - Push updates instantly without app store review
- 🔄 **Auto-Update** - Automatic update checking and installation
- 🛡️ **Rollback Protection** - Automatic rollback if update fails
- 📦 **Bundle Management** - Full control over downloaded bundles
- 🔐 **End-to-End Encryption** - Secure update delivery
- 📊 **Channel System** - Deploy to different user groups
- ⏱️ **Delay Conditions** - Control when updates are applied
- 🐛 **Debug Menu** - Built-in debug tools for development

## Installation

```bash
npm install @capgo/electron-updater
```

## Quick Start

### Main Process

```typescript
// main.ts
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import {
  ElectronUpdater,
  setupIPCHandlers,
  setupEventForwarding,
} from '@capgo/electron-updater';

const updater = new ElectronUpdater({
  appId: 'com.example.app',
  autoUpdate: true,
});

app.whenReady().then(async () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Initialize updater with window and builtin path
  const builtinPath = path.join(__dirname, 'www/index.html');
  await updater.initialize(mainWindow, builtinPath);

  // Setup IPC communication
  setupIPCHandlers(updater);
  setupEventForwarding(updater, mainWindow);

  // Load the current bundle (either builtin or downloaded)
  await mainWindow.loadFile(updater.getCurrentBundlePath());
});
```

### Preload Script

```typescript
// preload.ts
import { exposeUpdaterAPI } from '@capgo/electron-updater/preload';

exposeUpdaterAPI();
```

### Renderer Process

```typescript
// renderer.ts
import { requireUpdater } from '@capgo/electron-updater/renderer';

const updater = requireUpdater();

// IMPORTANT: Call this on every app launch!
await updater.notifyAppReady();

// Check for updates manually
const latest = await updater.getLatest();
if (latest.url && !latest.error) {
  // Download the update
  const bundle = await updater.download({
    url: latest.url,
    version: latest.version,
    checksum: latest.checksum,
  });

  // Queue for next restart
  await updater.next({ id: bundle.id });
}

// Listen for events
updater.addListener('download', (event) => {
  console.log(`Download progress: ${event.percent}%`);
});

updater.addListener('updateFailed', (event) => {
  console.error('Update failed:', event.bundle.version);
});
```

## API Reference

### Core Methods

| Method | Description |
|--------|-------------|
| `notifyAppReady()` | **Must be called on every launch** - Confirms bundle loaded successfully |
| `download(options)` | Download a bundle from URL |
| `next(options)` | Queue bundle for next restart |
| `set(options)` | Immediately switch to bundle and reload |
| `reload()` | Reload the app with current bundle |
| `delete(options)` | Delete a bundle from storage |
| `reset(options)` | Reset to builtin or last successful bundle |

### Bundle Information

| Method | Description |
|--------|-------------|
| `current()` | Get current bundle and native version |
| `list(options)` | List all downloaded bundles |
| `getNextBundle()` | Get bundle queued for next restart |
| `getFailedUpdate()` | Get info about last failed update |
| `getBuiltinVersion()` | Get version shipped with app |

### Update Checking

| Method | Description |
|--------|-------------|
| `getLatest(options)` | Check server for latest version |

### Channel Management

| Method | Description |
|--------|-------------|
| `setChannel(options)` | Assign device to a channel |
| `unsetChannel(options)` | Remove channel assignment |
| `getChannel()` | Get current channel |
| `listChannels()` | List available channels |

### Delay Conditions

| Method | Description |
|--------|-------------|
| `setMultiDelay(options)` | Set conditions before update applies |
| `cancelDelay()` | Clear all delay conditions |

Delay condition types:
- `background` - Wait for app to be backgrounded (with optional duration)
- `kill` - Wait for app to be killed and restarted
- `date` - Wait until specific date/time
- `nativeVersion` - Wait for native app update

### Device Identification

| Method | Description |
|--------|-------------|
| `getDeviceId()` | Get unique device ID |
| `setCustomId(options)` | Set custom identifier |

### Configuration

| Method | Description |
|--------|-------------|
| `setUpdateUrl(options)` | Change update server URL |
| `setStatsUrl(options)` | Change statistics URL |
| `setChannelUrl(options)` | Change channel URL |
| `setAppId(options)` | Change App ID |
| `getAppId()` | Get current App ID |

### Debug

| Method | Description |
|--------|-------------|
| `setDebugMenu(options)` | Enable/disable debug menu |
| `isDebugMenuEnabled()` | Check debug menu state |

## Events

| Event | Description |
|-------|-------------|
| `download` | Download progress updates |
| `updateAvailable` | New update available |
| `noNeedUpdate` | Already up-to-date |
| `downloadComplete` | Download finished |
| `downloadFailed` | Download failed |
| `breakingAvailable` | Incompatible update available |
| `updateFailed` | Update installation failed |
| `appReloaded` | App was reloaded |
| `appReady` | notifyAppReady() was called |

## Configuration Options

```typescript
const updater = new ElectronUpdater({
  // Core
  appId: 'com.example.app',
  version: '1.0.0', // Override builtin version
  autoUpdate: true, // Enable auto-updates (default: true)
  appReadyTimeout: 10000, // MS before rollback (default: 10000)

  // Server URLs
  updateUrl: 'https://plugin.capgo.app/updates',
  channelUrl: 'https://plugin.capgo.app/channel_self',
  statsUrl: 'https://plugin.capgo.app/stats',

  // Security
  publicKey: '...', // For E2E encryption

  // Channels
  defaultChannel: 'production',

  // Behavior
  autoDeleteFailed: true, // Delete failed bundles
  autoDeletePrevious: true, // Delete old bundles
  resetWhenUpdate: true, // Reset on native update

  // Direct Update
  directUpdate: false, // 'atInstall' | 'onLaunch' | 'always' | false

  // Dynamic Config
  allowModifyUrl: false, // Allow runtime URL changes
  allowModifyAppId: false, // Allow runtime App ID changes
  persistCustomId: false, // Persist custom ID
  persistModifyUrl: false, // Persist URL changes

  // Debug
  debugMenu: false, // Enable debug menu (Ctrl+Shift+D)
  disableJSLogging: false, // Disable console logs

  // Periodic Updates
  periodCheckDelay: 0, // Seconds between checks (0 = disabled, min 600)
});
```

## Rollback Protection

The updater includes automatic rollback protection:

1. When a new bundle loads, a timer starts (default: 10 seconds)
2. Your app must call `notifyAppReady()` before the timer expires
3. If the timer expires, the update is considered failed
4. The app automatically rolls back to the last successful bundle

This prevents broken updates from bricking your app.

## Debug Menu

Enable the debug menu during development:

```typescript
const updater = new ElectronUpdater({
  debugMenu: true,
});
```

Access with `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to:
- View current bundle information
- Switch between available bundles
- Reset to builtin version
- View device and channel info

## Differences from Capacitor Updater

| Feature | Capacitor Updater | Electron Updater |
|---------|-------------------|------------------|
| Shake Menu | Physical shake | Keyboard shortcut |
| Background Detection | Native events | Window blur/focus |
| Storage | Native filesystem | userData directory |
| Device ID Storage | Keychain/Keystore | safeStorage |

## License

MPL-2.0

## Links

- [Capgo](https://capgo.app) - Update service
- [Documentation](https://capgo.app/docs)
- [GitHub](https://github.com/Cap-go/electron-updater)
