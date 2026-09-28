import {
  EXPOSE_OVERRIDE_CHOICES,
  UNIFIED_PROFILE_TITLE,
  describeExposeClientUserId,
} from '../scenarios/unifiedProfile';

// The labels and test ids are the Android sample's, verbatim: one QA script drives the
// Unified Profile section on every platform.

describe('Unified Profile override', () => {
  it('uses the Android title', () => {
    expect(UNIFIED_PROFILE_TITLE).toBe('Unified Profile (exposeClientUserId)');
  });

  it('offers backend / on / off in the Android order, labels and test ids', () => {
    expect(EXPOSE_OVERRIDE_CHOICES).toEqual([
      {
        value: null,
        label: 'Use backend value',
        testID: 'expose-override-backend',
      },
      { value: true, label: 'Force active', testID: 'expose-override-on' },
      { value: false, label: 'Force inactive', testID: 'expose-override-off' },
    ]);
  });

  it('describes the effective flag', () => {
    expect(describeExposeClientUserId({ exposeClientUserId: true })).toBe(
      '✓ on'
    );
    expect(describeExposeClientUserId({ exposeClientUserId: false })).toBe(
      '✗ off'
    );
    expect(describeExposeClientUserId(null)).toBe('— not fetched yet');
    expect(describeExposeClientUserId(undefined)).toBe('unreadable here');
  });
});
