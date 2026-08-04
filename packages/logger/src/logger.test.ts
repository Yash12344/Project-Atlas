import { describe, expect, it } from 'vitest';

import { serializeError } from './index';

describe('error serialisation', () => {
  it('captures the shape of an Error', () => {
    const error = new Error('boom');
    const serialized = serializeError(error);

    expect(serialized.name).toBe('Error');
    expect(serialized.message).toBe('boom');
    expect(serialized.stack).toBeDefined();
  });

  it('renders a structured cause rather than [object Object]', () => {
    const error = new Error('outer', { cause: { code: 'E_INNER' } });
    const serialized = serializeError(error);

    expect(serialized.cause).toContain('E_INNER');
    expect(serialized.cause).not.toContain('[object Object]');
  });

  it('summarises an Error cause', () => {
    const error = new Error('outer', { cause: new TypeError('inner') });
    expect(serializeError(error).cause).toBe('TypeError: inner');
  });

  it('survives a thrown non-Error', () => {
    // `catch (e: unknown)` can receive anything a library chose to throw.
    expect(serializeError('a string').message).toContain('a string');
    expect(serializeError({ weird: true }).name).toBe('UnknownError');
    expect(serializeError(null).message).toBe('null');
  });
});
