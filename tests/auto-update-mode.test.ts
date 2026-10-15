import { describe, it, expect } from 'vitest';
import {
  isAutoUpdateChecksEnabled,
  resolveAutoUpdateMode,
  shouldApplyImmediately,
  shouldAutoDownload,
} from '../src/main/auto-update-mode';

describe('auto-update-mode', () => {
  it('maps boolean true to atBackground', () => {
    expect(resolveAutoUpdateMode(true)).toBe('atBackground');
  });

  it('maps boolean false to off', () => {
    expect(resolveAutoUpdateMode(false)).toBe('off');
    expect(isAutoUpdateChecksEnabled(false)).toBe(false);
  });

  it('does not auto download in onlyDownload mode', () => {
    expect(shouldAutoDownload('onlyDownload')).toBe(false);
    expect(isAutoUpdateChecksEnabled('onlyDownload')).toBe(true);
  });

  it('applies immediately on cold start for onLaunch', () => {
    expect(
      shouldApplyImmediately('onLaunch', { isColdStart: true, isFreshNativeInstall: false })
    ).toBe(true);
    expect(
      shouldApplyImmediately('onLaunch', { isColdStart: false, isFreshNativeInstall: false })
    ).toBe(false);
  });
});
