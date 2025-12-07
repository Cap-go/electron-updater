# Electron Updater - Feature Specification

Based on capacitor-updater for 100% feature parity.

## Overview

Electron Updater is an Electron plugin that enables over-the-air (OTA) updates for Electron applications without requiring app store releases. It supports both automatic and manual update modes with sophisticated features like rollback protection, delta updates, and channel management.

---

## 1. PUBLIC METHODS

### Core Update Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `notifyAppReady()` | `() => Promise<AppReadyResult>` | Critical - must be called on every app launch to confirm JS bundle loaded |
| `download()` | `(options: DownloadOptions) => Promise<BundleInfo>` | Download a new bundle zip from URL |
| `next()` | `(options: BundleId) => Promise<BundleInfo>` | Queue bundle to activate on next restart |
| `set()` | `(options: BundleId) => Promise<void>` | Immediately switch to bundle and reload (TERMINAL) |
| `reload()` | `() => Promise<void>` | Manually trigger app reload to apply pending update |
| `delete()` | `(options: BundleId) => Promise<void>` | Remove bundle from storage |
| `setBundleError()` | `(options: BundleId) => Promise<BundleInfo>` | Mark bundle as failed (manual mode only) |

### Bundle Information Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `current()` | `() => Promise<CurrentBundleResult>` | Get current active bundle and native version |
| `list()` | `(options?: ListOptions) => Promise<BundleListResult>` | List all locally downloaded bundles |
| `getNextBundle()` | `() => Promise<BundleInfo \| null>` | Get bundle queued for next reload |
| `getFailedUpdate()` | `() => Promise<UpdateFailedEvent \| null>` | Get info about most recent failed bundle |
| `reset()` | `(options?: ResetOptions) => Promise<void>` | Reset to builtin or last successful bundle |

### Update Checking Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getLatest()` | `(options?: GetLatestOptions) => Promise<LatestVersion>` | Query server for latest available bundle |
| `getBuiltinVersion()` | `() => Promise<BuiltinVersion>` | Get version shipped with app |

### Delay Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setMultiDelay()` | `(options: MultiDelayConditions) => Promise<void>` | Configure conditions before update applies |
| `cancelDelay()` | `() => Promise<void>` | Clear all delay conditions |

### Channel Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setChannel()` | `(options: SetChannelOptions) => Promise<ChannelRes>` | Assign device to update channel |
| `unsetChannel()` | `(options?: UnsetChannelOptions) => Promise<void>` | Remove channel assignment |
| `getChannel()` | `() => Promise<GetChannelRes>` | Get current channel |
| `listChannels()` | `() => Promise<ListChannelsResult>` | List available self-assignable channels |

### Device Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getDeviceId()` | `() => Promise<DeviceId>` | Get unique device identifier |
| `setCustomId()` | `(options: SetCustomIdOptions) => Promise<void>` | Set custom device identifier |

### Plugin Info Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getPluginVersion()` | `() => Promise<PluginVersion>` | Get plugin version |
| `isAutoUpdateEnabled()` | `() => Promise<AutoUpdateEnabled>` | Check if auto-update mode is on |
| `isAutoUpdateAvailable()` | `() => Promise<AutoUpdateAvailable>` | Check if auto-update is available |

### Dynamic Configuration Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setUpdateUrl()` | `(options: UpdateUrl) => Promise<void>` | Change update server URL at runtime |
| `setStatsUrl()` | `(options: StatsUrl) => Promise<void>` | Change statistics URL at runtime |
| `setChannelUrl()` | `(options: ChannelUrl) => Promise<void>` | Change channel URL at runtime |
| `setAppId()` | `(options: SetAppIdOptions) => Promise<void>` | Change App ID at runtime |
| `getAppId()` | `() => Promise<GetAppIdRes>` | Get current App ID |

### Debug Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setDebugMenu()` | `(options: SetDebugMenuOptions) => Promise<void>` | Enable/disable debug menu (Electron equivalent of shake) |
| `isDebugMenuEnabled()` | `() => Promise<DebugMenuEnabled>` | Check debug menu state |

### Listener Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `addListener()` | `(event: string, callback: Function) => ListenerHandle` | Add event listener |
| `removeAllListeners()` | `() => Promise<void>` | Remove all event listeners |

---

## 2. EVENTS

| Event | Payload | Description |
|-------|---------|-------------|
| `download` | `DownloadEvent` | Download progress (percent, bundle) |
| `updateAvailable` | `UpdateAvailableEvent` | Update is available |
| `noNeedUpdate` | `NoNeedEvent` | Device is up-to-date |
| `downloadComplete` | `DownloadCompleteEvent` | Download finished |
| `downloadFailed` | `DownloadFailedEvent` | Download failed |
| `breakingAvailable` | `BreakingAvailableEvent` | Incompatible update available |
| `majorAvailable` | `MajorAvailableEvent` | (Deprecated) Same as breakingAvailable |
| `updateFailed` | `UpdateFailedEvent` | Update installation failed |
| `appReloaded` | `void` | App reload occurred |
| `appReady` | `AppReadyEvent` | notifyAppReady() called |

---

## 3. CONFIGURATION OPTIONS

### Core Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appReadyTimeout` | number | 10000 | MS before update considered failed |
| `responseTimeout` | number | 20 | Seconds for API request timeout |
| `autoUpdate` | boolean | true | Enable automatic updates |
| `autoDeleteFailed` | boolean | true | Auto-delete failed bundles |
| `autoDeletePrevious` | boolean | true | Auto-delete previous bundles |
| `resetWhenUpdate` | boolean | true | Delete old bundles on native update |

### Server URLs

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `updateUrl` | string | capgo URL | Update check endpoint |
| `channelUrl` | string | capgo URL | Channel operations endpoint |
| `statsUrl` | string | capgo URL | Statistics endpoint |

### Security

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `publicKey` | string | undefined | Public key for E2E encryption |

### Version Management

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `version` | string | undefined | Override builtin version |
| `appId` | string | undefined | App ID for update server |

### Direct Update

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directUpdate` | boolean \| string | false | When to install updates directly |
| `autoSplashscreen` | boolean | false | Auto-hide splashscreen |
| `autoSplashscreenLoader` | boolean | false | Show loading indicator |
| `autoSplashscreenTimeout` | number | 10000 | Splashscreen timeout |

### Channels

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultChannel` | string | undefined | Default channel |

### Dynamic Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowModifyUrl` | boolean | false | Allow runtime URL changes |
| `allowModifyAppId` | boolean | false | Allow runtime App ID changes |
| `allowManualBundleError` | boolean | false | Allow setBundleError() |
| `persistCustomId` | boolean | false | Persist custom ID |
| `persistModifyUrl` | boolean | false | Persist URL changes |

### UX

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keepUrlPathAfterReload` | boolean | false | Preserve URL path on reload |
| `disableJSLogging` | boolean | false | Disable console logging |
| `debugMenu` | boolean | false | Enable debug menu |

### Periodic Updates

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `periodCheckDelay` | number | 0 | Auto-check interval (seconds) |

---

## 4. DATA STRUCTURES

### BundleInfo
```typescript
interface BundleInfo {
  id: string;
  version: string;
  downloaded: string;
  checksum: string;
  status: BundleStatus;
}
```

### BundleStatus
```typescript
type BundleStatus = 'pending' | 'downloading' | 'success' | 'error';
```

### LatestVersion
```typescript
interface LatestVersion {
  version: string;
  checksum?: string;
  breaking?: boolean;
  major?: boolean; // deprecated
  message?: string;
  sessionKey?: string;
  error?: string;
  old?: string;
  url?: string;
  manifest?: ManifestEntry[];
}
```

### ManifestEntry
```typescript
interface ManifestEntry {
  file_name: string | null;
  file_hash: string | null;
  download_url: string | null;
}
```

### ChannelInfo
```typescript
interface ChannelInfo {
  id: string;
  name: string;
  public: boolean;
  allow_self_set: boolean;
}
```

### DelayCondition
```typescript
interface DelayCondition {
  kind: 'background' | 'kill' | 'date' | 'nativeVersion';
  value?: string;
}
```

---

## 5. INTERNAL MECHANISMS

### Bundle Storage
- Bundles stored in Electron's userData directory
- Each bundle has unique ID
- Manifest file tracks all bundles and states
- Checksums verified on load

### Bundle Lifecycle
1. Downloaded → pending/downloading status
2. Verified → checksum validation
3. Queued → set as "next" via `next()`
4. Activated → loaded on app start
5. Success → marked if `notifyAppReady()` called
6. Rollback → if `notifyAppReady()` not called
7. Deletion → freed from storage

### Rollback Mechanism
- Auto-rollback if `notifyAppReady()` not called within timeout
- Reverts to last successful bundle
- If no successful: reverts to builtin
- Failure info stored and retrievable

### Device Identity
- UUID generated per device
- Stored in Electron's secure storage (safeStorage if available)
- Persists across reinstalls

### Encryption
- RSA encryption for session keys
- AES encryption for bundle content
- SHA256 checksums for verification

---

## 6. ELECTRON-SPECIFIC ADAPTATIONS

### Instead of Capacitor Plugin Architecture
- Main process module with IPC bridge
- Preload script for renderer access
- Type-safe IPC channels

### Instead of Native Mobile Features
- Shake menu → Keyboard shortcut (Ctrl+Shift+D) or menu item
- Background detection → App focus/blur events
- Kill detection → App close/quit events
- Native version → package.json version or app.getVersion()

### Storage
- Use Electron's app.getPath('userData') for bundles
- Use electron-store or similar for config persistence
- Use safeStorage for sensitive data (device ID, keys)

### Update Application
- Use Electron's app.relaunch() and app.exit()
- Protocol handler for loading bundles
- BrowserWindow.loadFile() or loadURL() for bundle switching

---

## 7. PROJECT STRUCTURE

```
electron-updater/
├── src/
│   ├── main/                    # Main process code
│   │   ├── index.ts             # Main entry point
│   │   ├── updater.ts           # Core updater logic
│   │   ├── bundle-manager.ts    # Bundle storage/management
│   │   ├── download-manager.ts  # Download handling
│   │   ├── channel-manager.ts   # Channel operations
│   │   ├── delay-manager.ts     # Delay conditions
│   │   ├── crypto.ts            # Encryption utilities
│   │   ├── storage.ts           # Persistent storage
│   │   ├── device.ts            # Device ID management
│   │   ├── stats.ts             # Statistics reporting
│   │   ├── ipc-handlers.ts      # IPC message handlers
│   │   └── debug-menu.ts        # Debug menu
│   ├── preload/
│   │   └── index.ts             # Preload script
│   ├── renderer/
│   │   └── index.ts             # Renderer API
│   └── shared/
│       ├── types.ts             # Shared type definitions
│       ├── constants.ts         # Shared constants
│       └── events.ts            # Event definitions
├── package.json
├── tsconfig.json
├── README.md
└── FEATURE_SPECIFICATION.md
```
