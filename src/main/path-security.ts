/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as path from 'path';

/**
 * Validate that a resolved path stays within an allowed directory (zip-slip prevention).
 */
export function isPathWithinRoot(filePath: string, allowedDir: string): boolean {
  const normalizedPath = path.normalize(filePath);
  const normalizedAllowedDir = path.normalize(allowedDir);

  if (
    !normalizedPath.startsWith(normalizedAllowedDir + path.sep) &&
    normalizedPath !== normalizedAllowedDir
  ) {
    return false;
  }

  const segments = filePath.split(path.sep);
  if (segments.some((segment) => segment === '..')) {
    return false;
  }

  return true;
}

/**
 * Reject bundle ids that would be unsafe on disk or ambiguous in storage.
 */
export function assertSafeBundleId(bundleId: string): void {
  if (!bundleId || bundleId === '.' || bundleId === '..' || bundleId.includes(path.sep)) {
    throw new Error(`Invalid bundle id: ${bundleId}`);
  }
}

/**
 * Returns true when an HTTPS request would be redirected to plain HTTP (downgrade).
 */
export function isHttpsToHttpRedirect(originalUrl: string, redirectUrl: string): boolean {
  try {
    const original = new URL(originalUrl);
    const redirect = new URL(redirectUrl, originalUrl);
    return original.protocol === 'https:' && redirect.protocol === 'http:';
  } catch {
    return false;
  }
}
