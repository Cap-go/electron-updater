/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { AutoUpdateSetting, ResolvedAutoUpdateMode } from '../shared/types';

export function resolveAutoUpdateMode(setting: AutoUpdateSetting): ResolvedAutoUpdateMode {
  if (setting === true) {
    return 'atBackground';
  }
  if (setting === false) {
    return 'off';
  }
  return setting;
}

export function isAutoUpdateChecksEnabled(setting: AutoUpdateSetting): boolean {
  return resolveAutoUpdateMode(setting) !== 'off';
}

export function shouldAutoDownload(setting: AutoUpdateSetting): boolean {
  const mode = resolveAutoUpdateMode(setting);
  return mode !== 'off' && mode !== 'onlyDownload';
}

export function shouldApplyImmediately(
  setting: AutoUpdateSetting,
  context: { isColdStart: boolean; isFreshNativeInstall: boolean }
): boolean {
  const mode = resolveAutoUpdateMode(setting);
  if (mode === 'always') {
    return true;
  }
  if (mode === 'atInstall' && context.isFreshNativeInstall) {
    return true;
  }
  if (mode === 'onLaunch' && context.isColdStart) {
    return true;
  }
  return false;
}
