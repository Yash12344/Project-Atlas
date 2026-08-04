import { describe, expect, it } from 'vitest';

import { safeRedirectPath } from './redirect';

describe('safeRedirectPath', () => {
  it('accepts a same-origin path', () => {
    expect(safeRedirectPath('/acme/members', '/fallback')).toBe('/acme/members');
  });

  it('falls back when absent', () => {
    expect(safeRedirectPath(null, '/fallback')).toBe('/fallback');
    expect(safeRedirectPath(undefined, '/fallback')).toBe('/fallback');
    expect(safeRedirectPath('', '/fallback')).toBe('/fallback');
  });

  it('rejects off-site redirects', () => {
    for (const hostile of [
      'https://evil.example',
      'http://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'evil.example',
    ]) {
      expect(safeRedirectPath(hostile, '/fallback')).toBe('/fallback');
    }
  });
});
